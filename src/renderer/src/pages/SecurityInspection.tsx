import { useState, useEffect, useCallback } from 'react'
import {
  Shield, ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle,
  CheckCircle, Lock, Globe, Server, Check, AlertCircle, Wrench
} from 'lucide-react'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Skeleton, { SkeletonTableRow } from '../components/ui/Skeleton'
import { cn } from '../lib/utils'

export interface FirewallProfile {
  name: string
  enabled: boolean
  inboundAction: string
  outboundAction: string
}

export interface ProxyConfig {
  enabled: boolean
  server: string | null
  autoConfigUrl: string | null
}

export interface ListeningPort {
  localAddress: string
  localPort: number
  pid: number
  processName: string
}

export interface SecurityRisk {
  id: string
  title: string
  severity: 'high' | 'medium' | 'low' | 'info'
  description: string
  recommendation: string
}

export interface SecurityInspectionReport {
  timestamp: string
  firewallProfiles: FirewallProfile[]
  proxy: ProxyConfig
  listeningPorts: ListeningPort[]
  risks: SecurityRisk[]
  overallScore: number
}

export default function SecurityInspection() {
  const [data, setData] = useState<SecurityInspectionReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fixingAction, setFixingAction] = useState<string | null>(null)
  const [fixFeedback, setFixFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const inspect = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.netfix.security.inspect()
      if (res.success && res.data) {
        setData(res.data as SecurityInspectionReport)
      } else {
        setError(res.error || 'Failed to inspect security configuration')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    inspect()
  }, [inspect])

  const handleQuickFix = async (actionId: any, actionName: string) => {
    setFixingAction(actionId)
    setFixFeedback(null)
    try {
      const res = await window.netfix.repair.execute({ actionId })
      if (res.success) {
        const dataAny = res.data as any
        setFixFeedback({
          type: 'success',
          message: `🛡️ ${actionName} applied successfully: ${dataAny?.verificationNotes || 'Verified & guarded.'}`
        })
        // Refresh inspection after short delay
        setTimeout(() => inspect(), 800)
      } else {
        setFixFeedback({
          type: 'error',
          message: res.error || `Elevation declined or failed to apply ${actionName}.`
        })
      }
    } catch (err) {
      setFixFeedback({
        type: 'error',
        message: (err as Error).message
      })
    } finally {
      setFixingAction(null)
    }
  }

  const score = data?.overallScore ?? 100
  const scoreColor = score >= 85 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'
  const scoreBorder = score >= 85 ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : score >= 60 ? 'border-amber-500/20 bg-amber-500/[0.03]' : 'border-red-500/20 bg-red-500/[0.03]'

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Network Security Inspection</h1>
          <p className="text-sm text-surface-500 mt-0.5">Firewall integrity, proxy inspection &amp; open port auditing</p>
        </div>
        <Button variant="secondary" size="sm" onClick={inspect} loading={loading}>
          <RefreshCw size={13} />
          Re-inspect Security
        </Button>
      </div>

      {/* Fix Feedback Banner */}
      {fixFeedback && (
        <div className={cn(
          'p-3.5 rounded-xl border flex items-center justify-between text-xs',
          fixFeedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
            : 'bg-red-500/10 border-red-500/25 text-red-300'
        )}>
          <div className="flex items-center gap-2">
            {fixFeedback.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
            <span>{fixFeedback.message}</span>
          </div>
          <button onClick={() => setFixFeedback(null)} className="text-surface-400 hover:text-white ml-2">✕</button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-28 rounded-xl col-span-1" />
            <Skeleton className="h-28 rounded-xl col-span-1 md:col-span-2" />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-accent" />
                <Skeleton className="h-4 w-48" />
              </div>
            </CardHeader>
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server size={16} className="text-accent" />
                <Skeleton className="h-4 w-56" />
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="py-2.5 pl-1"><Skeleton className="h-3 w-16" /></th>
                    <th className="py-2.5"><Skeleton className="h-3 w-28" /></th>
                    <th className="py-2.5"><Skeleton className="h-3 w-24" /></th>
                    <th className="py-2.5 text-right pr-1"><Skeleton className="h-3 w-12 ml-auto" /></th>
                  </tr>
                </thead>
                <tbody>
                  <SkeletonTableRow cols={4} />
                  <SkeletonTableRow cols={4} />
                  <SkeletonTableRow cols={4} />
                  <SkeletonTableRow cols={4} />
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Security Health Score Banner */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card padding="md" className={cn('col-span-1 border', scoreBorder)}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">Security Health Score</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={cn('text-3xl font-extrabold font-mono', scoreColor)}>{score}</span>
                  <span className="text-sm text-surface-500 font-mono">/ 100</span>
                </div>
              </div>
              <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', scoreColor)}>
                {score >= 85 ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
              </div>
            </div>
          </Card>

          <Card padding="md" className="col-span-1 md:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">Security Summary</span>
            <div className="grid grid-cols-3 gap-4 mt-2 text-xs">
              <div>
                <span className="text-surface-500">Firewall Profiles:</span>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {data.firewallProfiles.filter(p => p.enabled).length}/{data.firewallProfiles.length} Active
                </p>
              </div>
              <div>
                <span className="text-surface-500">System Proxy:</span>
                <p className={cn('text-sm font-semibold mt-0.5', data.proxy.enabled ? 'text-amber-400' : 'text-emerald-400')}>
                  {data.proxy.enabled ? 'Active Proxy' : 'Direct (No Proxy)'}
                </p>
              </div>
              <div>
                <span className="text-surface-500">Listening Ports:</span>
                <p className="text-sm font-semibold text-white mt-0.5 font-mono">
                  {data.listeningPorts.length} Open
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Security Findings & Risk Analysis with 1-Click Quick Fix */}
      {data && data.risks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-accent" />
              <CardTitle>Findings &amp; Recommendations</CardTitle>
            </div>
          </CardHeader>

          <div className="space-y-3">
            {data.risks.map((risk) => {
              const isHigh = risk.severity === 'high'
              const isMed = risk.severity === 'medium'
              const isInfo = risk.severity === 'info'

              return (
                <div
                  key={risk.id}
                  className={cn(
                    'rounded-xl border p-4.5 transition-all',
                    isHigh ? 'border-red-500/20 bg-red-500/[0.03]' :
                    isMed ? 'border-amber-500/20 bg-amber-500/[0.03]' :
                    'border-emerald-500/20 bg-emerald-500/[0.03]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {isHigh ? (
                      <AlertTriangle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                    ) : isMed ? (
                      <AlertTriangle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckCircle size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">{risk.title}</h4>
                        <span
                          className={cn(
                            'text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider',
                            isHigh ? 'bg-red-500/20 text-red-400' :
                            isMed ? 'bg-amber-500/20 text-amber-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          )}
                        >
                          {risk.severity}
                        </span>
                      </div>
                      <p className="text-xs text-surface-300 leading-relaxed">{risk.description}</p>
                      <div className="text-xs text-surface-400">
                        <span className="font-semibold text-surface-200">Recommended Action: </span>
                        {risk.recommendation}
                      </div>

                      {/* 1-Click Quick Fix Actions */}
                      {risk.id.includes('445') && (
                        <div className="pt-2 border-t border-white/[0.04] flex flex-wrap items-center gap-2.5">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleQuickFix('disable-smb-sharing', 'Close Port 445 (SMB)')}
                            loading={fixingAction === 'disable-smb-sharing'}
                          >
                            🛡️ Close Port 445 &amp; Disable File Sharing
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleQuickFix('set-public-profile', 'Set Profile to Public')}
                            loading={fixingAction === 'set-public-profile'}
                          >
                            Shield Network Profile (Public)
                          </Button>
                        </div>
                      )}

                      {risk.id.includes('proxy') && (
                        <div className="pt-2 border-t border-white/[0.04]">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleQuickFix('disable-proxy', 'Disable System Proxy')}
                            loading={fixingAction === 'disable-proxy'}
                          >
                            Disable System Proxy
                          </Button>
                        </div>
                      )}

                      {risk.id.includes('firewall') && (
                        <div className="pt-2 border-t border-white/[0.04]">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleQuickFix('enable-all-firewalls', 'Enable Windows Firewall')}
                            loading={fixingAction === 'enable-all-firewalls'}
                          >
                            Enable All Windows Firewall Profiles
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Windows Firewall & Proxy Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-blue-400" />
                <CardTitle>Windows Firewall Profiles</CardTitle>
              </div>
            </CardHeader>
            <div className="space-y-3">
              {data.firewallProfiles.map((prof) => (
                <div
                  key={prof.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-950/60 border border-white/[0.03]"
                >
                  <div>
                    <span className="text-xs font-semibold text-white">{prof.name} Profile</span>
                    <p className="text-[11px] text-surface-500 mt-0.5">
                      Inbound: {prof.inboundAction} · Outbound: {prof.outboundAction}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      prof.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    )}
                  >
                    {prof.enabled ? 'Protected' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-purple-400" />
                <CardTitle>System Proxy Configuration</CardTitle>
              </div>
            </CardHeader>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-surface-950/60 border border-white/[0.03]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Proxy Status</span>
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      data.proxy.enabled ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                    )}
                  >
                    {data.proxy.enabled ? 'Enabled' : 'Disabled (Direct)'}
                  </span>
                </div>
                {data.proxy.server && (
                  <p className="text-xs font-mono text-surface-300 mt-2 truncate">
                    Server: {data.proxy.server}
                  </p>
                )}
                {data.proxy.autoConfigUrl && (
                  <p className="text-xs font-mono text-surface-300 mt-1 truncate">
                    PAC Script: {data.proxy.autoConfigUrl}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Listening Ports Table */}
      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server size={16} className="text-accent" />
              <CardTitle>Open Listening Ports &amp; Process Mapping ({data.listeningPorts.length} detected)</CardTitle>
            </div>
          </CardHeader>

          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-900 border-b border-white/[0.04]">
                <tr className="text-left text-surface-500 font-semibold">
                  <th className="pb-2.5 pl-1">Port</th>
                  <th className="pb-2.5">Bind Address</th>
                  <th className="pb-2.5">Process Name</th>
                  <th className="pb-2.5 text-right pr-1">PID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {data.listeningPorts.map((lp, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01]">
                    <td className="py-2 pl-1 font-mono font-bold text-accent">{lp.localPort}</td>
                    <td className="py-2 font-mono text-surface-400">{lp.localAddress}</td>
                    <td className="py-2 text-white font-medium">{lp.processName}</td>
                    <td className="py-2 text-right pr-1 font-mono text-surface-400">{lp.pid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
