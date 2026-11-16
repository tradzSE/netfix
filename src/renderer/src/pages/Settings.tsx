import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Check, RefreshCw, HardDrive, Info, Shield, Play } from 'lucide-react'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function Settings() {
  const [pingTarget, setPingTarget] = useState('1.1.1.1')
  const [dnsTestDomains, setDnsTestDomains] = useState('google.com, cloudflare.com, microsoft.com')
  const [pingInterval, setPingInterval] = useState('1000')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    window.netfix.settings.getAll().then((res) => {
      if (res.success && res.data) {
        const data = res.data as Record<string, string>
        if (data.pingTarget) setPingTarget(data.pingTarget)
        if (data.dnsTestDomains) setDnsTestDomains(data.dnsTestDomains)
        if (data.pingInterval) setPingInterval(data.pingInterval)
      }
    })
  }, [])

  const handleSave = async () => {
    setLoading(true)
    try {
      await Promise.all([
        window.netfix.settings.save('pingTarget', pingTarget),
        window.netfix.settings.save('dnsTestDomains', dnsTestDomains),
        window.netfix.settings.save('pingInterval', pingInterval)
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  const handleResetDefaults = () => {
    setPingTarget('1.1.1.1')
    setDnsTestDomains('google.com, cloudflare.com, microsoft.com')
    setPingInterval('1000')
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Toolkit Settings</h1>
          <p className="text-sm text-surface-500 mt-0.5">Customize diagnostic targets, thresholds &amp; application parameters</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-accent font-semibold flex items-center gap-1 animate-fade-in">
              <Check size={14} /> Saved Successfully
            </span>
          )}
          <Button size="sm" onClick={handleSave} loading={loading}>
            <Save size={13} />
            Save Settings
          </Button>
        </div>
      </div>

      {/* General Diagnostic Targets */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon size={16} className="text-accent" />
            <CardTitle>Diagnostics &amp; Monitoring Parameters</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={handleResetDefaults}>
            <RefreshCw size={12} />
            Reset Defaults
          </Button>
        </CardHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-surface-300 block mb-1">
              Default ICMP Ping / Healthcheck Target:
            </label>
            <input
              type="text"
              value={pingTarget}
              onChange={(e) => setPingTarget(e.target.value)}
              className="w-full bg-surface-950 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-surface-600 focus:outline-none focus:border-accent/40"
              placeholder="e.g. 1.1.1.1 or 8.8.8.8"
            />
            <span className="text-[11px] text-surface-500 mt-1 block">
              Used as the reference external target during diagnostics and performance monitoring.
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-surface-300 block mb-1">
              DNS Diagnostic Verification Domains:
            </label>
            <input
              type="text"
              value={dnsTestDomains}
              onChange={(e) => setDnsTestDomains(e.target.value)}
              className="w-full bg-surface-950 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-surface-600 focus:outline-none focus:border-accent/40"
              placeholder="e.g. google.com, cloudflare.com, microsoft.com"
            />
            <span className="text-[11px] text-surface-500 mt-1 block">
              Comma-separated list of top-level domains tested during DNS health checks.
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-surface-300 block mb-1">
              Performance Monitor Polling Frequency:
            </label>
            <select
              value={pingInterval}
              onChange={(e) => setPingInterval(e.target.value)}
              className="w-full bg-surface-950 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent/40"
            >
              <option value="500">Fast (500 ms)</option>
              <option value="1000">Standard (1,000 ms)</option>
              <option value="2000">Low Overhead (2,000 ms)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Cinematic Netflix Experience */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Play size={16} className="text-[#E50914] fill-[#E50914]" />
            <CardTitle>Branding &amp; Cinematic Experience</CardTitle>
          </div>
        </CardHeader>

        <div className="flex items-center justify-between p-3.5 rounded-lg bg-surface-950/60 border border-white/[0.04]">
          <div>
            <span className="text-xs font-semibold text-white">Cinematic Welcome Intro</span>
            <p className="text-[11px] text-surface-400 mt-0.5">
              Replay the full-screen cinematic Netflix-style &quot;Ta-dum&quot; welcome introduction animation.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              sessionStorage.removeItem('netfix_intro_completed')
              window.location.reload()
            }}
          >
            <Play size={12} className="text-[#E50914] fill-[#E50914]" />
            Replay Intro
          </Button>
        </div>
      </Card>

      {/* System Diagnostics & Platform Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info size={16} className="text-blue-400" />
            <CardTitle>System &amp; Runtime Information</CardTitle>
          </div>
        </CardHeader>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs">
          {[
            ['Application Version', 'NETFIX v0.1.0 (Phase 3 Complete)'],
            ['Target Architecture', 'Windows 11 / Windows 10 (x64)'],
            ['PowerShell Engine', 'PowerShell 5.1+ Native CIM / WMI'],
            ['Elevation Wrapper', 'Standard Windows UAC (Verb RunAs)'],
            ['Local Database', 'SQLite 3 WAL Mode (netfix.db)'],
            ['Renderer Framework', 'React 19 + Tailwind CSS 3.4'],
            ['Command Execution Policy', 'Strict Predefined Allowlist (Zero arbitrary shell)']
          ].map(([label, val]) => (
            <div key={label} className="flex items-center justify-between py-1 border-b border-white/[0.02]">
              <span className="text-surface-500">{label}</span>
              <span className="font-mono text-surface-200">{val}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
