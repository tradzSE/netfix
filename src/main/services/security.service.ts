import { executePowerShellJson } from './powershell'

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
  overallScore: number // 0-100
}

export async function inspectSecurity(): Promise<SecurityInspectionReport> {
  const [fwResult, proxyResult, portsResult] = await Promise.all([
    executePowerShellJson<any>('get-firewall-status'),
    executePowerShellJson<any>('get-proxy-settings'),
    executePowerShellJson<any>('get-listening-ports')
  ])

  // Parse Firewall
  const fwRaw = Array.isArray(fwResult.data) ? fwResult.data : (fwResult.data ? [fwResult.data] : [])
  const firewallProfiles: FirewallProfile[] = fwRaw.map((p: any) => ({
    name: p.Name || 'Unknown',
    enabled: p.Enabled === 1 || p.Enabled === true,
    inboundAction: p.DefaultInboundAction === 0 ? 'Block' : 'Allow',
    outboundAction: p.DefaultOutboundAction === 0 ? 'Allow' : 'Block'
  }))

  // Parse Proxy
  const pRaw = proxyResult.data || {}
  const proxy: ProxyConfig = {
    enabled: pRaw.ProxyEnable === 1,
    server: pRaw.ProxyServer || null,
    autoConfigUrl: pRaw.AutoConfigURL || null
  }

  // Parse Listening Ports
  const portsRaw = Array.isArray(portsResult.data) ? portsResult.data : (portsResult.data ? [portsResult.data] : [])
  const listeningPorts: ListeningPort[] = portsRaw.map((p: any) => ({
    localAddress: p.LocalAddress || '0.0.0.0',
    localPort: p.LocalPort || 0,
    pid: p.PID || 0,
    processName: p.ProcessName || 'System'
  }))

  // Evaluate Risks
  const risks: SecurityRisk[] = []
  let score = 100

  // 1. Check Firewall
  const disabledFw = firewallProfiles.filter(p => !p.enabled)
  if (disabledFw.length > 0) {
    risks.push({
      id: 'firewall-disabled',
      title: `Windows Firewall Disabled on ${disabledFw.map(p => p.name).join(', ')}`,
      severity: 'high',
      description: 'One or more Windows Firewall profiles are inactive. Your computer is vulnerable to unauthorized incoming connections from the local network or internet.',
      recommendation: 'Enable Windows Defender Firewall in Windows Security settings immediately.'
    })
    score -= 30 * disabledFw.length
  }

  // 2. Check Proxy
  if (proxy.enabled) {
    risks.push({
      id: 'active-proxy',
      title: `Active System Proxy: ${proxy.server || 'Custom'}`,
      severity: 'medium',
      description: 'A system-wide HTTP proxy is enabled. All web traffic from apps is routed through this proxy server, which could inspect or tamper with unencrypted data.',
      recommendation: 'Verify that this proxy was configured by you or your network administrator. If unexpected, disable it in Repair Center or Windows Proxy Settings.'
    })
    score -= 15
  }

  // 3. Check Insecure / Risky Ports
  const riskyPorts = [
    { port: 21, name: 'FTP (Cleartext)', sev: 'high' as const },
    { port: 23, name: 'Telnet (Cleartext)', sev: 'high' as const },
    { port: 445, name: 'SMB File Sharing (Port 445)', sev: 'medium' as const }
  ]

  for (const rp of riskyPorts) {
    const found = listeningPorts.find(p => p.localPort === rp.port)
    if (found) {
      risks.push({
        id: `open-port-${rp.port}`,
        title: `Listening Service on ${rp.name}`,
        severity: rp.sev,
        description: `Port ${rp.port} is open and listening via process "${found.processName}" (PID: ${found.pid}). Cleartext or legacy services increase exposure to network scans.`,
        recommendation: `Verify if you require ${found.processName} to listen on port ${rp.port}. If not in use, disable the service.`
      })
      score -= rp.sev === 'high' ? 15 : 10
    }
  }

  if (risks.length === 0) {
    risks.push({
      id: 'all-clear',
      title: 'No Immediate Security Risks Detected',
      severity: 'info',
      description: 'Windows Firewall profiles are active, no suspicious system proxy was detected, and standard network ports are guarded.',
      recommendation: 'Maintain automatic Windows Security updates.'
    })
  }

  return {
    timestamp: new Date().toISOString(),
    firewallProfiles,
    proxy,
    listeningPorts,
    risks,
    overallScore: Math.max(0, Math.min(100, score))
  }
}
