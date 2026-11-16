import { executePowerShellJson, executePowerShell } from './powershell'

export interface NetworkAdapter {
  Name: string
  InterfaceDescription: string
  Status: string
  LinkSpeed: string
  MacAddress: string
  InterfaceIndex: number
  MediaType: string | null
  DriverVersion: string | null
}

export interface IPConfiguration {
  InterfaceAlias: string
  InterfaceIndex: number
  IPv4Address: string | null
  IPv6Address: string | null
  IPv4SubnetMask: number | null
  IPv4Gateway: string | null
  DNSServers: string[]
}

export interface DNSServerInfo {
  InterfaceAlias: string
  InterfaceIndex: number
  AddressFamily: string
  ServerAddresses: string[]
}

export interface WiFiInfo {
  connected: boolean
  ssid: string | null
  bssid: string | null
  band: string | null
  channel: number | null
  radioType: string | null
  authentication: string | null
  cipher: string | null
  signalPercent: number | null
  rssi: number | null
  rxRate: number | null
  txRate: number | null
  interfaceName: string | null
}

/**
 * Parse the unstructured output of `netsh wlan show interfaces`.
 */
function parseWiFiInfo(raw: string): WiFiInfo {
  const info: WiFiInfo = {
    connected: false, ssid: null, bssid: null, band: null,
    channel: null, radioType: null, authentication: null,
    cipher: null, signalPercent: null, rssi: null,
    rxRate: null, txRate: null, interfaceName: null,
  }

  if (!raw || raw.includes('no wireless')) {
    return info
  }

  const lines = raw.split('\n').map(l => l.trim())

  for (const line of lines) {
    const match = line.match(/^\s*(.+?)\s*:\s*(.+)$/)
    if (!match) continue
    const [, key, value] = match
    const k = key.trim().toLowerCase()
    const v = value.trim()

    switch (k) {
      case 'name': info.interfaceName = v; break
      case 'state': info.connected = v === 'connected'; break
      case 'ssid': info.ssid = v; break
      case 'ap bssid':
      case 'bssid': info.bssid = v; break
      case 'band': info.band = v; break
      case 'channel': info.channel = parseInt(v) || null; break
      case 'radio type': info.radioType = v; break
      case 'authentication': info.authentication = v; break
      case 'cipher': info.cipher = v; break
      case 'signal': info.signalPercent = parseInt(v) || null; break
      case 'rssi': info.rssi = parseInt(v) || null; break
      case 'receive rate (mbps)': info.rxRate = parseFloat(v) || null; break
      case 'transmit rate (mbps)': info.txRate = parseFloat(v) || null; break
    }
  }

  return info
}

// Ensure we always return an array from PowerShell JSON
function ensureArray<T>(data: T | T[]): T[] {
  if (Array.isArray(data)) return data
  if (data === null || data === undefined) return []
  return [data]
}

export async function getAdapters(): Promise<NetworkAdapter[]> {
  const result = await executePowerShellJson<NetworkAdapter | NetworkAdapter[]>('get-adapters')
  return result.success && result.data ? ensureArray(result.data) : []
}

export async function getIPConfig(): Promise<IPConfiguration[]> {
  const result = await executePowerShellJson<IPConfiguration | IPConfiguration[]>('get-ip-config')
  if (!result.success || !result.data) return []
  return ensureArray(result.data).map(cfg => ({
    ...cfg,
    DNSServers: ensureArray(cfg.DNSServers)
  }))
}

export async function getDNSServers(): Promise<DNSServerInfo[]> {
  const result = await executePowerShellJson<DNSServerInfo | DNSServerInfo[]>('get-dns-servers')
  if (!result.success || !result.data) return []
  return ensureArray(result.data).map(dns => ({
    ...dns,
    ServerAddresses: ensureArray(dns.ServerAddresses)
  }))
}

export async function getWiFiInfo(): Promise<WiFiInfo> {
  const result = await executePowerShell('get-wifi-info')
  return parseWiFiInfo(result.stdout)
}

export async function getFullNetworkInfo() {
  const [adapters, ipConfig, dnsServers, wifiInfo] = await Promise.all([
    getAdapters(),
    getIPConfig(),
    getDNSServers(),
    getWiFiInfo()
  ])
  return { adapters, ipConfig, dnsServers, wifiInfo }
}
