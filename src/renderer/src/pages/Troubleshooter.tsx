import { useState, useEffect } from 'react'
import { Search, Activity, CheckCircle2, XCircle, AlertTriangle, Info, ArrowRight, RefreshCw, Wrench } from 'lucide-react'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import { useDiagnostics } from '../hooks/useDiagnostics'
import { analyzeDiagnostics, type Diagnosis, type Severity } from '../lib/troubleshooter'
import { cn } from '../lib/utils'
import type { PageId } from '../App'

interface TroubleshooterProps {
  onNavigate: (page: PageId) => void
}

const SEVERITY_STYLES: Record<Severity, { icon: typeof CheckCircle2; color: string; bg: string; badge: string }> = {
  critical: { icon: XCircle,        color: 'text-red-400',     bg: 'bg-red-500/[0.03] border-red-500/20',     badge: 'bg-red-500/20 text-red-400' },
  warning:  { icon: AlertTriangle,  color: 'text-amber-400',   bg: 'bg-amber-500/[0.03] border-amber-500/20', badge: 'bg-amber-500/20 text-amber-400' },
  info:     { icon: Info,           color: 'text-blue-400',    bg: 'bg-blue-500/[0.03] border-blue-500/20',   badge: 'bg-blue-500/20 text-blue-400' },
  ok:       { icon: CheckCircle2,   color: 'text-emerald-400', bg: 'bg-emerald-500/[0.03] border-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-400' },
}

export default function Troubleshooter({ onNavigate }: TroubleshooterProps) {
  const { report, running, runDiagnostics } = useDiagnostics()

  useEffect(() => {
    // If no report yet, run diagnostics automatically
    if (!report && !running) {
      runDiagnostics()
    }
  }, [])

  const diagnoses: Diagnosis[] = report
    ? analyzeDiagnostics(
        Object.fromEntries(
          report.results.map(r => [r.id, { status: r.status, data: r.data, error: r.error }])
        )
      )
    : []

  const criticalCount = diagnoses.filter(d => d.severity === 'critical').length
  const warningCount = diagnoses.filter(d => d.severity === 'warning').length

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Network Troubleshooter</h1>
          <p className="text-sm text-surface-500 mt-0.5">Automated diagnosis and recommended repairs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={runDiagnostics} loading={running}>
            <RefreshCw size={13} />
            Re-analyze Network
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onNavigate('repair')}>
            <Wrench size={13} />
            Open Repair Center
          </Button>
        </div>
      </div>

      {/* Summary Status Banner */}
      {report && (
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {criticalCount > 0 ? (
                <XCircle size={20} className="text-red-400 flex-shrink-0" />
              ) : warningCount > 0 ? (
                <AlertTriangle size={20} className="text-amber-400 flex-shrink-0" />
              ) : (
                <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
              )}
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {criticalCount > 0 ? `${criticalCount} Critical Issue(s) Identified` :
                   warningCount > 0 ? `${warningCount} Potential Warning(s) Detected` :
                   'Network Stack & Connectivity Healthy'}
                </h3>
                <p className="text-xs text-surface-400 mt-0.5">
                  Evaluated across Gateway, DNS, IP routing, HTTPS, packet loss, and captive portal checks.
                </p>
              </div>
            </div>
            <StatusBadge status={report.overallStatus} size="md" />
          </div>
        </Card>
      )}

      {/* Diagnoses List */}
      <div className="space-y-4">
        {diagnoses.map((d) => {
          const style = SEVERITY_STYLES[d.severity]
          const Icon = style.icon

          return (
            <Card key={d.id} className={cn('border transition-all', style.bg)} padding="md">
              <div className="flex items-start gap-3.5">
                <Icon size={20} className={cn(style.color, 'mt-0.5 flex-shrink-0')} />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{d.title}</h4>
                    <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider', style.badge)}>
                      {d.severity}
                    </span>
                  </div>

                  <p className="text-xs text-surface-300 leading-relaxed">
                    {d.explanation}
                  </p>

                  <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                    <div className="text-xs text-surface-400">
                      <span className="font-semibold text-surface-200">Recommended Action: </span>
                      {d.recommendation}
                    </div>

                    {d.severity !== 'ok' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onNavigate('repair')}
                        className="ml-4 flex-shrink-0"
                      >
                        Launch Repair <ArrowRight size={12} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}

        {diagnoses.length === 0 && !running && (
          <div className="text-center py-12 text-surface-500 text-xs">
            Run a diagnostic scan to view intelligent troubleshooting findings.
          </div>
        )}
      </div>
    </div>
  )
}
