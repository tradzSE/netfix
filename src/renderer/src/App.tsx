import { useState } from 'react'
import AppLayout from './components/layout/AppLayout'
import NetflixIntro from './components/ui/NetflixIntro'
import Dashboard from './pages/Dashboard'
import NetworkInfo from './pages/NetworkInfo'
import Diagnostics from './pages/Diagnostics'
import Troubleshooter from './pages/Troubleshooter'
import RepairCenter from './pages/RepairCenter'
import WifiAnalyzer from './pages/WifiAnalyzer'
import PerformanceMonitor from './pages/PerformanceMonitor'
import IpDnsUtils from './pages/IpDnsUtils'
import SecurityInspection from './pages/SecurityInspection'
import DiagnosticHistory from './pages/DiagnosticHistory'
import Settings from './pages/Settings'

export type PageId =
  | 'dashboard'
  | 'network-info'
  | 'diagnostics'
  | 'troubleshoot'
  | 'repair'
  | 'wifi'
  | 'performance'
  | 'ip-dns'
  | 'security'
  | 'history'
  | 'settings'

function App(): JSX.Element {
  const [activePage, setActivePage] = useState<PageId>('dashboard')
  const [showIntro, setShowIntro] = useState(() => {
    // Show intro on initial launch per session
    return !sessionStorage.getItem('netfix_intro_completed')
  })

  const handleIntroComplete = () => {
    sessionStorage.setItem('netfix_intro_completed', 'true')
    setShowIntro(false)
  }

  const handleReplayIntro = () => {
    setShowIntro(true)
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onNavigate={setActivePage} />
      case 'network-info':
        return <NetworkInfo />
      case 'diagnostics':
        return <Diagnostics />
      case 'troubleshoot':
        return <Troubleshooter onNavigate={setActivePage} />
      case 'repair':
        return <RepairCenter />
      case 'wifi':
        return <WifiAnalyzer />
      case 'performance':
        return <PerformanceMonitor />
      case 'ip-dns':
        return <IpDnsUtils />
      case 'security':
        return <SecurityInspection />
      case 'history':
        return <DiagnosticHistory />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard onNavigate={setActivePage} />
    }
  }

  return (
    <>
      {showIntro && <NetflixIntro onComplete={handleIntroComplete} />}
      <AppLayout activePage={activePage} onNavigate={setActivePage} onReplayIntro={handleReplayIntro}>
        {renderPage()}
      </AppLayout>
    </>
  )
}

export default App
