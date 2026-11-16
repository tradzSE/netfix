import { executePowerShellJson } from './powershell'
import { saveRun } from './database'

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

type TestId = 'gateway' | 'dns' | 'internet' | 'https' | 'packet-loss' | 'captive-portal'

interface TestDefinition {
  id: TestId
  name: string
  description: string
  evaluate: (data: any) => TestStatus
}

const TEST_DEFINITIONS: TestDefinition[] = [
  {
    id: 'gateway',
    name: 'Gateway Connectivity',
    description: 'Ping the default gateway to verify local network connectivity',
    evaluate: (data) => {
      if (!data || !data.Success) return 'fail'
      if (!data.Target) return 'fail'
      const received = data.Received ?? 0
      const sent = data.Sent ?? 4
      if (received === sent) return 'pass'
      if (received > 0) return 'warn'
      return 'fail'
    }
  },
  {
    id: 'dns',
    name: 'DNS Resolution',
    description: 'Test DNS resolution for multiple domains',
    evaluate: (data) => {
      if (!Array.isArray(data)) return 'error'
      const successes = data.filter((d: any) => d.Success).length
      if (successes === data.length) return 'pass'
      if (successes > 0) return 'warn'
      return 'fail'
    }
  },
  {
    id: 'internet',
    name: 'Internet Connectivity',
    description: 'Ping external IP addresses to verify internet access',
    evaluate: (data) => {
      if (!Array.isArray(data)) return 'error'
      const successes = data.filter((d: any) => d.Success).length
      if (successes === data.length) return 'pass'
      if (successes > 0) return 'warn'
      return 'fail'
    }
  },
  {
    id: 'https',
    name: 'HTTPS Connectivity',
    description: 'Test HTTPS connections to major websites',
    evaluate: (data) => {
      if (!Array.isArray(data)) return 'error'
      const successes = data.filter((d: any) => d.Success).length
      if (successes === data.length) return 'pass'
      if (successes > 0) return 'warn'
      return 'fail'
    }
  },
  {
    id: 'packet-loss',
    name: 'Packet Loss & Jitter',
    description: 'Measure packet loss and latency jitter over 20 pings',
    evaluate: (data) => {
      if (!data) return 'error'
      const loss = data.LossPercent ?? 100
      const jitter = data.Jitter ?? 0
      if (loss === 0 && jitter < 10) return 'pass'
      if (loss < 5 && jitter < 30) return 'warn'
      return 'fail'
    }
  },
  {
    id: 'captive-portal',
    name: 'Captive Portal Detection',
    description: 'Check if the network requires sign-in through a captive portal',
    evaluate: (data) => {
      if (!data) return 'error'
      if (data.Error) return 'warn'
      return data.IsCaptive ? 'fail' : 'pass'
    }
  }
]

const COMMAND_MAP: Record<TestId, string> = {
  'gateway': 'ping-gateway',
  'dns': 'test-dns',
  'internet': 'test-internet',
  'https': 'test-https',
  'packet-loss': 'test-packet-loss',
  'captive-portal': 'detect-captive-portal'
}

async function runSingleTest(def: TestDefinition): Promise<TestResult> {
  const start = Date.now()
  const commandKey = COMMAND_MAP[def.id] as any

  try {
    const result = await executePowerShellJson(commandKey, 60_000)
    const durationMs = Date.now() - start

    if (!result.success) {
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        status: 'error',
        data: null,
        error: result.error,
        durationMs
      }
    }

    const status = def.evaluate(result.data)
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      status,
      data: result.data,
      error: null,
      durationMs
    }
  } catch (err) {
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      status: 'error',
      data: null,
      error: (err as Error).message,
      durationMs: Date.now() - start
    }
  }
}

function computeOverallStatus(results: TestResult[]): TestStatus {
  if (results.some(r => r.status === 'error')) return 'error'
  if (results.some(r => r.status === 'fail')) return 'fail'
  if (results.some(r => r.status === 'warn')) return 'warn'
  return 'pass'
}

export async function runAllDiagnostics(
  onProgress?: (testId: string, status: TestStatus) => void
): Promise<DiagnosticReport> {
  const start = Date.now()
  const results: TestResult[] = []

  // Run tests sequentially so progress reporting is meaningful
  for (const def of TEST_DEFINITIONS) {
    onProgress?.(def.id, 'running')
    const result = await runSingleTest(def)
    results.push(result)
    onProgress?.(def.id, result.status)
  }

  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    results,
    overallStatus: computeOverallStatus(results),
    durationMs: Date.now() - start
  }

  // Save to database
  try {
    saveRun(report)
  } catch {
    // Don't fail the diagnostic if DB save fails
  }

  return report
}

export async function runSingleDiagnostic(testId: string): Promise<TestResult> {
  const def = TEST_DEFINITIONS.find(d => d.id === testId)
  if (!def) {
    return {
      id: testId,
      name: testId,
      description: '',
      status: 'error',
      data: null,
      error: `Unknown test: ${testId}`,
      durationMs: 0
    }
  }
  return runSingleTest(def)
}
