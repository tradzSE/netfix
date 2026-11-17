import { useState, useEffect } from 'react'
import { Wrench, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Zap, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import ConfirmModal from '../components/ui/ConfirmModal'
import { cn } from '../lib/utils'

export interface RepairOperationDefinition {
  id: string
  name: string
  description: string
  isElevated: boolean
  isDisruptive: boolean
  requiresAdapter: boolean
  warningText?: string
}

export interface RepairResult {
  actionId: string
  actionName: string
  success: boolean
  output: string
  verified: boolean
  verificationNotes: string
  error?: string
}

export default function RepairCenter() {
  const [operations, setOperations] = useState<RepairOperationDefinition[]>([])
  const [adapters, setAdapters] = useState<string[]>([])
  const [selectedAdapter, setSelectedAdapter] = useState('')
  const [dnsPreset, setDnsPreset] = useState<'cloudflare' | 'google' | 'quad9'>('cloudflare')

  // Modal & execution state
  const [activeModalOp, setActiveModalOp] = useState<RepairOperationDefinition | null>(null)
  const [executing, setExecuting] = useState(false)
  const [lastResult, setLastResult] = useState<RepairResult | null>(null)
  const [captiveLoading, setCaptiveLoading] = useState(false)
  const [captiveFeedback, setCaptiveFeedback] = useState<string | null>(null)

  const handleForceCaptive = async () => {
    setCaptiveLoading(true)
    setCaptiveFeedback(null)
    try {
      const res = await window.netfix.tools.forceCaptivePortal()
      if (res.success) {
        setCaptiveFeedback('Captive probe dispatched to browser.')
      } else {
        setCaptiveFeedback('Probe sent. Check your default browser for login page.')
      }
    } catch (err) {
      setCaptiveFeedback(`Error: ${(err as Error).message}`)
    } finally {
      setCaptiveLoading(false)
    }
  }

  useEffect(() => {
    // Fetch available repair operations
    window.netfix.repair.getOperations().then((res) => {
      if (res.success && res.data) {
        setOperations(res.data as RepairOperationDefinition[])
      }
    })

    // Fetch active adapters for selection
    window.netfix.network.getAdapters().then((res) => {
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : [res.data]
        const names = list.map((a: any) => a.Name).filter(Boolean)
        setAdapters(names)
        if (names.length > 0) setSelectedAdapter(names[0])
      }
    })
  }, [])

  const handleOpenConfirm = (op: RepairOperationDefinition) => {
    setActiveModalOp(op)
  }

  const handleExecute = async () => {
    if (!activeModalOp) return
    setExecuting(true)
    setLastResult(null)

    try {
      const res = await window.netfix.repair.execute({
        actionId: activeModalOp.id,
        adapterName: selectedAdapter,
        dnsPreset
      })

      if (res.success && res.data) {
        setLastResult(res.data as RepairResult)
      } else {
        setLastResult({
          actionId: activeModalOp.id,
          actionName: activeModalOp.name,
          success: false,
          output: '',
          verified: false,
          verificationNotes: 'Operation failed',
          error: res.error || 'Execution failed'
        })
      }
    } finally {
      setExecuting(false)
      setActiveModalOp(null)
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Network Repair Center</h1>
          <p className="text-sm text-surface-500 mt-0.5">Controlled, allowlisted network restoration operations with automatic verification</p>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="rounded-lg bg-surface-900/60 border border-white/[0.04] p-4 text-xs text-surface-400 flex items-start gap-3">
        <ShieldCheck size={18} className="text-surface-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold text-surface-200">Safe &amp; Verified Repair Architecture</p>
          <p className="leading-relaxed">
            All operations are strictly allowlisted and never accept arbitrary shell input.
            Disruptive and privileged operations require explicit user confirmation and trigger Windows Administrator UAC elevation.
            Every action undergoes automatic post-repair verification to verify connectivity was actually restored.
          </p>
        </div>
      </div>

      {/* School & Public Wi-Fi Captive Helper */}
      <div className="rounded-lg bg-surface-900/60 border border-white/[0.06] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-surface-800 border border-white/[0.06] flex items-center justify-center text-surface-300">
            <ExternalLink size={16} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Campus &amp; School Wi-Fi Login Helper</h4>
            <p className="text-xs text-surface-400 mt-0.5">
              Connected with no internet at school? Force the browser login splash page to pop open.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {captiveFeedback && (
            <span className="text-xs text-surface-300 font-mono mr-2">{captiveFeedback}</span>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleForceCaptive}
            loading={captiveLoading}
          >
            <ExternalLink size={13} />
            Open School Login Page
          </Button>
        </div>
      </div>

      {/* Last Result Banner */}
      {lastResult && (
        <Card
          className={cn(
            'border transition-all animate-fade-in',
            lastResult.success && lastResult.verified
              ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
              : lastResult.success && !lastResult.verified
              ? 'border-amber-500/30 bg-amber-500/[0.04]'
              : 'border-red-500/30 bg-red-500/[0.04]'
          )}
          padding="md"
        >
          <div className="flex items-start gap-3">
            {lastResult.success && lastResult.verified ? (
              <CheckCircle2 size={20} className="text-emerald-400 mt-0.5 flex-shrink-0" />
            ) : lastResult.success && !lastResult.verified ? (
              <AlertTriangle size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">
                  {lastResult.actionName}: {lastResult.success ? 'Executed' : 'Failed'}
                </h4>
                <span
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider',
                    lastResult.verified
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  )}
                >
                  {lastResult.verified ? 'Verified Online' : 'Verification Incomplete'}
                </span>
              </div>
              <p className="text-xs text-surface-300">{lastResult.output || lastResult.error}</p>
              <div className="pt-2 border-t border-white/[0.04] text-[11px] text-surface-400">
                <span className="font-semibold text-surface-300">Verification Result: </span>
                {lastResult.verificationNotes}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Standard User (Unprivileged) Repairs */}
      <Card>
        <CardHeader>
          <CardTitle>Standard Operations (No Elevation Required)</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-4">
          {operations.filter(o => !o.isElevated).map((op) => (
            <div
              key={op.id}
              className="rounded-lg border border-white/[0.04] bg-surface-950/50 p-4 flex flex-col justify-between"
            >
              <div>
                <h4 className="text-sm font-semibold text-white">{op.name}</h4>
                <p className="text-xs text-surface-400 mt-1.5 leading-relaxed">{op.description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.03] flex items-center justify-between">
                <span className="text-[10px] text-surface-500">Instant Execution</span>
                <Button size="sm" variant="secondary" onClick={() => handleOpenConfirm(op)}>
                  Run Repair
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Privileged & System Repairs (Requires UAC) */}
      <Card>
        <CardHeader>
          <CardTitle>Privileged Operations (Requires Windows UAC)</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-4">
          {operations.filter(o => o.isElevated).map((op) => (
            <div
              key={op.id}
              className="rounded-lg border border-white/[0.04] bg-surface-950/50 p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">{op.name}</h4>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 uppercase tracking-wider">
                    UAC Required
                  </span>
                </div>
                <p className="text-xs text-surface-400 mt-1.5 leading-relaxed">{op.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.03] flex items-center justify-between">
                <span className="text-[10px] text-surface-500">
                  {op.isDisruptive ? 'Cycles connection' : 'Stack update'}
                </span>
                <Button
                  size="sm"
                  variant={op.isDisruptive ? 'danger' : 'secondary'}
                  onClick={() => handleOpenConfirm(op)}
                >
                  Configure &amp; Run
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Confirmation Modal */}
      {activeModalOp && (
        <ConfirmModal
          isOpen={!!activeModalOp}
          title={activeModalOp.name}
          description={activeModalOp.description}
          warningText={activeModalOp.warningText}
          isElevated={activeModalOp.isElevated}
          confirmLabel={executing ? 'Executing...' : 'Proceed with Repair'}
          confirmVariant={activeModalOp.isDisruptive ? 'danger' : 'primary'}
          loading={executing}
          onConfirm={handleExecute}
          onCancel={() => setActiveModalOp(null)}
        >
          {activeModalOp.requiresAdapter && (
            <div className="space-y-1.5 mt-2">
              <label className="text-[11px] font-semibold text-surface-300">Select Network Adapter:</label>
              <select
                value={selectedAdapter}
                onChange={(e) => setSelectedAdapter(e.target.value)}
                className="w-full bg-surface-950 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent/40"
              >
                {adapters.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          )}

          {activeModalOp.id === 'set-dns' && (
            <div className="space-y-1.5 mt-3">
              <label className="text-[11px] font-semibold text-surface-300">Select Approved DNS Provider:</label>
              <select
                value={dnsPreset}
                onChange={(e) => setDnsPreset(e.target.value as any)}
                className="w-full bg-surface-950 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent/40"
              >
                <option value="cloudflare">Cloudflare (1.1.1.1 / 1.0.0.1)</option>
                <option value="google">Google Public DNS (8.8.8.8 / 8.8.4.4)</option>
                <option value="quad9">Quad9 Secure (9.9.9.9 / 149.112.112.112)</option>
              </select>
            </div>
          )}
        </ConfirmModal>
      )}
    </div>
  )
}
