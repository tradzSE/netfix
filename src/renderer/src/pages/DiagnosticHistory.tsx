import { useState, useEffect } from 'react'
import { History, Activity, Wrench, Trash2, CheckCircle2, XCircle, AlertTriangle, Clock, Download, ChevronRight } from 'lucide-react'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import Skeleton from '../components/ui/Skeleton'
import { formatDuration, formatRelativeTime, cn } from '../lib/utils'

export interface DiagnosticRunRecord {
  id: number
  timestamp: string
  results: any[]
  overallStatus: string
  durationMs: number
}

export interface RepairAuditRecord {
  id: number
  timestamp: string
  actionId: string
  actionName: string
  parameters: string
  success: boolean
  output: string
  verified: boolean
  verificationNotes: string
}

export default function DiagnosticHistory() {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'repairs'>('diagnostics')
  const [diagnosticRuns, setDiagnosticRuns] = useState<DiagnosticRunRecord[]>([])
  const [repairRecords, setRepairRecords] = useState<RepairAuditRecord[]>([])
  const [selectedRun, setSelectedRun] = useState<DiagnosticRunRecord | null>(null)
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [diagRes, repairRes] = await Promise.all([
        window.netfix.diagnostics.getHistory(50),
        window.netfix.repair.getHistory()
      ])

      if (diagRes.success && diagRes.data) {
        setDiagnosticRuns(diagRes.data as DiagnosticRunRecord[])
      }
      if (repairRes.success && repairRes.data) {
        setRepairRecords(repairRes.data as RepairAuditRecord[])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleClearHistory = async () => {
    if (activeTab === 'diagnostics') {
      await window.netfix.diagnostics.clearHistory()
      setDiagnosticRuns([])
      setSelectedRun(null)
    } else {
      await window.netfix.repair.clearHistory()
      setRepairRecords([])
    }
  }

  const exportJson = () => {
    const dataToExport = activeTab === 'diagnostics' ? diagnosticRuns : repairRecords
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `netfix-${activeTab}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Diagnostic &amp; Repair History</h1>
          <p className="text-sm text-surface-500 mt-0.5">Persistent local audit records stored in SQLite</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportJson} disabled={activeTab === 'diagnostics' ? diagnosticRuns.length === 0 : repairRecords.length === 0}>
            <Download size={13} />
            Export JSON
          </Button>
          <Button variant="danger" size="sm" onClick={handleClearHistory} disabled={activeTab === 'diagnostics' ? diagnosticRuns.length === 0 : repairRecords.length === 0}>
            <Trash2 size={13} />
            Clear Log
          </Button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center border-b border-white/[0.06]">
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px',
            activeTab === 'diagnostics'
              ? 'border-accent text-accent'
              : 'border-transparent text-surface-400 hover:text-white'
          )}
        >
          <Activity size={14} />
          Diagnostic Runs ({diagnosticRuns.length})
        </button>
        <button
          onClick={() => setActiveTab('repairs')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px',
            activeTab === 'repairs'
              ? 'border-accent text-accent'
              : 'border-transparent text-surface-400 hover:text-white'
          )}
        >
          <Wrench size={14} />
          Repair Audit Trail ({repairRecords.length})
        </button>
      </div>

      {/* Diagnostics View */}
      {activeTab === 'diagnostics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* List of Runs */}
          <div className="col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
            {loading && diagnosticRuns.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3.5 rounded-lg border border-white/[0.04] bg-surface-900/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-2.5 w-28" />
                  </div>
                ))}
              </div>
            ) : diagnosticRuns.length === 0 ? (
              <div className="p-8 text-center text-xs text-surface-500 italic bg-surface-950/40 rounded-xl border border-white/[0.03]">
                No diagnostic reports logged yet.
              </div>
            ) : (
              diagnosticRuns.map((run) => {
                const isSelected = selectedRun?.id === run.id
                const passCount = run.results?.filter((r: any) => r.status === 'pass').length || 0
                const totalCount = run.results?.length || 0

                return (
                  <div
                    key={run.id}
                    onClick={() => setSelectedRun(run)}
                    className={cn(
                      'p-3.5 rounded-lg border cursor-pointer transition-all',
                      isSelected
                        ? 'border-accent/40 bg-accent/[0.04]'
                        : 'border-white/[0.04] bg-surface-900/60 hover:border-white/[0.08]'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono text-surface-300">
                        {new Date(run.timestamp).toLocaleTimeString()}
                      </span>
                      <StatusBadge status={run.overallStatus} size="sm" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-surface-500">
                      <span>{passCount}/{totalCount} passed</span>
                      <span className="font-mono">{formatDuration(run.durationMs)}</span>
                    </div>
                    <span className="text-[10px] text-surface-600 block mt-1">
                      {formatRelativeTime(run.timestamp)}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {/* Details Pane */}
          <div className="col-span-2">
            {selectedRun ? (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Run #{selectedRun.id} Details</CardTitle>
                    <span className="text-xs text-surface-500 font-mono">
                      {new Date(selectedRun.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-surface-400 font-mono">
                      <Clock size={12} className="inline mr-1" />
                      {formatDuration(selectedRun.durationMs)}
                    </span>
                    <StatusBadge status={selectedRun.overallStatus} size="md" />
                  </div>
                </CardHeader>

                <div className="space-y-2">
                  {selectedRun.results?.map((res: any) => (
                    <div
                      key={res.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-950/60 border border-white/[0.03]"
                    >
                      <div className="flex items-center gap-2.5">
                        {res.status === 'pass' ? (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : res.status === 'warn' ? (
                          <AlertTriangle size={16} className="text-amber-400" />
                        ) : (
                          <XCircle size={16} className="text-red-400" />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-white">{res.name}</p>
                          <p className="text-[11px] text-surface-500">{res.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        {res.durationMs > 0 && (
                          <span className="text-[10px] font-mono text-surface-500">
                            {formatDuration(res.durationMs)}
                          </span>
                        )}
                        <StatusBadge status={res.status} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="flex flex-col items-center justify-center h-64 text-center">
                <Activity size={24} className="text-surface-600 mb-2" />
                <p className="text-xs text-surface-500">
                  Select a diagnostic run on the left to inspect detailed test outcomes.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Repairs View */}
      {activeTab === 'repairs' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-accent" />
              <CardTitle>Network Repair Audit Trail</CardTitle>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left py-2.5 px-3 text-surface-500 font-medium">Timestamp</th>
                  <th className="text-left py-2.5 px-3 text-surface-500 font-medium">Action</th>
                  <th className="text-left py-2.5 px-3 text-surface-500 font-medium">Result</th>
                  <th className="text-left py-2.5 px-3 text-surface-500 font-medium">Verified Status</th>
                  <th className="text-left py-2.5 px-3 text-surface-500 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {repairRecords.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-mono text-surface-400 text-[11px]">
                      {new Date(r.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">{r.actionName}</td>
                    <td className="py-2.5 px-3">
                      <span className={cn('font-semibold', r.success ? 'text-emerald-400' : 'text-red-400')}>
                        {r.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          r.verified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        )}
                      >
                        {r.verified ? 'Verified Online' : 'Unverified'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-surface-300 max-w-xs truncate">{r.verificationNotes}</td>
                  </tr>
                ))}
                {repairRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-surface-500">
                      No repair actions logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
