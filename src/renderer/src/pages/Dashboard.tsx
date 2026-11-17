import { useState, useEffect, useCallback } from 'react'
import {
  Activity, Network, Wifi, ArrowRight, RefreshCw,
  ShieldCheck, ShieldAlert, Zap, Radio, Globe, ExternalLink, Home
} from 'lucide-react'
import Card, { CardHeader, CardTitle, CardSubtitle } from '../components/ui/Card'
import StatusBadge from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import { useNetworkInfo } from '../hooks/useNetworkInfo'
import { useDiagnostics } from '../hooks/useDiagnostics'
import { formatDuration, formatValue, cn } from '../lib/utils'
import type { PageId } from '../App'

interface DashboardProps {
  onNavigate: (page: PageId) => void
}

interface ConnectionProfile {
  name: string
  interfaceAlias: string
  networkCategory: 'Public' | 'Private' | 'Domain'
  isPublic: boolean
  isInternetConnected: boolean
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { data: networkInfo, loading: networkLoading, refresh: refreshNetwork } = useNetworkInfo()
  const { report, running, runDiagnostics } = useDiagnostics()

  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [shieldLoading, setShieldLoading] = useState(false)
  const [captiveLoading, setCaptiveLoading] = useState(false)
  const [shieldFeedback, setShieldFeedback] = useState<string | null>(null)

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await window.netfix.tools.getConnectionProfiles()
      if (res.success && res.data) {
        setProfiles(res.data as ConnectionProfile[])
      }
    } catch {
      // fallback
    }
  }, [])

  useEffect(() => {
    refreshNetwork()
    fetchProfiles()
  }, [refreshNetwork, fetchProfiles])

  const activeAdapter = networkInfo?.adapters.find(a => a.Status === 'Up')
  const primaryIP = networkInfo?.ipConfig.find(c => c.IPv4Gateway)
  const isConnected = !!activeAdapter

  // Determine current active network category (Public vs Private)
  const activeProfile = profiles.length > 0 ? profiles[0] : null
  const isPublicProfile = activeProfile ? activeProfile.networkCategory === 'Public' : false

  const handleForceCaptive = async () => {
    setCaptiveLoading(true)
    setShieldFeedback(null)
    try {
      const res = await window.netfix.tools.forceCaptivePortal()
      if (res.success && res.data) {
        const d = res.data as { openedUrls: string[]; detectedRedirect: string | null }
        if (d.detectedRedirect) {
          setShieldFeedback(`Redirect detected! Opening portal: ${d.detectedRedirect}`)
        } else {
          setShieldFeedback('Captive probe dispatched to browser. Your campus/hotel login page should pop open now.')
        }
      } else {
        setShieldFeedback('Dispatched unencrypted HTTP probe to browser.')
      }
    } catch (err) {
      setShieldFeedback(`Error: ${(err as Error).message}`)
    } finally {
      setCaptiveLoading(false)
    }
  }

  const handleToggleShield = async (action: 'set-public-profile' | 'set-private-profile') => {
    setShieldLoading(true)
    setShieldFeedback(null)
    try {
      const res = await window.netfix.repair.execute({
        actionId: action,
        adapterName: activeAdapter?.Name || activeProfile?.interfaceAlias
      })
      if (res.success) {
        setShieldFeedback(
          action === 'set-public-profile'
            ? 'School / Public Shield enabled: Inbound port scans and Port 445 SMB are blocked by Windows Firewall.'
            : 'Switched to Private (Home Mode): Local network discovery and sharing enabled.'
        )
        await fetchProfiles()
        await refreshNetwork()
      } else {
        setShieldFeedback(res.error || 'Failed to update network profile.')
      }
    } catch (err) {
      setShieldFeedback(`Elevation declined or error: ${(err as Error).message}`)
    } finally {
      setShieldLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-xs text-surface-400 mt-1">
            Live interface state, wireless connection, and gateway diagnostics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { refreshNetwork(); fetchProfiles() }}
            loading={networkLoading}
          >
            <RefreshCw size={13} />
            Refresh State
          </Button>
          <Button
            size="sm"
            onClick={runDiagnostics}
            loading={running}
          >
            <Activity size={13} />
            Run Diagnostic
          </Button>
        </div>
      </div>

      {/* Campus & School Wi-Fi Quick Shield & Captive Helper */}
      <div className="rounded-xl p-4.5 border border-white/[0.08] bg-surface-900/60 relative">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-lg bg-surface-800 border border-white/[0.06] flex items-center justify-center text-surface-300">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Campus &amp; Public Wi-Fi Shield</h3>
                <span className={cn(
                  'text-[11px] font-semibold px-2 py-0.5 rounded',
                  isPublicProfile
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-amber-500/15 text-amber-300'
                )}>
                  {isPublicProfile ? 'Shield Active (Public)' : 'Unshielded (Private / Home)'}
                </span>
              </div>
              <p className="text-xs text-surface-400 mt-0.5 max-w-xl">
                {isPublicProfile
                  ? 'Windows Defender Firewall is shielding your laptop. Inbound port scans, Port 445 SMB, and network discovery are blocked from campus peers.'
                  : 'Laptop is set to Private mode (open to local network). Enable School Shield when connecting to campus, dorms, or coffee shop Wi-Fi.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleForceCaptive}
              loading={captiveLoading}
              title="Force school login/splash screen to pop open in your browser"
            >
              <ExternalLink size={13} />
              Force Login Page
            </Button>

            {isPublicProfile ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleToggleShield('set-private-profile')}
                loading={shieldLoading}
                title="Switch back to private mode for home network sharing"
              >
                <Home size={13} />
                Switch to Home Mode
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleToggleShield('set-public-profile')}
                loading={shieldLoading}
                title="Block inbound scans and protect your laptop at school"
              >
                <ShieldCheck size={13} />
                Enable School Shield
              </Button>
            )}
          </div>
        </div>

        {shieldFeedback && (
          <div className="mt-3 pt-3 border-t border-white/[0.04] text-xs font-mono text-accent flex items-center justify-between">
            <span>{shieldFeedback}</span>
            <button onClick={() => setShieldFeedback(null)} className="text-surface-500 hover:text-white ml-2 text-xs">✕</button>
          </div>
        )}
      </div>

      {/* Primary Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Connection Status Card */}
        <Card
          variant="interactive"
          padding="md"
          className="cursor-pointer"
        >
          <div onClick={() => onNavigate('network-info')}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">Primary Interface</span>
              {isConnected ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Connected
                </div>
              ) : (
                <StatusBadge status="fail" />
              )}
            </div>

            {networkLoading && !networkInfo ? (
              <div className="space-y-2 mt-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ) : (
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-white truncate">
                  {activeAdapter?.InterfaceDescription ?? 'No Active Adapter'}
                </p>
                <p className="text-xs text-surface-300 font-mono">
                  {primaryIP?.IPv4Address ?? '—'}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Wi-Fi Link Card */}
        <Card
          variant="interactive"
          padding="md"
          className="cursor-pointer"
        >
          <div onClick={() => onNavigate('wifi')}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">Wireless Link</span>
              {networkLoading && !networkInfo ? (
                <Skeleton className="h-4 w-12 rounded" />
              ) : networkInfo?.wifiInfo.connected ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {networkInfo.wifiInfo.signalPercent}%
                </div>
              ) : (
                <span className="text-xs text-surface-500 font-medium">Disconnected</span>
              )}
            </div>

            {networkLoading && !networkInfo ? (
              <div className="space-y-2 mt-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ) : (
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-white truncate">
                  {networkInfo?.wifiInfo.ssid ?? 'No Wi-Fi Associated'}
                </p>
                <p className="text-xs text-surface-400 font-mono">
                  {networkInfo?.wifiInfo.channel ? `Channel ${networkInfo.wifiInfo.channel} (${networkInfo.wifiInfo.band ?? '5GHz'})` : 'Ethernet or Inactive'}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Gateway & Internet Route */}
        <Card
          variant="interactive"
          padding="md"
          className="cursor-pointer"
        >
          <div onClick={() => onNavigate('diagnostics')}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">Gateway Route</span>
              <StatusBadge status={report ? report.overallStatus : 'idle'} />
            </div>

            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-white font-mono truncate">
                {primaryIP?.IPv4Gateway ?? 'No Gateway'}
              </p>
              <p className="text-xs text-surface-400">
                {report ? `Last test: ${formatDuration(report.durationMs)}` : 'Click to run diagnosis'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Technical Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Interface Parameters */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Interface Parameters</CardTitle>
              <CardSubtitle>Active TCP/IP binding &amp; hardware layer</CardSubtitle>
            </div>
            <button
              onClick={() => onNavigate('network-info')}
              className="text-xs font-medium text-surface-400 hover:text-white flex items-center gap-1 transition-colors group"
            >
              All Adapters <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </CardHeader>

          {networkLoading && !networkInfo ? (
            <div className="space-y-3 pt-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-white/[0.02] last:border-0">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              {[
                ['Interface Alias', activeAdapter?.Name],
                ['IPv4 Address', primaryIP?.IPv4Address],
                ['Subnet Prefix', primaryIP?.IPv4SubnetMask ? `/${primaryIP.IPv4SubnetMask}` : null],
                ['Default Gateway', primaryIP?.IPv4Gateway],
                ['DNS Server(s)', primaryIP?.DNSServers],
                ['Hardware MAC', activeAdapter?.MacAddress],
                ['Link Speed', activeAdapter?.LinkSpeed],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.02] last:border-0">
                  <span className="text-surface-400">{label as string}</span>
                  <span className="text-surface-200 font-mono font-medium">{formatValue(value)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Wi-Fi Details */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Wireless Connection</CardTitle>
              <CardSubtitle>Access point metrics &amp; signal properties</CardSubtitle>
            </div>
            <button
              onClick={() => onNavigate('wifi')}
              className="text-xs font-medium text-surface-400 hover:text-white flex items-center gap-1 transition-colors group"
            >
              Wi-Fi Spectrum <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </CardHeader>

          {networkLoading && !networkInfo ? (
            <div className="space-y-3 pt-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-white/[0.02] last:border-0">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              ))}
            </div>
          ) : networkInfo?.wifiInfo.connected ? (
            <div className="space-y-2.5 pt-1">
              {[
                ['Network SSID', networkInfo.wifiInfo.ssid],
                ['BSSID Access Point', networkInfo.wifiInfo.bssid],
                ['Frequency Band', networkInfo.wifiInfo.band],
                ['Operating Channel', networkInfo.wifiInfo.channel ? `Ch ${networkInfo.wifiInfo.channel}` : null],
                ['Signal Strength', networkInfo.wifiInfo.signalPercent ? `${networkInfo.wifiInfo.signalPercent}% (${networkInfo.wifiInfo.rssi} dBm)` : null],
                ['Radio Standard', networkInfo.wifiInfo.radioType],
                ['Authentication & Cipher', `${networkInfo.wifiInfo.authentication || ''} / ${networkInfo.wifiInfo.cipher || ''}`],
                ['PHY Tx/Rx Rates', networkInfo.wifiInfo.txRate ? `${networkInfo.wifiInfo.txRate} / ${networkInfo.wifiInfo.rxRate} Mbps` : null],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.02] last:border-0">
                  <span className="text-surface-400">{label as string}</span>
                  <span className="text-surface-200 font-mono font-medium">{formatValue(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-surface-500 text-xs text-center">
              <Wifi size={24} className="text-surface-600 mb-2 opacity-60" />
              <p>No active Wi-Fi connection detected.</p>
              <p className="text-[11px] text-surface-600 mt-1">If using wired Ethernet, check Interface Parameters.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
