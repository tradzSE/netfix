import { execFile } from 'child_process'

export interface PingDataPoint {
  seq: number
  timestamp: number
  latency: number | null
  success: boolean
}

export interface MonitorStats {
  target: string
  sent: number
  received: number
  lost: number
  lossPercent: number
  avgLatency: number
  minLatency: number
  maxLatency: number
  jitter: number
  currentLatency: number | null
  history: PingDataPoint[]
  status: 'idle' | 'running' | 'paused'
}

type TickCallback = (stats: MonitorStats) => void

class NetworkMonitorService {
  private target = '1.1.1.1'
  private intervalMs = 1000
  private timer: NodeJS.Timeout | null = null
  private status: 'idle' | 'running' | 'paused' = 'idle'
  private seq = 0
  private sent = 0
  private received = 0
  private latencies: number[] = []
  private history: PingDataPoint[] = []
  private maxHistory = 60
  private callbacks: Set<TickCallback> = new Set()

  public onTick(cb: TickCallback): () => void {
    this.callbacks.add(cb)
    return () => this.callbacks.delete(cb)
  }

  public getStats(): MonitorStats {
    const lost = this.sent - this.received
    const lossPercent = this.sent > 0 ? Math.round((lost / this.sent) * 1000) / 10 : 0
    const avgLatency = this.latencies.length > 0
      ? Math.round((this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length) * 10) / 10
      : 0
    const minLatency = this.latencies.length > 0 ? Math.min(...this.latencies) : 0
    const maxLatency = this.latencies.length > 0 ? Math.max(...this.latencies) : 0

    let jitter = 0
    if (this.latencies.length > 1) {
      let diffSum = 0
      for (let i = 1; i < this.latencies.length; i++) {
        diffSum += Math.abs(this.latencies[i] - this.latencies[i - 1])
      }
      jitter = Math.round((diffSum / (this.latencies.length - 1)) * 10) / 10
    }

    const currentLatency = this.history.length > 0 ? this.history[this.history.length - 1].latency : null

    return {
      target: this.target,
      sent: this.sent,
      received: this.received,
      lost,
      lossPercent,
      avgLatency,
      minLatency,
      maxLatency,
      jitter,
      currentLatency,
      history: [...this.history],
      status: this.status
    }
  }

  public start(target = '1.1.1.1', intervalMs = 1000): MonitorStats {
    if (this.status === 'running') {
      if (this.target === target) return this.getStats()
      this.stop()
    }

    // Basic target sanitization: allow valid IPv4/IPv6 or domain name
    const cleanTarget = target.trim().replace(/[^a-zA-Z0-9.-]/g, '') || '1.1.1.1'
    this.target = cleanTarget
    this.intervalMs = Math.max(500, intervalMs)
    this.status = 'running'
    this.seq = 0
    this.sent = 0
    this.received = 0
    this.latencies = []
    this.history = []

    this.scheduleNext()
    return this.getStats()
  }

  public pause(): MonitorStats {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.status = 'paused'
    this.notify()
    return this.getStats()
  }

  public resume(): MonitorStats {
    if (this.status === 'paused') {
      this.status = 'running'
      this.scheduleNext()
    }
    return this.getStats()
  }

  public stop(): MonitorStats {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.status = 'idle'
    this.notify()
    return this.getStats()
  }

  private scheduleNext() {
    if (this.status !== 'running') return

    this.timer = setTimeout(async () => {
      await this.pingOnce()
      if (this.status === 'running') {
        this.scheduleNext()
      }
    }, this.intervalMs)
  }

  private pingOnce(): Promise<void> {
    return new Promise((resolve) => {
      this.seq++
      this.sent++
      const startTime = Date.now()

      execFile(
        'ping.exe',
        ['-n', '1', '-w', '1000', this.target],
        { windowsHide: true },
        (error, stdout) => {
          let latency: number | null = null
          let success = false

          if (!error && stdout) {
            // Match "time=Xms" or "time<1ms"
            const match = stdout.match(/time(?:=|<)(\d+)ms/i)
            if (match) {
              latency = parseInt(match[1], 10)
              if (stdout.includes('time<1ms')) latency = 0
              success = true
              this.received++
              this.latencies.push(latency)
              if (this.latencies.length > 100) this.latencies.shift()
            }
          }

          const point: PingDataPoint = {
            seq: this.seq,
            timestamp: startTime,
            latency,
            success
          }

          this.history.push(point)
          if (this.history.length > this.maxHistory) {
            this.history.shift()
          }

          this.notify()
          resolve()
        }
      )
    })
  }

  private notify() {
    const stats = this.getStats()
    for (const cb of this.callbacks) {
      try {
        cb(stats)
      } catch {
        // ignore callback error
      }
    }
  }
}

export const monitorService = new NetworkMonitorService()
