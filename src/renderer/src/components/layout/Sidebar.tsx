import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Network, Activity, Search, Wrench,
  Wifi, BarChart3, Globe, Shield, History, Settings
} from 'lucide-react'
import logoImg from '../../assets/logo.png'
import { cn } from '../../lib/utils'
import type { PageId } from '../../App'

interface SidebarProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
}

interface NavItem {
  id: PageId
  label: string
  icon: typeof LayoutDashboard
}

interface NavCategory {
  title: string
  items: NavItem[]
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
      { id: 'network-info', label: 'Network Info', icon: Network },
    ]
  },
  {
    title: 'Diagnostics & Repair',
    items: [
      { id: 'diagnostics',  label: 'Diagnostics',  icon: Activity },
      { id: 'troubleshoot', label: 'Troubleshoot', icon: Search },
      { id: 'repair',       label: 'Repair Center', icon: Wrench },
    ]
  },
  {
    title: 'Analysis & Tools',
    items: [
      { id: 'wifi',         label: 'Wi-Fi Analyzer', icon: Wifi },
      { id: 'performance',  label: 'Performance',  icon: BarChart3 },
      { id: 'ip-dns',       label: 'IP & DNS',     icon: Globe },
    ]
  },
  {
    title: 'Security & Audit',
    items: [
      { id: 'security',     label: 'Security',     icon: Shield },
      { id: 'history',      label: 'History',      icon: History },
      { id: 'settings',     label: 'Settings',     icon: Settings },
    ]
  }
]

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const [activeConn, setActiveConn] = useState<{ name: string; ip: string; type: string } | null>(null)

  useEffect(() => {
    window.netfix.network.getAll().then((res) => {
      if (res.success && res.data) {
        const data = res.data as any
        const wifi = data.wifiInfo
        const primaryIp = data.ipConfig?.find((c: any) => c.IPv4Gateway)
        const activeAdapter = data.adapters?.find((a: any) => a.Status === 'Up')

        if (wifi?.connected && wifi.ssid) {
          setActiveConn({
            name: wifi.ssid,
            ip: primaryIp?.IPv4Address || 'Connected',
            type: 'Wi-Fi'
          })
        } else if (activeAdapter) {
          setActiveConn({
            name: activeAdapter.Name || 'Ethernet',
            ip: primaryIp?.IPv4Address || 'Connected',
            type: 'LAN'
          })
        } else {
          setActiveConn({
            name: 'Connected Network',
            ip: primaryIp?.IPv4Address || 'Online',
            type: 'Active'
          })
        }
      }
    }).catch(() => {})
  }, [])

  return (
    <aside className="flex flex-col w-60 bg-[#0c0c0c]/90 backdrop-blur-2xl border-r border-white/[0.05] select-none">
      {/* Brand Header with New Logo */}
      <div className="px-4 py-4 border-b border-white/[0.05] flex items-center gap-3">
        <div className="h-9 w-auto flex items-center justify-center">
          <img
            src={logoImg}
            alt="NETFIX Logo"
            className="h-8 w-auto max-w-[105px] object-contain drop-shadow-[0_0_12px_rgba(229,9,20,0.45)]"
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-white tracking-widest uppercase font-display">NETFIX</span>
            <span className="text-[9px] font-mono text-[#E50914] bg-[#E50914]/15 px-1.5 py-0.2 rounded font-bold border border-[#E50914]/30">PRO</span>
          </div>
          <span className="text-[10px] text-surface-400 font-medium tracking-tight">Diagnostics &amp; Repair</span>
        </div>
      </div>

      {/* Categorized Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-4 overflow-y-auto">
        {NAV_CATEGORIES.map((category) => (
          <div key={category.title} className="space-y-1">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-surface-500/80 px-2.5 py-1">
              {category.title}
            </h4>
            <div className="space-y-0.5">
              {category.items.map((item) => {
                const Icon = item.icon
                const isActive = activePage === item.id

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 text-left',
                      isActive
                        ? 'bg-[#E50914]/15 text-[#E50914] font-bold border border-[#E50914]/35 shadow-sm shadow-[#E50914]/15'
                        : 'text-surface-400 hover:text-white hover:bg-white/[0.04] border border-transparent font-medium'
                    )}
                  >
                    <Icon size={15} strokeWidth={isActive ? 2.4 : 1.7} className={cn(isActive ? 'text-[#E50914]' : 'text-surface-400')} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Connected Live Glass Status Card */}
      <div className="p-3 border-t border-white/[0.05]">
        <div className="glass-card rounded-xl p-3 border border-[#E50914]/20 bg-[#E50914]/[0.03] shadow-md shadow-[#E50914]/5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E50914] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E50914]"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">Live Link</span>
            </div>
            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-surface-800 text-surface-300">
              {activeConn?.type || 'Online'}
            </span>
          </div>

          <div className="space-y-0.5">
            <p className="text-xs font-bold text-white truncate">
              {activeConn?.name || 'Searching...'}
            </p>
            <p className="text-[10px] font-mono text-surface-400">
              {activeConn?.ip || 'Connecting'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
