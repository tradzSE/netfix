import { Activity, Play, CheckCircle2, XCircle, AlertTriangle, Clock, Loader2, Info } from 'lucide-react'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import StatusBadge from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import { useDiagnostics } from '../hooks/useDiagnostics'
import { analyzeDiagnostics, type Diagnosis, type Severity } from '../lib/troubleshooter'
import { formatDuration } from '../lib/utils'
import { cn } from '../lib/utils'

const SEVERITY_STYLES: Record<Severity, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  critical: { icon: XCircle,        color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
  warning:  { icon: AlertTriangle,  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  info:     { icon: Info,           color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  ok:       { icon: CheckCircle2,   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
}

export default function Diagnostics() {
  const { report, running, progress, error, runDiagnostics } = useDiagnostics()

  // Generate diagnoses from the report
  const diagnoses: Diagnosis[] = report
    ? analyzeDiagnostics(
        Object.fromEntries(
          report.results.map(r => [r.id, { status: r.status, data: r.data, error: r.error }])
        )
      )
    : []

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Network Diagnostics</h1>
          <p className="text-sm text-surface-500 mt-0.5">One-click connectivity analysis</p>
        </div>
        <Button
          size="md"
          onClick={runDiagnostics}
          loading={running}
          className="min-w-[160px]"
        >
          {running ? (
            <>Running Tests...</>
          ) : (
            <>
              <Play size={14} />
              Run Diagnostics
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Test Results */}
      {(running || report) && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            {report && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-surface-500">
                  <Clock size={12} className="inline mr-1" />
                  {formatDuration(report.durationMs)}
                </span>
                <StatusBadge status={report.overallStatus} size="md" />
              </div>
            )}
          </CardHeader>
          <div className="space-y-1">
            {running && !report && (
              <div className="space-y-2 py-1">
                {['Default Gateway Ping', 'DNS Resolution Integrity', 'External IP Reachability', 'Secure HTTPS Web Handshake', 'Packet Loss & Jitter', 'Captive Portal Detection'].map((name, i) => (
                  <div key={i} className="flex items-center justify-between py-3 px-4 rounded-lg bg-surface-950/40 border border-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-surface-600" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-white">{name}</p>
                        <Skeleton className="h-2.5 w-48" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                ))}
              </div>
            )}
            {(report?.results ?? []).map((result) => {
              const currentStatus = progress[result.id] ?? result.status
              const isRunning = currentStatus === 'running'

              return (
                <div
                  key={result.id}
                  className={cn(
                    'flex items-center justify-between py-3 px-4 rounded-lg transition-colors',
                    isRunning ? 'bg-blue-500/[0.04]' : 'hover:bg-white/[0.02]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isRunning ? (
                      <Loader2 size={16} className="text-blue-400 animate-spin" />
                    ) : result.status === 'pass' ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : result.status === 'fail' ? (
                      <XCircle size={16} className="text-red-400" />
                    ) : result.status === 'warn' ? (
                      <AlertTriangle size={16} className="text-amber-400" />
                    ) : (
                      <Activity size={16} className="text-surface-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-surface-200">{result.name}</p>
                      <p className="text-xs text-surface-500 mt-0.5">{result.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {result.durationMs > 0 && (
                      <span className="text-[11px] text-surface-600 font-mono">
                        {formatDuration(result.durationMs)}
                      </span>
                    )}
                    <StatusBadge status={result.status} pulse={isRunning} />
                  </div>
                </div>
              )
            })}

            {/* Show running indicators for tests not yet complete */}
            {running && !report && Object.entries(progress).map(([testId, status]) => (
              <div
                key={testId}
                className="flex items-center gap-3 py-3 px-4 rounded-lg bg-blue-500/[0.04]"
              >
                <Loader2 size={16} className="text-blue-400 animate-spin" />
                <span className="text-sm text-surface-300">{testId}</span>
                <span className="ml-auto">
                  <StatusBadge status={status} pulse={status === 'running'} />
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Diagnosis / Troubleshooter Results */}
      {diagnoses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis &amp; Recommendations</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {diagnoses.map((d) => {
              const style = SEVERITY_STYLES[d.severity]
              const Icon = style.icon

              return (
                <div key={d.id} className={cn('rounded-lg border p-4', style.bg)}>
                  <div className="flex items-start gap-3">
                    <Icon size={18} className={cn(style.color, 'mt-0.5 flex-shrink-0')} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white">{d.title}</h4>
                      <p className="text-xs text-surface-300 mt-1.5 leading-relaxed">{d.explanation}</p>
                      <div className="mt-3 pt-3 border-t border-white/[0.05]">
                        <p className="text-xs text-surface-400">
                          <span className="font-medium text-surface-300">Recommendation: </span>
                          {d.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!running && !report && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-xl bg-surface-900 border border-white/[0.06] flex items-center justify-center mb-4 text-surface-400">
            <Activity size={24} />
          </div>
          <h2 className="text-lg font-semibold text-surface-300 mb-1">Ready to Diagnose</h2>
          <p className="text-sm text-surface-500 max-w-md">
            Click "Run Diagnostics" to test gateway connectivity, DNS resolution,
            internet access, HTTPS connectivity, packet loss, and captive portal detection.
          </p>
        </div>
      )}
    </div>
  )
}
