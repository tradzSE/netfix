/**
 * NETFIX Troubleshooter — Rules-based diagnostic engine.
 *
 * Correlates test results to identify probable connectivity issues,
 * generate explanations, severity levels, and recommended actions.
 */

export type Severity = 'critical' | 'warning' | 'info' | 'ok'

export interface Diagnosis {
  id: string
  title: string
  severity: Severity
  explanation: string
  recommendation: string
  affectedTests: string[]
}

interface TestResultMap {
  [testId: string]: {
    status: string
    data: any
    error: string | null
  }
}

export function analyzeDiagnostics(results: TestResultMap): Diagnosis[] {
  const diagnoses: Diagnosis[] = []

  const gateway = results['gateway']
  const dns = results['dns']
  const internet = results['internet']
  const https = results['https']
  const packetLoss = results['packet-loss']
  const captive = results['captive-portal']

  // ── Rule 1: No gateway → local network issue ─────────────────────
  if (gateway?.status === 'fail') {
    if (!gateway.data?.Target) {
      diagnoses.push({
        id: 'no-gateway',
        title: 'No Default Gateway Configured',
        severity: 'critical',
        explanation: 'Your network adapter does not have a default gateway configured. This means your computer cannot route traffic to the internet.',
        recommendation: 'Check if your network cable is connected or if Wi-Fi is connected to a network. Try running "Renew DHCP Lease" in the Repair Center.',
        affectedTests: ['gateway', 'internet', 'https']
      })
    } else {
      diagnoses.push({
        id: 'gateway-unreachable',
        title: 'Gateway Unreachable',
        severity: 'critical',
        explanation: `Cannot reach your default gateway (${gateway.data.Target}). Your router or access point may be down, or there is a physical connectivity issue.`,
        recommendation: 'Restart your router/modem. Check physical cable connections. If on Wi-Fi, try disconnecting and reconnecting. Try "Restart Network Adapter" in the Repair Center.',
        affectedTests: ['gateway']
      })
    }
  }

  // ── Rule 2: Gateway OK but no internet → ISP or routing issue ────
  if (gateway?.status === 'pass' && internet?.status === 'fail') {
    diagnoses.push({
      id: 'no-internet',
      title: 'Local Network OK, No Internet Access',
      severity: 'critical',
      explanation: 'Your router is reachable but external IP addresses cannot be reached. This typically indicates an ISP issue, a router configuration problem, or the WAN link is down.',
      recommendation: 'Restart your router/modem and wait 2 minutes. Check your ISP status page. If the problem persists, contact your ISP.',
      affectedTests: ['internet', 'https']
    })
  }

  // ── Rule 3: Internet OK but DNS fails → DNS configuration issue ──
  if (internet?.status === 'pass' && dns?.status === 'fail') {
    diagnoses.push({
      id: 'dns-failure',
      title: 'DNS Resolution Failing',
      severity: 'critical',
      explanation: 'Your internet connection works (IP addresses are reachable), but domain names cannot be resolved. Your DNS server may be down or misconfigured.',
      recommendation: 'Try flushing your DNS cache. Consider switching to a public DNS server like Cloudflare (1.1.1.1) or Google (8.8.8.8) in the Repair Center.',
      affectedTests: ['dns', 'https']
    })
  }

  // ── Rule 4: DNS partial failure → intermittent DNS ───────────────
  if (dns?.status === 'warn') {
    diagnoses.push({
      id: 'dns-partial',
      title: 'Partial DNS Resolution Failure',
      severity: 'warning',
      explanation: 'Some DNS queries are failing while others succeed. Your DNS server may be overloaded or experiencing issues.',
      recommendation: 'Try flushing your DNS cache. If this persists, consider using a different DNS provider.',
      affectedTests: ['dns']
    })
  }

  // ── Rule 5: HTTPS fails but internet works → TLS/proxy issue ─────
  if (internet?.status === 'pass' && dns?.status === 'pass' && https?.status === 'fail') {
    diagnoses.push({
      id: 'https-failure',
      title: 'HTTPS Connections Failing',
      severity: 'critical',
      explanation: 'DNS and ICMP connectivity work, but HTTPS connections are failing. This may indicate a proxy misconfiguration, firewall blocking port 443, or a TLS issue.',
      recommendation: 'Check your proxy settings. Verify that your system clock is accurate (TLS requires correct time). Check if antivirus/firewall is blocking connections.',
      affectedTests: ['https']
    })
  }

  // ── Rule 6: High packet loss → unstable connection ───────────────
  if (packetLoss?.status === 'fail' || packetLoss?.status === 'warn') {
    const loss = packetLoss?.data?.LossPercent ?? 0
    const jitter = packetLoss?.data?.Jitter ?? 0

    if (loss > 10) {
      diagnoses.push({
        id: 'high-packet-loss',
        title: `High Packet Loss (${loss}%)`,
        severity: loss > 25 ? 'critical' : 'warning',
        explanation: `${loss}% of packets are being lost. This will cause slow page loads, dropped connections, and poor video/voice call quality.`,
        recommendation: 'If on Wi-Fi, try moving closer to the router or switching to a less congested channel. If on Ethernet, check cable connections. High packet loss may also indicate ISP issues.',
        affectedTests: ['packet-loss']
      })
    }

    if (jitter > 20) {
      diagnoses.push({
        id: 'high-jitter',
        title: `High Latency Jitter (${jitter}ms)`,
        severity: jitter > 50 ? 'critical' : 'warning',
        explanation: `Network jitter is ${jitter}ms. High jitter causes issues with real-time applications like video calls, gaming, and VoIP.`,
        recommendation: 'Reduce network congestion by closing bandwidth-heavy applications. If on Wi-Fi, consider switching to a wired connection.',
        affectedTests: ['packet-loss']
      })
    }
  }

  // ── Rule 7: Captive portal detected ──────────────────────────────
  if (captive?.status === 'fail') {
    diagnoses.push({
      id: 'captive-portal',
      title: 'Captive Portal Detected',
      severity: 'warning',
      explanation: 'This network requires sign-in through a web portal (common in hotels, airports, and public Wi-Fi). Internet access is blocked until you complete the sign-in process.',
      recommendation: 'Open a web browser and navigate to any HTTP website. You should be redirected to the sign-in page. Complete the sign-in process to gain internet access.',
      affectedTests: ['captive-portal']
    })
  }

  // ── Rule 8: Everything passes → all good ─────────────────────────
  if (diagnoses.length === 0) {
    diagnoses.push({
      id: 'all-clear',
      title: 'Network Connectivity is Healthy',
      severity: 'ok',
      explanation: 'All diagnostic tests passed. Your network connection appears to be working correctly.',
      recommendation: 'No action needed. If you are experiencing issues, try running the diagnostics again or check specific application settings.',
      affectedTests: []
    })
  }

  // Sort by severity
  const severityOrder: Record<Severity, number> = { critical: 0, warning: 1, info: 2, ok: 3 }
  diagnoses.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return diagnoses
}
