import type { ReactNode } from 'react'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'
import type { PageId } from '../../App'

interface AppLayoutProps {
  children: ReactNode
  activePage: PageId
  onNavigate: (page: PageId) => void
  onReplayIntro?: () => void
}

export default function AppLayout({ children, activePage, onNavigate, onReplayIntro }: AppLayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b0b0b] text-surface-100 overflow-hidden relative select-none">
      {/* Custom Title Bar */}
      <TitleBar onReplayIntro={onReplayIntro} />

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Categorized Glass Sidebar */}
        <Sidebar activePage={activePage} onNavigate={onNavigate} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-transparent relative">
          <div className="p-7 max-w-7xl mx-auto animate-fade-in relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
