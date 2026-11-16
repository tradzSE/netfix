import dns from 'dns/promises'
import { executePowerShellJson } from './powershell'

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

const BENCHMARK_SERVERS = [
  { id: 'cloudflare', name: 'Cloudflare', server: '1.1.1.1' },
  { id: 'google', name: 'Google DNS', server: '8.8.8.8' },
  { id: 'quad9', name: 'Quad9', server: '9.9.9.9' },
  { id: 'opendns', name: 'OpenDNS', server: '208.67.222.222' },
  { id: 'adguard', name: 'AdGuard', server: '94.140.14.14' }
]

export async function lookupDns(domain: string, recordType = 'A'): Promise<DnsLookupResult> {
  const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const type = recordType.toUpperCase()

  const providerPromises = BENCHMARK_SERVERS.map(async (provider): Promise<DnsBenchmarkProvider> => {
    const resolver = new dns.Resolver()
    resolver.setServers([provider.server])

    const start = Date.now()
    try {
      let records: string[] = []
      switch (type) {
        case 'A': {
          const res = await resolver.resolve4(cleanDomain)
          records = res
          break
        }
        case 'AAAA': {
          const res = await resolver.resolve6(cleanDomain)
          records = res
          break
        }
        case 'MX': {
          const res = await resolver.resolveMx(cleanDomain)
          records = res.map(m => `${m.exchange} (pri: ${m.priority})`)
          break
        }
        case 'TXT': {
          const res = await resolver.resolveTxt(cleanDomain)
          records = res.map(t => t.join(' '))
          break
        }
        case 'NS': {
          const res = await resolver.resolveNs(cleanDomain)
          records = res
          break
        }
        case 'CNAME': {
          const res = await resolver.resolveCname(cleanDomain)
          records = res
          break
        }
        default: {
          const res = await resolver.resolve4(cleanDomain)
          records = res
          break
        }
      }

      const elapsed = Date.now() - start
      return {
        id: provider.id,
        name: provider.name,
        server: provider.server,
        responseTimeMs: elapsed,
        success: true,
        records
      }
    } catch (err) {
      return {
        id: provider.id,
        name: provider.name,
        server: provider.server,
        responseTimeMs: Date.now() - start,
        success: false,
        records: [],
        error: (err as Error).message
      }
    }
  })

  // Also query default system DNS
  const systemPromise = (async (): Promise<DnsBenchmarkProvider> => {
    const start = Date.now()
    try {
      let records: string[] = []
      switch (type) {
        case 'A': records = await dns.resolve4(cleanDomain); break
        case 'AAAA': records = await dns.resolve6(cleanDomain); break
        case 'MX': {
          const res = await dns.resolveMx(cleanDomain)
          records = res.map(m => `${m.exchange} (pri: ${m.priority})`)
          break
        }
        case 'TXT': {
          const res = await dns.resolveTxt(cleanDomain)
          records = res.map(t => t.join(' '))
          break
        }
        case 'NS': records = await dns.resolveNs(cleanDomain); break
        case 'CNAME': records = await dns.resolveCname(cleanDomain); break
        default: records = await dns.resolve4(cleanDomain); break
      }
      return {
        id: 'system',
        name: 'System DNS',
        server: 'Default Gateway/ISP',
        responseTimeMs: Date.now() - start,
        success: true,
        records
      }
    } catch (err) {
      return {
        id: 'system',
        name: 'System DNS',
        server: 'Default Gateway/ISP',
        responseTimeMs: Date.now() - start,
        success: false,
        records: [],
        error: (err as Error).message
      }
    }
  })()

  const allProviders = await Promise.all([systemPromise, ...providerPromises])

  const successful = allProviders.filter(p => p.success)
  successful.sort((a, b) => a.responseTimeMs - b.responseTimeMs)

  return {
    domain: cleanDomain,
    recordType: type,
    providers: allProviders,
    fastestProvider: successful.length > 0 ? successful[0].name : null
  }
}

export async function getPublicIp(): Promise<PublicIpInfo> {
  const providers = [
    'https://api.ipify.org?format=json',
    'https://icanhazip.com'
  ]

  for (const url of providers) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)

      if (res.ok) {
        let ip = ''
        if (url.includes('json')) {
          const data = await res.json() as any
          ip = data.ip?.trim() || ''
        } else {
          ip = (await res.text()).trim()
        }

        if (ip) {
          let hostname: string | null = null
          try {
            const hostnames = await dns.reverse(ip)
            if (hostnames.length > 0) hostname = hostnames[0]
          } catch {
            // Reverse lookup optional
          }

          return { ip, hostname, status: 'success' }
        }
      }
    } catch {
      // try next provider
    }
  }

  return { ip: 'Unavailable', hostname: null, status: 'error', error: 'Could not resolve public IP' }
}

export async function scanLocalNeighbors(): Promise<LocalDevice[]> {
  const result = await executePowerShellJson<any>('get-neighbors')
  if (!result.success || !result.data) return []

  const raw = Array.isArray(result.data) ? result.data : [result.data]
  const devices: LocalDevice[] = []

  for (const item of raw) {
    const ip = item.IPAddress
    const mac = item.LinkLayerAddress
    if (!ip || !mac || mac === 'FF-FF-FF-FF-FF-FF') continue

    devices.push({
      ip,
      mac,
      hostname: null,
      interfaceAlias: item.InterfaceAlias || 'Unknown',
      status: 'Active'
    })
  }

  // Fast reverse hostname resolution in parallel
  await Promise.all(
    devices.map(async (dev) => {
      try {
        const hostnames = await dns.reverse(dev.ip)
        if (hostnames.length > 0) dev.hostname = hostnames[0]
      } catch {
        // Reverse DNS may not exist for local devices
      }
    })
  )

  return devices
}
