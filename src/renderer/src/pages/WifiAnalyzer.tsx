import { useState, useEffect, useCallback } from 'react'
import { Wifi, RefreshCw, Radio, CheckCircle, AlertCircle, Signal, Shield, Hash, Users } from 'lucide-react'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Skeleton, { SkeletonTableRow } from '../components/ui/Skeleton'
import { cn } from '../lib/utils'

export interface WiFiAccessPoint {
  bssid: string
  signalPercent: number
  rssi: number
  radioType: string
  band: string
  channel: number
  channelUtilization: number | null
  connectedStations: number | null
}

export interface NearbyWiFiNetwork {
  ssid: string
  networkType: string
  authentication: string
  encryption: string
  accessPoints: WiFiAccessPoint[]
}

export interface ChannelScore {
  channel: number
  band: '2.4 GHz' | '5 GHz'
  apCount: number
  averageSignal: number
  score: number
  recommended: boolean
}

export interface WiFiAnalysisResult {
  networks: NearbyWiFiNetwork[]
  totalAPs: number
  channelScores: ChannelScore[]
  best24GhzChannel: number
  best5GhzChannel: number
}

export default function WifiAnalyzer() {
  const [data, setData] = useState<WiFiAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeBand, setActiveBand] = useState<'2.4 GHz' | '5 GHz'>('2.4 GHz')
  const [filterText, setFilterText] = useState('')

  const scan = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.netfix.wifi.scanNetworks()
      if (res.success && res.data) {
        setData(res.data as WiFiAnalysisResult)
      } else {
        setError(res.error || 'Failed to scan Wi-Fi networks')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    scan()
  }, [scan])

  const filteredScores = data?.channelScores.filter(s => s.band === activeBand) || []

  const filteredNetworks = (data?.networks || []).filter(net =>
    net.ssid.toLowerCase().includes(filterText.toLowerCase()) ||
    net.accessPoints.some(ap => ap.bssid.toLowerCase().includes(filterText.toLowerCase()))
  )

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Wi-Fi Spectrum & Analyzer</h1>
          <p className="text-sm text-surface-500 mt-0.5">Airwave congestion, channel spectrum analysis & optimal channel ratings</p>
        </div>
        <Button variant="secondary" size="sm" onClick={scan} loading={loading}>
          <RefreshCw size={13} />
          Scan Networks
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Radio size={16} className="text-accent" />
                <Skeleton className="h-4 w-48" />
              </div>
            </CardHeader>
            <div className="pt-2">
              <Skeleton className="h-28 rounded-lg w-full" />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wifi size={16} className="text-blue-400" />
                <Skeleton className="h-4 w-40" />
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="py-2.5 pl-1"><Skeleton className="h-3 w-24" /></th>
                    <th className="py-2.5"><Skeleton className="h-3 w-20" /></th>
                    <th className="py-2.5"><Skeleton className="h-3 w-28" /></th>
                    <th className="py-2.5"><Skeleton className="h-3 w-16" /></th>
                    <th className="py-2.5 text-right pr-1"><Skeleton className="h-3 w-16 ml-auto" /></th>
                  </tr>
                </thead>
                <tbody>
                  <SkeletonTableRow cols={5} />
                  <SkeletonTableRow cols={5} />
                  <SkeletonTableRow cols={5} />
                  <SkeletonTableRow cols={5} />
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Recommended Channels Banner */}
      {data && (
        <div className="grid grid-cols-2 gap-4">
          <Card padding="md" className="border-accent/20 bg-accent/[0.03]">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Recommended 2.4 GHz Channel</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-white">Channel {data.best24GhzChannel}</span>
                  <span className="text-xs text-surface-400">Non-overlapping, lowest interference</span>
                </div>
              </div>
              <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <CheckCircle size={18} />
              </div>
            </div>
          </Card>

          <Card padding="md" className="border-blue-500/20 bg-blue-500/[0.03]">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">Recommended 5 GHz Channel</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-white">Channel {data.best5GhzChannel}</span>
                  <span className="text-xs text-surface-400">Clean spectrum, high throughput</span>
                </div>
              </div>
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Radio size={18} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Channel Spectrum Chart */}
      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Radio size={16} className="text-accent" />
              <CardTitle>Channel Congestion & Spectrum</CardTitle>
            </div>
            <div className="flex items-center rounded-lg bg-surface-950 p-0.5 border border-white/[0.05]">
              <button
                onClick={() => setActiveBand('2.4 GHz')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-all',
                  activeBand === '2.4 GHz' ? 'bg-surface-800 text-white shadow' : 'text-surface-400 hover:text-white'
                )}
              >
                2.4 GHz
              </button>
              <button
                onClick={() => setActiveBand('5 GHz')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-all',
                  activeBand === '5 GHz' ? 'bg-surface-800 text-white shadow' : 'text-surface-400 hover:text-white'
                )}
              >
                5 GHz
              </button>
            </div>
          </CardHeader>

          {/* Visual Channel Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2">
            {filteredScores.map((score) => {
              const isBest = score.recommended
              const isHigh = score.score >= 75
              const isMed = score.score >= 45 && score.score < 75

              return (
                <div
                  key={score.channel}
                  className={cn(
                    'rounded-lg border p-3 flex flex-col justify-between transition-all',
                    isBest
                      ? 'border-accent/40 bg-accent/[0.04]'
                      : 'border-white/[0.04] bg-surface-950/60 hover:border-white/[0.08]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-white">Ch {score.channel}</span>
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.5 rounded',
                        isHigh ? 'bg-emerald-500/15 text-emerald-400' :
                        isMed ? 'bg-amber-500/15 text-amber-400' :
                        'bg-red-500/15 text-red-400'
                      )}
                    >
                      {score.score}/100
                    </span>
                  </div>

                  <div className="my-3">
                    <div className="h-1.5 w-full bg-surface-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isHigh ? 'bg-emerald-400' : isMed ? 'bg-amber-400' : 'bg-red-400'
                        )}
                        style={{ width: `${score.score}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-surface-500">
                    <span>{score.apCount} AP{score.apCount !== 1 ? 's' : ''}</span>
                    {score.recommended && (
                      <span className="text-[10px] text-accent font-semibold uppercase">BEST</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Discovered Networks Table */}
      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wifi size={16} className="text-blue-400" />
              <CardTitle>Discovered Networks ({data.networks.length} SSIDs, {data.totalAPs} APs)</CardTitle>
            </div>
            <input
              type="text"
              placeholder="Filter by SSID or BSSID..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="bg-surface-950 border border-white/[0.06] rounded-lg px-3 py-1 text-xs text-white placeholder-surface-600 focus:outline-none focus:border-accent/40 w-48"
            />
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left py-2.5 px-3 text-surface-500 font-medium">SSID</th>
                  <th className="text-left py-2.5 px-3 text-surface-500 font-medium">BSSID / MAC</th>
                  <th className="text-left py-2.5 px-3 text-surface-500 font-medium">Channel / Band</th>
                  <th className="text-left py-2.5 px-3 text-surface-500 font-medium">Signal & RSSI</th>
                  <th className="text-left py-2.5 px-3 text-surface-500 font-medium">Security</th>
                  <th className="text-left py-2.5 px-3 text-surface-500 font-medium">Load</th>
                </tr>
              </thead>
              <tbody>
                {filteredNetworks.flatMap((net) =>
                  net.accessPoints.map((ap, apIdx) => (
                    <tr
                      key={`${net.ssid}-${ap.bssid}-${apIdx}`}
                      className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 px-3 font-medium text-surface-200">
                        <div className="flex items-center gap-2">
                          <Wifi size={13} className="text-surface-400" />
                          <span>{net.ssid}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-surface-400 text-[11px]">{ap.bssid}</td>
                      <td className="py-2.5 px-3 font-mono text-surface-300">
                        Ch {ap.channel} <span className="text-surface-500 text-[10px]">({ap.band})</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                ap.signalPercent > 70 ? 'bg-emerald-400' :
                                ap.signalPercent > 40 ? 'bg-amber-400' : 'bg-red-400'
                              )}
                              style={{ width: `${ap.signalPercent}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-surface-300">
                            {ap.signalPercent}% <span className="text-surface-500">({ap.rssi} dBm)</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-surface-400 text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <Shield size={11} className="text-surface-500" />
                          {net.authentication}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-surface-400 font-mono text-[11px]">
                        {ap.channelUtilization !== null ? `${ap.channelUtilization}% util` : '—'}
                      </td>
                    </tr>
                  ))
                )}
                {filteredNetworks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-surface-500">
                      No Wi-Fi networks found matching criteria.
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
