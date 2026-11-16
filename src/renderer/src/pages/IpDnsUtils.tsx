import { useState, useEffect } from 'react'
import { Globe, Search, Server, Zap, HardDrive, RefreshCw, Copy, Check, Shield, AlertCircle } from 'lucide-react'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Skeleton, { SkeletonTableRow } from '../components/ui/Skeleton'
import { cn } from '../lib/utils'

export interface DnsBenchmarkProvider {
  id: string
  name: string
  server: string
  responseTimeMs: number
  success: boolean
  records: string[]
  error?: string
}

export interface DnsLookupResult {
  domain: string
  recordType: string
  providers: DnsBenchmarkProvider[]
  fastestProvider: string | null
}

export interface PublicIpInfo {
  ip: string
  hostname: string | null
  status: string
  error?: string
}

export interface LocalDevice {
  ip: string
  mac: string
  hostname: string | null
  interfaceAlias: string
  status: string
}

export default function IpDnsUtils() {
  // Active Adapter State
  const [activeAdapter, setActiveAdapter] = useState<string>('')

  // DNS Lookup state
  const [domain, setDomain] = useState('cloudflare.com')
  const [recordType, setRecordType] = useState('A')
  const [dnsResult, setDnsResult] = useState<DnsLookupResult | null>(null)
  const [dnsLoading, setDnsLoading] = useState(false)
  const [dnsError, setDnsError] = useState<string | null>(null)
  const [applyingDns, setApplyingDns] = useState<string | null>(null)
  const [applyFeedback, setApplyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Public IP state
  const [publicIpInfo, setPublicIpInfo] = useState<PublicIpInfo | null>(null)
  const [ipLoading, setIpLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // LAN Scanner state
  const [devices, setDevices] = useState<LocalDevice[]>([])
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  useEffect(() => {
    fetchPublicIp()
    scanLan()
    handleDnsLookup()

    // Detect active adapter
    window.netfix.network.getAdapters().then((res) => {
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : [res.data]
        const active = list.find((a: any) => a.Status === 'Up')
        if (active) setActiveAdapter(active.Name)
      }
    }).catch(() => {})
  }, [])

  const handleDnsLookup = async () => {
    if (!domain.trim()) return
    setDnsLoading(true)
    setDnsError(null)
    try {
      const res = await window.netfix.dnsTools.lookup(domain, recordType)
      if (res.success && res.data) {
        setDnsResult(res.data as DnsLookupResult)
      } else {
        setDnsError(res.error || 'DNS query failed')
      }
    } catch (err) {
      setDnsError((err as Error).message)
    } finally {
      setDnsLoading(false)
    }
  }

  const handleApplyDns = async (presetId: string, providerName: string) => {
    setApplyingDns(presetId)
    setApplyFeedback(null)
    try {
      const res = await window.netfix.repair.execute({
        actionId: 'set-dns',
        adapterName: activeAdapter,
        dnsPreset: presetId as any
      })
      if (res.success) {
        setApplyFeedback({
          type: 'success',
          message: `⚡ Successfully configured ${providerName} as system DNS for "${activeAdapter || 'active adapter'}". Verified & working.`
        })
      } else {
        setApplyFeedback({
          type: 'error',
          message: res.error || 'Elevation declined or failed to apply DNS.'
        })
      }
    } catch (err) {
      setApplyFeedback({
        type: 'error',
        message: (err as Error).message
      })
    } finally {
      setApplyingDns(null)
    }
  }

  const fetchPublicIp = async () => {
    setIpLoading(true)
    try {
      const res = await window.netfix.dnsTools.getPublicIp()
      if (res.success && res.data) {
        setPublicIpInfo(res.data as PublicIpInfo)
      }
    } finally {
      setIpLoading(false)
    }
  }

  const scanLan = async () => {
    setScanLoading(true)
    setScanError(null)
    try {
      const res = await window.netfix.dnsTools.scanNeighbors()
      if (res.success && res.data) {
        setDevices(res.data as LocalDevice[])
      } else {
        setScanError(res.error || 'Failed to scan local devices')
      }
    } catch (err) {
      setScanError((err as Error).message)
    } finally {
      setScanLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const fastestTime = dnsResult?.providers.find(p => p.name === dnsResult.fastestProvider)?.responseTimeMs || 0

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">IP &amp; DNS Utilities</h1>
        <p className="text-sm text-surface-500 mt-0.5">Multi-resolver DNS benchmarking, public endpoint inspection &amp; LAN discovery</p>
      </div>

      {/* Feedback Banner */}
      {applyFeedback && (
        <div className={cn(
          'p-3.5 rounded-xl border flex items-center justify-between text-xs',
          applyFeedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
            : 'bg-red-500/10 border-red-500/25 text-red-300'
        )}>
          <div className="flex items-center gap-2">
            {applyFeedback.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
            <span>{applyFeedback.message}</span>
          </div>
          <button onClick={() => setApplyFeedback(null)} className="text-surface-400 hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* Public IP & Geo / PTR Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-accent" />
            <CardTitle>Public IP &amp; Internet Endpoint</CardTitle>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchPublicIp} loading={ipLoading}>
            <RefreshCw size={13} />
            Refresh Endpoint
          </Button>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between rounded-lg bg-surface-950/60 border border-white/[0.04] p-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">Public IPv4 Address</span>
              {ipLoading && !publicIpInfo ? (
                <Skeleton className="h-6 w-36 mt-1" />
              ) : (
                <p className="text-xl font-bold font-mono text-white mt-1">
                  {publicIpInfo?.ip || 'Unavailable'}
                </p>
              )}
            </div>
            {publicIpInfo?.ip && publicIpInfo.ip !== 'Unavailable' && (
              <button
                onClick={() => copyToClipboard(publicIpInfo.ip)}
                className="h-8 w-8 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white flex items-center justify-center transition-colors"
                title="Copy IP"
              >
                {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
              </button>
            )}
          </div>

          <div className="rounded-lg bg-surface-950/60 border border-white/[0.04] p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">Reverse DNS Hostname</span>
            {ipLoading && !publicIpInfo ? (
              <Skeleton className="h-4 w-48 mt-2" />
            ) : (
              <p className="text-sm font-mono text-surface-200 mt-1 truncate">
                {publicIpInfo?.hostname || 'No reverse PTR record found'}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* DNS Lookup & Multi-Resolver Benchmark */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server size={16} className="text-blue-400" />
            <CardTitle>DNS Resolver Benchmark &amp; 1-Click Optimizer</CardTitle>
          </div>
          {dnsResult?.fastestProvider && (
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-semibold flex items-center gap-1">
                <Zap size={12} />
                Fastest: {dnsResult.fastestProvider} ({fastestTime}ms)
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  const fastest = dnsResult.providers.find(p => p.name === dnsResult.fastestProvider && p.success)
                  if (fastest) handleApplyDns(fastest.id, fastest.name)
                }}
                loading={applyingDns !== null}
              >
                ⚡ Apply Fastest DNS
              </Button>
            </div>
          )}
        </CardHeader>

        {/* Input Bar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 flex items-center gap-2 bg-surface-950 border border-white/[0.08] rounded-lg px-3 py-1.5 focus-within:border-accent/40">
            <Search size={14} className="text-surface-500" />
            <input
              type="text"
              placeholder="e.g. google.com, cloudflare.com, github.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDnsLookup()}
              className="bg-transparent text-sm text-white placeholder-surface-600 focus:outline-none w-full"
            />
          </div>

          <select
            value={recordType}
            onChange={(e) => setRecordType(e.target.value)}
            className="bg-surface-950 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-accent/40"
          >
            <option value="A">A (IPv4)</option>
            <option value="AAAA">AAAA (IPv6)</option>
            <option value="MX">MX (Mail)</option>
            <option value="TXT">TXT (Text)</option>
            <option value="NS">NS (Nameserver)</option>
            <option value="CNAME">CNAME (Alias)</option>
          </select>

          <Button size="md" onClick={handleDnsLookup} loading={dnsLoading}>
            Query &amp; Benchmark
          </Button>
        </div>

        {dnsError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 mb-4">
            {dnsError}
          </div>
        )}

        {/* Loading Skeletons */}
        {dnsLoading && !dnsResult && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/[0.04] bg-surface-950/40 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-7 w-2/3 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Benchmark Results */}
        {dnsResult && (
          <div className="space-y-3">
            {dnsResult.providers.map((p) => {
              const isFastest = p.name === dnsResult.fastestProvider && p.success
              const maxResponseTime = 250
              const barWidth = Math.min(100, Math.max(5, (p.responseTimeMs / maxResponseTime) * 100))

              return (
                <div
                  key={p.id}
                  className={cn(
                    'rounded-xl border p-4 transition-all',
                    isFastest
                      ? 'border-accent/40 bg-accent/[0.03] shadow-sm shadow-accent/5'
                      : 'border-white/[0.04] bg-surface-950/40'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-white">{p.name}</span>
                      <span className="text-xs font-mono text-surface-400">({p.server})</span>
                      {isFastest && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-accent/20 text-accent uppercase tracking-wider">
                          FASTEST
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'text-xs font-mono font-bold',
                          p.success ? 'text-surface-200' : 'text-red-400'
                        )}
                      >
                        {p.success ? `${p.responseTimeMs} ms` : 'Failed'}
                      </span>
                      {p.success && (
                        <button
                          onClick={() => handleApplyDns(p.id, p.name)}
                          disabled={applyingDns !== null}
                          className={cn(
                            'text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1',
                            isFastest
                              ? 'bg-accent/20 hover:bg-accent/30 text-accent border-accent/40 shadow-sm'
                              : 'bg-surface-800 hover:bg-surface-700 text-surface-300 border-white/[0.08]'
                          )}
                        >
                          <Zap size={11} />
                          {applyingDns === p.id ? 'Applying...' : 'Apply DNS'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Benchmark Response Bar */}
                  {p.success && (
                    <div className="h-1.5 w-full bg-surface-800 rounded-full overflow-hidden mb-2.5">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isFastest ? 'bg-accent' : p.responseTimeMs < 50 ? 'bg-emerald-400' : 'bg-blue-400'
                        )}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  )}

                  {/* Resolved Records */}
                  <div className="text-xs font-mono text-surface-400 bg-surface-950/80 rounded-lg px-3 py-2 border border-white/[0.03]">
                    {p.success && p.records.length > 0 ? (
                      <div className="space-y-0.5">
                        {p.records.map((r, i) => (
                          <div key={i} className="truncate text-surface-300">
                            {r}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-surface-600 italic">
                        {p.error || 'No records returned'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Local Subnet / LAN Discovery */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDrive size={16} className="text-purple-400" />
            <CardTitle>Local Network Device Discovery ({devices.length} devices)</CardTitle>
          </div>
          <Button variant="secondary" size="sm" onClick={scanLan} loading={scanLoading}>
            <RefreshCw size={13} />
            Rescan Subnet
          </Button>
        </CardHeader>

        {scanError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 mb-4">
            {scanError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.04] text-left text-surface-500 font-semibold">
                <th className="pb-3 pl-1">IP Address</th>
                <th className="pb-3">MAC Address</th>
                <th className="pb-3">Resolved Hostname</th>
                <th className="pb-3">Interface</th>
                <th className="pb-3 text-right pr-1">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {scanLoading && devices.length === 0 ? (
                <>
                  <SkeletonTableRow cols={5} />
                  <SkeletonTableRow cols={5} />
                  <SkeletonTableRow cols={5} />
                  <SkeletonTableRow cols={5} />
                </>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-surface-600 italic">
                    No devices found on local subnet
                  </td>
                </tr>
              ) : (
                devices.map((d, i) => (
                  <tr key={i} className="hover:bg-white/[0.01]">
                    <td className="py-2.5 pl-1 font-mono font-medium text-white">{d.ip}</td>
                    <td className="py-2.5 font-mono text-surface-400">{d.mac}</td>
                    <td className="py-2.5 text-surface-300 font-mono truncate max-w-xs">{d.hostname || '—'}</td>
                    <td className="py-2.5 text-surface-400">{d.interfaceAlias}</td>
                    <td className="py-2.5 text-right pr-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
