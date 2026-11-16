import { useState, useCallback, useEffect, useRef } from 'react'
import type { DiagnosticReport, TestStatus } from '../types/diagnostics'

interface TestProgress {
  [testId: string]: TestStatus
}

interface UseDiagnosticsReturn {
  report: DiagnosticReport | null
  running: boolean
  progress: TestProgress
  error: string | null
  runDiagnostics: () => Promise<void>
}

export function useDiagnostics(): UseDiagnosticsReturn {
  const [report, setReport] = useState<DiagnosticReport | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<TestProgress>({})
  const [error, setError] = useState<string | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Subscribe to progress events from main process
    cleanupRef.current = window.netfix.diagnostics.onProgress((data) => {
      setProgress(prev => ({ ...prev, [data.testId]: data.status as TestStatus }))
    })

    return () => {
      cleanupRef.current?.()
    }
  }, [])

  const runDiagnostics = useCallback(async () => {
    setRunning(true)
    setError(null)
    setProgress({})
    setReport(null)

    try {
      const response = await window.netfix.diagnostics.runAll()
      if (response.success && response.data) {
        setReport(response.data as DiagnosticReport)
      } else {
        setError(response.error ?? 'Diagnostics failed')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRunning(false)
    }
  }, [])

  return { report, running, progress, error, runDiagnostics }
}
