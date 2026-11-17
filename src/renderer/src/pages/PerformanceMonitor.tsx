import { useState, useEffect } from 'react'
import {
  BarChart3, Play, Pause, Square, Activity, Zap, ArrowDown,
  ArrowUp, AlertTriangle, Navigation, Cpu, RefreshCw, CheckCircle,
  XCircle, ArrowRight, Layers
} from 'lucide-react'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { cn } from '../lib/utils'

export interface PingDataPoint {
  seq: number
  timestamp: number
  latency: number | null
  success: boolean
}

export interface MonitorStats {
  target: string
  sent: number
  received: number
  lost: number
  lossPercent: number
  avgLatency: number
  minLatency: number
  maxLatency: number
  jitter: number
  currentLatency: number | null
  history: PingDataPoint[]
  status: 'idle' | 'running' | 'paused'
}

export interface RouteHop {
  hop: number
  rttMs: number | null
  ip: string
  status: 'ok' | 'high_latency' | 'timeout'
  isTarget: boolean
}

export interface TraceRouteResult {
  target: string
  hops: RouteHop[]
  completed: boolean
  totalHops: number
}

export interface ProcessConnectionGroup {
  pid: number
  processName: string
  establishedCount: number
  listenCount: number
  totalCount: number
  sampleEndpoints: string[]
}

export interface ActiveConnectionsResult {
  totalConnections: number
  processes: ProcessConnectionGroup[]
}

type PerformanceTab = 'telemetry' | 'traceroute' | 'bandwidth'

