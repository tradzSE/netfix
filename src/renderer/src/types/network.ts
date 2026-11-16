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

export interface FullNetworkInfo {
  adapters: NetworkAdapter[]
  ipConfig: IPConfiguration[]
  dnsServers: DNSServerInfo[]
  wifiInfo: WiFiInfo
}
