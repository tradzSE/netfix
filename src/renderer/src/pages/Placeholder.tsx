import { Construction } from 'lucide-react'

interface PlaceholderProps {
  pageId: string
}

const PAGE_NAMES: Record<string, string> = {
  troubleshoot: 'Intelligent Troubleshooting',
  repair: 'Network Repair Center',
  wifi: 'Wi-Fi Analyzer',
  performance: 'Network Performance Monitoring',
  'ip-dns': 'IP & DNS Utilities',
  security: 'Network Security Inspection',
  history: 'Diagnostic History',
  settings: 'Settings',
}

export default function Placeholder({ pageId }: PlaceholderProps) {
  const name = PAGE_NAMES[pageId] ?? pageId

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
      <div className="h-16 w-16 rounded-2xl bg-surface-800/50 border border-white/[0.04] flex items-center justify-center mb-4">
        <Construction size={28} className="text-surface-500" />
      </div>
      <h2 className="text-lg font-semibold text-surface-300 mb-1">{name}</h2>
      <p className="text-sm text-surface-500">
        This module is planned for a future release.
      </p>
      <span className="mt-3 px-2.5 py-0.5 text-xs font-medium text-surface-500 border border-white/[0.06] rounded bg-surface-900/40">
        Coming in Phase 2
      </span>
    </div>
  )
}
