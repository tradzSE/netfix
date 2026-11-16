export type TestStatus = 'pending' | 'running' | 'pass' | 'fail' | 'warn' | 'error'

export interface TestResult {
  id: string
  name: string
  description: string
  status: TestStatus
  data: unknown
  error: string | null
  durationMs: number
}

export interface DiagnosticReport {
  timestamp: string
  results: TestResult[]
  overallStatus: TestStatus
  durationMs: number
}
