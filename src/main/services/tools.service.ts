import { execFile } from 'child_process'
import { shell } from 'electron'
import { executePowerShell, executePowerShellJson } from './powershell'

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

export interface ActiveConnectionItem {
  LocalAddress: string
  LocalPort: number
  RemoteAddress: string
  RemotePort: number
  State: string
  PID: number
  ProcessName: string
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

export interface ConnectionProfileInfo {
  name: string
  interfaceAlias: string
  interfaceIndex: number
  networkCategory: 'Public' | 'Private' | 'Domain'
  isPublic: boolean
  isInternetConnected: boolean
}

/**
 * 1-Click Captive Portal Auto-Launcher
 * Intercepts or triggers unencrypted HTTP captive portal redirects (neverssl / msftconnecttest)
 * so school, university, hotel, and airport splash authentication pages immediately pop open.
 */
export async function forceCaptivePortal(): Promise<{ openedUrls: string[]; detectedRedirect: string | null }> {
  let detectedRedirect: string | null = null

  try {
    const res = await executePowerShell('detect-captive-portal')
    if (res.success && res.stdout) {
      try {
        const parsed = JSON.parse(res.stdout)
        if (parsed.RedirectTo && typeof parsed.RedirectTo === 'string') {
          detectedRedirect = parsed.RedirectTo
        }
      } catch {
        // fallback
      }
    }
  } catch {
    // continue to open fallback triggers
  }

  const openedUrls: string[] = []

  if (detectedRedirect) {
    shell.openExternal(detectedRedirect)
    openedUrls.push(detectedRedirect)
  } else {
    // Standard unencrypted captive probe targets that bypass HSTS
    const captiveTriggers = [
      'http://neverssl.com',
      'http://www.msftconnecttest.com/redirect'
    ]
    for (const url of captiveTriggers) {
      shell.openExternal(url)
      openedUrls.push(url)
      break // Opening primary is usually sufficient and prevents browser spam
    }
  }

  return { openedUrls, detectedRedirect }
}

/**
 * Fast hop-by-hop traceroute runner with Windows tracert.
 * Parses RTT per hop and detects timeouts, hops, and bottlenecks.
 */
export async function traceRoute(target = '1.1.1.1'): Promise<TraceRouteResult> {
  const sanitized = target.trim().replace(/[^a-zA-Z0-9.-]/g, '') || '1.1.1.1'

  return new Promise((resolve) => {
    // -d: no reverse DNS lookup (much faster)
    // -h 15: maximum 15 hops
    // -w 800: 800ms timeout per probe
    execFile(
      'tracert.exe',
      ['-d', '-h', '15', '-w', '800', sanitized],
      { windowsHide: true, timeout: 25_000 },
      (err, stdout) => {
        const hops: RouteHop[] = []
        const lines = (stdout || '').split(/\r?\n/)

        for (const line of lines) {
          // Format e.g.: "  1     2 ms     1 ms     1 ms  192.168.100.1"
          // or: "  5     *        *        *     Request timed out."
          const match = line.match(/^\s*(\d+)\s+([\d*<]+(?:\s*ms)?)\s+([\d*<]+(?:\s*ms)?)\s+([\d*<]+(?:\s*ms)?)\s+(.+)$/)
          if (match) {
            const hopNum = parseInt(match[1], 10)
            const rawTimes = [match[2], match[3], match[4]]
            const targetStr = match[5].trim()

            const validTimes: number[] = []
            for (const t of rawTimes) {
              if (t.includes('*')) continue
              const clean = t.replace(/[<ms\s]/g, '')
              const num = parseFloat(clean)
              if (!isNaN(num)) validTimes.push(num)
            }

            const isTimeout = targetStr.toLowerCase().includes('timed out') || validTimes.length === 0
            const avgRtt = validTimes.length > 0 ? Math.round((validTimes.reduce((a, b) => a + b, 0) / validTimes.length) * 10) / 10 : null

            let status: 'ok' | 'high_latency' | 'timeout' = 'ok'
            if (isTimeout) {
              status = 'timeout'
            } else if (avgRtt !== null && avgRtt > 90) {
              status = 'high_latency'
            }

            hops.push({
              hop: hopNum,
              rttMs: avgRtt,
              ip: isTimeout ? 'Timed out (*)' : targetStr,
              status,
              isTarget: targetStr === sanitized || targetStr.includes(sanitized)
            })
          }
        }

        resolve({
          target: sanitized,
          hops,
          completed: hops.length > 0 && !err,
          totalHops: hops.length
        })
      }
    )
  })
}

/**
 * Bandwidth & Connection Inspector:
 * Identifies which running processes (browsers, discord, steam, system) are consuming network connections.
 */
export async function getActiveConnections(): Promise<ActiveConnectionsResult> {
  const res = await executePowerShellJson<ActiveConnectionItem[]>('get-active-connections')
  const rawList = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : [])

  const map = new Map<string, ProcessConnectionGroup>()

  for (const conn of rawList) {
    const key = `${conn.ProcessName}-${conn.PID}`
    let group = map.get(key)
    if (!group) {
      group = {
        pid: conn.PID || 0,
        processName: conn.ProcessName || 'Unknown',
        establishedCount: 0,
        listenCount: 0,
        totalCount: 0,
        sampleEndpoints: []
      }
      map.set(key, group)
    }

    group.totalCount++
    if (conn.State === 'Established') {
      group.establishedCount++
    } else if (conn.State === 'Listen') {
      group.listenCount++
    }

    if (conn.RemoteAddress && conn.RemoteAddress !== '0.0.0.0' && conn.RemoteAddress !== '127.0.0.1' && conn.RemoteAddress !== '::') {
      const ep = `${conn.RemoteAddress}:${conn.RemotePort}`
      if (group.sampleEndpoints.length < 3 && !group.sampleEndpoints.includes(ep)) {
        group.sampleEndpoints.push(ep)
      }
    }
  }

  const sorted = Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount)

  return {
    totalConnections: rawList.length,
    processes: sorted
  }
}

/**
 * Active connection profiles inspector (Public vs Private).
 */
export async function getConnectionProfiles(): Promise<ConnectionProfileInfo[]> {
  const res = await executePowerShellJson<any>('get-connection-profiles')
  const raw = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : [])

  return raw.map((p: any) => {
    // 0 = Public, 1 = Private, 2 = Domain
    let category: 'Public' | 'Private' | 'Domain' = 'Public'
    if (p.NetworkCategory === 1 || p.NetworkCategory === 'Private') category = 'Private'
    else if (p.NetworkCategory === 2 || p.NetworkCategory === 'DomainAuthenticated') category = 'Domain'

    return {
      name: p.Name || 'Network',
      interfaceAlias: p.InterfaceAlias || 'Active',
      interfaceIndex: p.InterfaceIndex || 0,
      networkCategory: category,
      isPublic: category === 'Public',
      isInternetConnected: p.IPv4Connectivity === 4 || p.IPv4Connectivity === 'Internet'
    }
  })
}