export default function PerformanceMonitor() {
  const [activeTab, setActiveTab] = useState<PerformanceTab>('telemetry')

  // Live Ping Monitor State
  const [stats, setStats] = useState<MonitorStats>({
    target: '1.1.1.1',
    sent: 0,
    received: 0,
    lost: 0,
    lossPercent: 0,
    avgLatency: 0,
    minLatency: 0,
    maxLatency: 0,
    jitter: 0,
    currentLatency: null,
    history: [],
    status: 'idle'
  })
  const [targetInput, setTargetInput] = useState('1.1.1.1')
  const [loading, setLoading] = useState(false)
  const [gatewayIp, setGatewayIp] = useState<string | null>(null)

  // Visual Traceroute State
  const [traceTarget, setTraceTarget] = useState('1.1.1.1')
  const [traceResult, setTraceResult] = useState<TraceRouteResult | null>(null)
  const [tracing, setTracing] = useState(false)
  const [traceError, setTraceError] = useState<string | null>(null)

  // Bandwidth Hogs State
  const [connResult, setConnResult] = useState<ActiveConnectionsResult | null>(null)
  const [connLoading, setConnLoading] = useState(false)

  // Fetch gateway on mount for quick selection
  useEffect(() => {
    window.netfix.network.getIPConfig().then((res) => {
      if (res.success && res.data) {
        const configs = Array.isArray(res.data) ? res.data : [res.data]
        const primary = configs.find((c: any) => c.IPv4Gateway)
        if (primary && primary.IPv4Gateway) {
          setGatewayIp(primary.IPv4Gateway)
        }
      }
    }).catch(() => {})

    // Subscribe to live monitor ticks
    const unsubscribe = window.netfix.monitor.onTick((updated: MonitorStats) => {
      setStats(updated)
    })

    // Fetch initial stats
    window.netfix.monitor.getStats().then((res) => {
      if (res.success && res.data) {
        const data = res.data as MonitorStats
        setStats(data)
        if (data.target) setTargetInput(data.target)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Auto-fetch connections when switching to bandwidth tab
  useEffect(() => {
    if (activeTab === 'bandwidth' && !connResult) {
      fetchConnections()
    }
  }, [activeTab])

  const handleStart = async () => {
    setLoading(true)
    try {
      const res = await window.netfix.monitor.start(targetInput, 1000)
      if (res.success && res.data) {
        setStats(res.data as MonitorStats)
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePause = async () => {
    const res = await window.netfix.monitor.pause()
    if (res.success && res.data) setStats(res.data as MonitorStats)
  }

  const handleResume = async () => {
    const res = await window.netfix.monitor.resume()
    if (res.success && res.data) setStats(res.data as MonitorStats)
  }

  const handleStop = async () => {
    const res = await window.netfix.monitor.stop()
    if (res.success && res.data) setStats(res.data as MonitorStats)
  }

  const handleTrace = async () => {
    if (!traceTarget.trim()) return
    setTracing(true)
    setTraceError(null)
    try {
      const res = await window.netfix.tools.traceRoute(traceTarget)
      if (res.success && res.data) {
        setTraceResult(res.data as TraceRouteResult)
      } else {
        setTraceError(res.error || 'Traceroute failed')
      }
    } catch (err) {
      setTraceError((err as Error).message)
    } finally {
      setTracing(false)
    }
  }

  const fetchConnections = async () => {
    setConnLoading(true)
    try {
      const res = await window.netfix.tools.getActiveConnections()
      if (res.success && res.data) {
        setConnResult(res.data as ActiveConnectionsResult)
      }
    } finally {
      setConnLoading(false)
    }
  }

  // SVG Chart Calculations
  const chartWidth = 600
  const chartHeight = 160
  const history = stats.history
  const maxPoints = 60
  const maxLatency = Math.max(50, ...history.map(h => (h.latency || 0) * 1.25))

  const getPoints = () => {
    if (history.length === 0) return ''
    return history
      .map((pt, i) => {
        const x = (i / (maxPoints - 1)) * chartWidth
        const lat = pt.latency || 0
        const y = chartHeight - (lat / maxLatency) * (chartHeight - 20) - 10
        return `${x},${Math.max(5, Math.min(chartHeight - 5, y))}`
      })
      .join(' ')
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Network Performance &amp; Activity</h1>
          <p className="text-sm text-surface-500 mt-0.5">Real-time latency telemetry, visual hop-by-hop traceroute &amp; bandwidth hogs</p>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-950/80 rounded-xl border border-white/[0.06]">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
              activeTab === 'telemetry'
                ? 'bg-accent/15 text-accent border border-accent/25 shadow-sm'
                : 'text-surface-400 hover:text-white'
            )}
          >
            <Activity size={13} />
            Live Ping
          </button>
          <button
            onClick={() => setActiveTab('traceroute')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
              activeTab === 'traceroute'
                ? 'bg-accent/15 text-accent border border-accent/25 shadow-sm'
                : 'text-surface-400 hover:text-white'
            )}
          >
            <Navigation size={13} />
            Visual Traceroute
          </button>
          <button
            onClick={() => setActiveTab('bandwidth')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
              activeTab === 'bandwidth'
                ? 'bg-accent/15 text-accent border border-accent/25 shadow-sm'
                : 'text-surface-400 hover:text-white'
            )}
          >
            <Cpu size={13} />
            App Sockets
          </button>
        </div>
      </div>

      {/* ── TAB 1: Live Ping Telemetry ────────────────────────────────────────── */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          {/* Target Selection & Controller */}
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 flex items-center gap-3">
                <div className="flex-1 max-w-sm flex items-center gap-2 bg-surface-950 border border-white/[0.08] rounded-lg px-3 py-1.5 focus-within:border-accent/40">
                  <Activity size={14} className="text-surface-500" />
                  <input
                    type="text"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    disabled={stats.status === 'running'}
                    placeholder="Enter host or IP (e.g. 1.1.1.1)"
                    className="bg-transparent text-sm text-white placeholder-surface-600 focus:outline-none w-full"
                  />
                </div>

                {stats.status === 'idle' ? (
                  <Button size="md" onClick={handleStart} loading={loading}>
                    <Play size={13} />
                    Start Monitoring
                  </Button>
                ) : stats.status === 'running' ? (
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="md" onClick={handlePause}>
                      <Pause size={13} />
                      Pause
                    </Button>
                    <Button variant="danger" size="md" onClick={handleStop}>
                      <Square size={13} />
                      Stop
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button size="md" onClick={handleResume}>
                      <Play size={13} />
                      Resume
                    </Button>
                    <Button variant="danger" size="md" onClick={handleStop}>
                      <Square size={13} />
                      Stop
                    </Button>
                  </div>
                )}
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-surface-500 mr-1">Presets:</span>
                {gatewayIp && (
                  <button
                    onClick={() => { setTargetInput(gatewayIp); }}
                    disabled={stats.status === 'running'}
                    className="px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-surface-300 font-mono text-[11px]"
                  >
                    Gateway ({gatewayIp})
                  </button>
                )}
                <button
                  onClick={() => setTargetInput('1.1.1.1')}
                  disabled={stats.status === 'running'}
                  className="px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-surface-300 font-mono text-[11px]"
                >
                  Cloudflare (1.1.1.1)
                </button>
                <button
                  onClick={() => setTargetInput('8.8.8.8')}
                  disabled={stats.status === 'running'}
                  className="px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-surface-300 font-mono text-[11px]"
                >
                  Google (8.8.8.8)
                </button>
              </div>
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Current Latency */}
            <Card padding="md">
              <div className="flex items-center justify-between text-xs text-surface-400 mb-1">
                <span>Current Latency</span>
                <Activity size={14} className="text-accent" />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono text-white">
                  {stats.currentLatency !== null ? `${stats.currentLatency}` : '—'}
                </span>
                <span className="text-xs text-surface-500 font-mono">ms</span>
              </div>
              <span className="text-[10px] text-surface-500 mt-1 block">
                {stats.status === 'running' ? 'Live ping stream' : 'Monitor stopped'}
              </span>
            </Card>

            {/* Avg Latency */}
            <Card padding="md">
              <div className="flex items-center justify-between text-xs text-surface-400 mb-1">
                <span>Average Latency</span>
                <Zap size={14} className="text-blue-400" />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono text-white">
                  {stats.avgLatency}
                </span>
                <span className="text-xs text-surface-500 font-mono">ms</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-surface-500 mt-1">
                <span>Min: {stats.minLatency}ms</span>
                <span>·</span>
                <span>Max: {stats.maxLatency}ms</span>
              </div>
            </Card>

            {/* Jitter */}
            <Card padding="md">
              <div className="flex items-center justify-between text-xs text-surface-400 mb-1">
                <span>Packet Jitter</span>
                <BarChart3 size={14} className="text-purple-400" />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono text-white">
                  {stats.jitter}
                </span>
                <span className="text-xs text-surface-500 font-mono">ms</span>
              </div>
              <span className="text-[10px] text-surface-500 mt-1 block">
                {stats.jitter < 10 ? 'Stable connection' : 'Variance detected'}
              </span>
            </Card>

            {/* Packet Loss */}
            <Card padding="md">
              <div className="flex items-center justify-between text-xs text-surface-400 mb-1">
                <span>Packet Loss</span>
                {stats.lossPercent > 0 ? (
                  <AlertTriangle size={14} className="text-red-400" />
                ) : (
                  <Activity size={14} className="text-emerald-400" />
                )}
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={cn('text-2xl font-bold font-mono', stats.lossPercent > 0 ? 'text-red-400' : 'text-white')}>
                  {stats.lossPercent}%
                </span>
              </div>
              <span className="text-[10px] text-surface-500 mt-1 block">
                {stats.received}/{stats.sent} packets received
              </span>
            </Card>
          </div>

          {/* Real-Time Latency Graph */}
          <Card>
            <CardHeader>
              <CardTitle>Live Latency Timeline (Rolling 60s)</CardTitle>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <span className="text-surface-400">Latency (ms)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-surface-400">Packet Drop</span>
                </div>
              </div>
            </CardHeader>

            <div className="relative w-full overflow-hidden bg-surface-950/70 rounded-lg p-3 border border-white/[0.03]">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-40 overflow-visible"
                preserveAspectRatio="none"
              >
                {/* Grid lines */}
                <line x1="0" y1="10" x2={chartWidth} y2="10" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <line x1="0" y1="80" x2={chartWidth} y2="80" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <line x1="0" y1="150" x2={chartWidth} y2="150" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />

                {/* Area under curve */}
                {history.length > 1 && (
                  <polygon
                    points={`0,${chartHeight} ${getPoints()} ${((history.length - 1) / (maxPoints - 1)) * chartWidth},${chartHeight}`}
                    fill="url(#latencyGrad)"
                    opacity="0.25"
                  />
                )}

                {/* Polyline line */}
                {history.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#00d4aa"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={getPoints()}
                  />
                )}

                {/* Packet loss points */}
                {history.map((pt, i) => {
                  if (pt.success) return null
                  const x = (i / (maxPoints - 1)) * chartWidth
                  return (
                    <circle
                      key={`drop-${pt.seq}`}
                      cx={x}
                      cy="20"
                      r="4"
                      fill="#ef4444"
                    />
                  )
                })}

                <defs>
                  <linearGradient id="latencyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#00d4aa" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
              </svg>

              {history.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-surface-600">
                  Click &quot;Start Monitoring&quot; to begin capturing real-time latency
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: Visual Hop-by-Hop Traceroute (MTR) ───────────────────────── */}
      {activeTab === 'traceroute' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hop-by-Hop Route Tracer (MTR)</CardTitle>
            </CardHeader>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 flex items-center gap-2 bg-surface-950 border border-white/[0.08] rounded-lg px-3 py-1.5 focus-within:border-accent/40">
                <Navigation size={14} className="text-surface-500" />
                <input
                  type="text"
                  placeholder="Target host or IP (e.g. 1.1.1.1, google.com)"
                  value={traceTarget}
                  onChange={(e) => setTraceTarget(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrace()}
                  className="bg-transparent text-sm text-white placeholder-surface-600 focus:outline-none w-full"
                />
              </div>
              <Button size="md" onClick={handleTrace} loading={tracing}>
                Trace Route
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-surface-500">
              <span>Quick targets:</span>
              <button onClick={() => setTraceTarget('1.1.1.1')} className="px-2 py-0.5 rounded bg-surface-800 hover:bg-surface-700 text-surface-300 font-mono text-[11px]">Cloudflare (1.1.1.1)</button>
              <button onClick={() => setTraceTarget('8.8.8.8')} className="px-2 py-0.5 rounded bg-surface-800 hover:bg-surface-700 text-surface-300 font-mono text-[11px]">Google (8.8.8.8)</button>
              <button onClick={() => setTraceTarget('google.com')} className="px-2 py-0.5 rounded bg-surface-800 hover:bg-surface-700 text-surface-300 font-mono text-[11px]">google.com</button>
            </div>
          </Card>

          {traceError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {traceError}
            </div>
          )}

          {/* Visual Node Diagram */}
          {traceResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle>Route Map to {traceResult.target} ({traceResult.totalHops} hops)</CardTitle>
                  <span className="text-xs text-surface-400 font-mono">
                    {traceResult.completed ? 'Trace Complete' : 'Tracing...'}
                  </span>
                </div>
              </CardHeader>

              {/* Hop Node Sequence */}
              <div className="p-4 bg-surface-950/70 rounded-xl border border-white/[0.03] overflow-x-auto">
                <div className="flex items-center gap-3 min-w-max py-2">
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 rounded-lg bg-surface-800 border border-white/[0.08] flex items-center justify-center text-white text-xs font-semibold">
                      PC
                    </div>
                    <span className="text-[10px] text-surface-400 mt-1 font-mono">Laptop</span>
                  </div>

                  {traceResult.hops.map((hop) => {
                    const isTimeout = hop.status === 'timeout'
                    const isHigh = hop.status === 'high_latency'
                    const isOk = hop.status === 'ok'

                    return (
                      <div key={hop.hop} className="flex items-center gap-3">
                        {/* Connecting Line */}
                        <div className="flex flex-col items-center">
                          <span className={cn(
                            'text-[9px] font-mono font-semibold px-1 rounded',
                            isTimeout ? 'text-red-400' : isHigh ? 'text-amber-400' : 'text-emerald-400'
                          )}>
                            {hop.rttMs !== null ? `${hop.rttMs}ms` : '*'}
                          </span>
                          <div className={cn(
                            'h-0.5 w-10 mt-0.5',
                            isTimeout ? 'bg-red-500/40 border-t border-dashed border-red-400' : isHigh ? 'bg-amber-400/40' : 'bg-emerald-400/40'
                          )} />
                        </div>

                        {/* Hop Node */}
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            'h-10 w-10 rounded-xl border flex items-center justify-center text-xs font-mono font-bold transition-transform hover:scale-105',
                            hop.isTarget
                              ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                              : isTimeout
                              ? 'bg-red-500/15 border-red-500/30 text-red-400'
                              : isHigh
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                              : 'bg-surface-800 border-white/[0.08] text-white'
                          )}>
                            {hop.hop}
                          </div>
                          <span className="text-[10px] text-surface-400 mt-1 font-mono truncate max-w-[90px] text-center" title={hop.ip}>
                            {hop.isTarget ? 'TARGET' : hop.hop === 1 ? 'Gateway' : hop.ip}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Hop Breakdown Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-left text-surface-500 font-semibold">
                      <th className="pb-2.5 pl-1">Hop #</th>
                      <th className="pb-2.5">Node IP Address</th>
                      <th className="pb-2.5">Latency</th>
                      <th className="pb-2.5 text-right pr-1">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {traceResult.hops.map((hop) => (
                      <tr key={hop.hop} className="hover:bg-white/[0.01]">
                        <td className="py-2 pl-1 font-mono font-bold text-accent">Hop {hop.hop}</td>
                        <td className="py-2 font-mono text-white">
                          {hop.ip}
                          {hop.isTarget && (
                            <span className="ml-2 text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 uppercase">
                              Destination Target
                            </span>
                          )}
                          {hop.hop === 1 && (
                            <span className="ml-2 text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 uppercase">
                              Local Router
                            </span>
                          )}
                        </td>
                        <td className="py-2 font-mono text-surface-300">
                          {hop.rttMs !== null ? `${hop.rttMs} ms` : '—'}
                        </td>
                        <td className="py-2 text-right pr-1">
                          <span className={cn(
                            'text-[11px] font-medium px-2 py-0.5 rounded',
                            hop.status === 'ok'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : hop.status === 'high_latency'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-red-500/10 text-red-400'
                          )}>
                            {hop.status === 'ok' ? 'OK' : hop.status === 'high_latency' ? 'High Latency' : 'Timed Out'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB 3: Active Process Sockets & Bandwidth Hogs ──────────────────── */}
      {activeTab === 'bandwidth' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>Active Network Apps &amp; Sockets ({connResult?.totalConnections ?? 0} active sockets)</CardTitle>
                <Button variant="secondary" size="sm" onClick={fetchConnections} loading={connLoading}>
                  <RefreshCw size={13} />
                  Refresh Apps
                </Button>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.04] text-left text-surface-500 font-semibold">
                    <th className="pb-3 pl-1">Process Name</th>
                    <th className="pb-3">PID</th>
                    <th className="pb-3">Established Sockets</th>
                    <th className="pb-3">Listening</th>
                    <th className="pb-3">Socket Share</th>
                    <th className="pb-3 text-right pr-1">Sample Endpoints</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {!connResult || connResult.processes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-surface-600 italic">
                        {connLoading ? 'Inspecting active TCP sockets and resolving process names...' : 'No active network processes found'}
                      </td>
                    </tr>
                  ) : (
                    connResult.processes.map((proc) => {
                      const sharePercent = connResult.totalConnections > 0
                        ? Math.round((proc.totalCount / connResult.totalConnections) * 100)
                        : 0

                      return (
                        <tr key={`${proc.processName}-${proc.pid}`} className="hover:bg-white/[0.01]">
                          <td className="py-2.5 pl-1 font-semibold text-white flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-accent" />
                            {proc.processName}
                          </td>
                          <td className="py-2.5 font-mono text-surface-400">{proc.pid}</td>
                          <td className="py-2.5 font-mono text-emerald-400 font-semibold">{proc.establishedCount}</td>
                          <td className="py-2.5 font-mono text-surface-400">{proc.listenCount}</td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2 max-w-[120px]">
                              <div className="h-1.5 flex-1 bg-surface-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-accent rounded-full"
                                  style={{ width: `${Math.max(5, sharePercent)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-surface-400">{sharePercent}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-right pr-1 font-mono text-surface-400 text-[11px] truncate max-w-xs">
                            {proc.sampleEndpoints.join(', ') || 'Local / Internal'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
