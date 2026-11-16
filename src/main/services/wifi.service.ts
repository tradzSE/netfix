import { executePowerShell } from './powershell'

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

export function parseNearbyNetworks(raw: string): NearbyWiFiNetwork[] {
  const networks: NearbyWiFiNetwork[] = []
  if (!raw) return networks

  const lines = raw.split(/\r?\n/)
  let currentNetwork: Partial<NearbyWiFiNetwork> | null = null
  let currentAP: Partial<WiFiAccessPoint> | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Match SSID line, e.g. "SSID 1 : MyNetwork"
    const ssidMatch = line.match(/^\s*SSID\s+\d+\s*:\s*(.*)$/i)
    if (ssidMatch) {
      if (currentNetwork && currentNetwork.ssid !== undefined) {
        if (currentAP && currentAP.bssid) {
          currentNetwork.accessPoints = currentNetwork.accessPoints || []
          currentNetwork.accessPoints.push(currentAP as WiFiAccessPoint)
          currentAP = null
        }
        networks.push(currentNetwork as NearbyWiFiNetwork)
      }
      currentNetwork = {
        ssid: ssidMatch[1].trim() || '(Hidden Network)',
        networkType: 'Infrastructure',
        authentication: 'Unknown',
        encryption: 'Unknown',
        accessPoints: []
      }
      continue
    }

    if (!currentNetwork) continue

    // Match BSSID line, e.g. "    BSSID 1                 : e8:13:6e:90:06:54"
    const bssidMatch = line.match(/^\s*BSSID\s+\d+\s*:\s*([0-9a-fA-F:-]+)/i)
    if (bssidMatch) {
      if (currentAP && currentAP.bssid) {
        currentNetwork.accessPoints = currentNetwork.accessPoints || []
        currentNetwork.accessPoints.push(currentAP as WiFiAccessPoint)
      }
      currentAP = {
        bssid: bssidMatch[1].trim().toLowerCase(),
        signalPercent: 0,
        rssi: -100,
        radioType: 'Unknown',
        band: '2.4 GHz',
        channel: 1,
        channelUtilization: null,
        connectedStations: null
      }
      continue
    }

    // Match key-value lines
    const kvMatch = line.match(/^\s*([^:]+)\s*:\s*(.*)$/)
    if (!kvMatch) continue

    const key = kvMatch[1].trim().toLowerCase()
    const val = kvMatch[2].trim()

    if (currentAP) {
      if (key === 'signal') {
        const sig = parseInt(val) || 0
        currentAP.signalPercent = sig
        currentAP.rssi = Math.round(sig / 2 - 100)
      } else if (key === 'radio type') {
        currentAP.radioType = val
      } else if (key === 'band') {
        currentAP.band = val
      } else if (key === 'channel') {
        currentAP.channel = parseInt(val) || 1
      } else if (key === 'connected stations') {
        currentAP.connectedStations = parseInt(val) || null
      } else if (key === 'channel utilization') {
        const utilMatch = val.match(/(\d+)\s*%/)
        currentAP.channelUtilization = utilMatch ? parseInt(utilMatch[1]) : (parseInt(val) || null)
      }
    } else {
      if (key === 'network type') currentNetwork.networkType = val
      else if (key === 'authentication') currentNetwork.authentication = val
      else if (key === 'encryption') currentNetwork.encryption = val
    }
  }

  // Push last remaining items
  if (currentNetwork && currentNetwork.ssid !== undefined) {
    if (currentAP && currentAP.bssid) {
      currentNetwork.accessPoints = currentNetwork.accessPoints || []
      currentNetwork.accessPoints.push(currentAP as WiFiAccessPoint)
    }
    networks.push(currentNetwork as NearbyWiFiNetwork)
  }

  return networks
}

export function computeChannelScores(networks: NearbyWiFiNetwork[]): {
  channelScores: ChannelScore[]
  best24GhzChannel: number
  best5GhzChannel: number
} {
  const allAPs: WiFiAccessPoint[] = []
  for (const n of networks) {
    if (n.accessPoints) allAPs.push(...n.accessPoints)
  }

  const standard24Channels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  const scores24: ChannelScore[] = standard24Channels.map((ch) => {
    // For 2.4 GHz, non-overlapping channels are 1, 6, 11
    // An AP on channel k interferes with channel ch if |k - ch| < 5
    let penalty = 0
    let count = 0
    let totalSignal = 0

    for (const ap of allAPs) {
      if (ap.band.includes('2.4') || ap.channel <= 14) {
        const dist = Math.abs(ap.channel - ch)
        if (dist < 5) {
          // Weight interference by distance and signal strength
          const overlapFactor = (5 - dist) / 5
          penalty += (ap.signalPercent * overlapFactor)
        }
        if (ap.channel === ch) {
          count++
          totalSignal += ap.signalPercent
        }
      }
    }

    // Only 1, 6, 11 get non-overlapping bonus
    const isPreferred = ch === 1 || ch === 6 || ch === 11
    let rawScore = Math.max(0, 100 - penalty)
    if (!isPreferred) rawScore = Math.floor(rawScore * 0.7)

    return {
      channel: ch,
      band: '2.4 GHz',
      apCount: count,
      averageSignal: count > 0 ? Math.round(totalSignal / count) : 0,
      score: Math.min(100, Math.round(rawScore)),
      recommended: false
    }
  })

  // Pick highest scoring in 2.4 GHz from 1, 6, 11 (or any if empty)
  const best24 = [...scores24]
    .filter(s => s.channel === 1 || s.channel === 6 || s.channel === 11)
    .sort((a, b) => b.score - a.score)[0]?.channel || 1

  for (const s of scores24) {
    if (s.channel === best24) s.recommended = true
  }

  const standard5Channels = [36, 40, 44, 48, 149, 153, 157, 161]
  const scores5: ChannelScore[] = standard5Channels.map((ch) => {
    let count = 0
    let totalSignal = 0
    let penalty = 0

    for (const ap of allAPs) {
      if (ap.band.includes('5') || ap.channel > 14) {
        if (ap.channel === ch) {
          count++
          totalSignal += ap.signalPercent
          penalty += ap.signalPercent
        }
      }
    }

    const rawScore = Math.max(0, 100 - penalty)
    return {
      channel: ch,
      band: '5 GHz',
      apCount: count,
      averageSignal: count > 0 ? Math.round(totalSignal / count) : 0,
      score: Math.min(100, Math.round(rawScore)),
      recommended: false
    }
  })

  const best5 = [...scores5].sort((a, b) => b.score - a.score)[0]?.channel || 36
  for (const s of scores5) {
    if (s.channel === best5) s.recommended = true
  }

  return {
    channelScores: [...scores24, ...scores5],
    best24GhzChannel: best24,
    best5GhzChannel: best5
  }
}

export async function scanWiFiNetworks(): Promise<WiFiAnalysisResult> {
  const result = await executePowerShell('get-wifi-networks')
  const networks = parseNearbyNetworks(result.stdout)
  let totalAPs = 0
  for (const n of networks) totalAPs += n.accessPoints.length

  const { channelScores, best24GhzChannel, best5GhzChannel } = computeChannelScores(networks)

  return {
    networks,
    totalAPs,
    channelScores,
    best24GhzChannel,
    best5GhzChannel
  }
}
