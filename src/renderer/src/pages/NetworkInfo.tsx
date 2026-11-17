import { useEffect } from 'react'
import { RefreshCw, Network, Wifi, Globe, Server } from 'lucide-react'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import StatusBadge from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import Skeleton, { SkeletonCard, SkeletonTableRow } from '../components/ui/Skeleton'
import { useNetworkInfo } from '../hooks/useNetworkInfo'
import { formatValue } from '../lib/utils'

export default function NetworkInfo() {
  const { data, loading, error, refresh } = useNetworkInfo()

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Network Information</h1>
          <p className="text-sm text-surface-500 mt-0.5">Detailed view of your network configuration &amp; hardware interfaces</p>
        </div>
        <Button variant="secondary" size="sm" onClick={refresh} loading={loading}>
          <RefreshCw size={13} />
          Refresh
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
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Network size={16} className="text-accent" />
                <Skeleton className="h-4 w-36" />
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="py-2 px-3 text-left"><Skeleton className="h-3 w-16" /></th>
                    <th className="py-2 px-3 text-left"><Skeleton className="h-3 w-32" /></th>
                    <th className="py-2 px-3 text-left"><Skeleton className="h-3 w-16" /></th>
                    <th className="py-2 px-3 text-left"><Skeleton className="h-3 w-20" /></th>
                    <th className="py-2 px-3 text-left"><Skeleton className="h-3 w-28" /></th>
                  </tr>
                </thead>
                <tbody>
                  <SkeletonTableRow cols={5} />
                  <SkeletonTableRow cols={5} />
                  <SkeletonTableRow cols={5} />
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-blue-400" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardHeader>
            <div className="grid gap-4">
              <SkeletonCard lines={4} />
            </div>
          </Card>
        </div>
      )}

      {data && (
        <>
          {/* Adapters */}
          <Card>
            <CardHeader>
              <CardTitle>Network Adapters</CardTitle>
              <span className="text-xs text-surface-500">{data.adapters.length} adapter(s)</span>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left py-2 px-3 text-surface-500 font-medium">Name</th>
                    <th className="text-left py-2 px-3 text-surface-500 font-medium">Description</th>
                    <th className="text-left py-2 px-3 text-surface-500 font-medium">Status</th>
                    <th className="text-left py-2 px-3 text-surface-500 font-medium">Speed</th>
                    <th className="text-left py-2 px-3 text-surface-500 font-medium">MAC Address</th>
                  </tr>
                </thead>
                <tbody>
                  {data.adapters.map((adapter) => (
                    <tr key={adapter.InterfaceIndex} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 text-surface-200 font-medium">{adapter.Name}</td>
                      <td className="py-2.5 px-3 text-surface-400">{adapter.InterfaceDescription}</td>
                      <td className="py-2.5 px-3"><StatusBadge status={adapter.Status} /></td>
                      <td className="py-2.5 px-3 text-surface-300 font-mono">{adapter.LinkSpeed}</td>
                      <td className="py-2.5 px-3 text-surface-400 font-mono text-[11px]">{adapter.MacAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* IP Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>IP Configuration</CardTitle>
            </CardHeader>
            <div className="grid gap-4">
              {data.ipConfig.map((config) => (
                <div
                  key={config.InterfaceIndex}
                  className="rounded-lg border border-white/[0.03] bg-surface-950/50 p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold text-surface-200">{config.InterfaceAlias}</span>
                    {config.IPv4Gateway && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-accent/10 text-accent font-medium">
                        PRIMARY
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    {[
                      ['IPv4 Address', config.IPv4Address],
                      ['IPv6 Address', config.IPv6Address],
                      ['Subnet Prefix', config.IPv4SubnetMask ? `/${config.IPv4SubnetMask}` : null],
                      ['Default Gateway', config.IPv4Gateway],
                      ['DNS Servers', config.DNSServers],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex items-center justify-between text-xs">
                        <span className="text-surface-500">{label as string}</span>
                        <span className="text-surface-300 font-mono">{formatValue(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* DNS Servers */}
          <Card>
            <CardHeader>
              <CardTitle>DNS Servers</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {data.dnsServers.map((dns) => (
                <div
                  key={`${dns.InterfaceIndex}-${dns.AddressFamily}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-white/[0.03] bg-surface-950/50 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-surface-200">{dns.InterfaceAlias}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-800 text-surface-400">
                      {dns.AddressFamily}
                    </span>
                  </div>
                  <div className="font-mono text-surface-300">
                    {dns.ServerAddresses.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Wi-Fi Info */}
          {data.wifiInfo.connected && (
            <Card>
              <CardHeader>
                <CardTitle>Wi-Fi Connection Details</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                {[
                  ['SSID', data.wifiInfo.ssid],
                  ['BSSID', data.wifiInfo.bssid],
                  ['Band', data.wifiInfo.band],
                  ['Channel', data.wifiInfo.channel],
                  ['Signal', data.wifiInfo.signalPercent ? `${data.wifiInfo.signalPercent}%` : null],
                  ['Radio Type', data.wifiInfo.radioType],
                  ['Authentication', data.wifiInfo.authentication],
                  ['Cipher', data.wifiInfo.cipher],
                  ['Tx Rate', data.wifiInfo.txRate ? `${data.wifiInfo.txRate} Mbps` : null],
                  ['Rx Rate', data.wifiInfo.rxRate ? `${data.wifiInfo.rxRate} Mbps` : null],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex items-center justify-between py-1 border-b border-white/[0.02]">
                    <span className="text-surface-500">{label as string}</span>
                    <span className="text-surface-300 font-mono">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
