import { Minus, Square, X, Play } from 'lucide-react'
import logoImg from '../../assets/logo.png'

interface TitleBarProps {
  onReplayIntro?: () => void
}

export default function TitleBar({ onReplayIntro }: TitleBarProps) {
  return (
    <header className="drag-region flex items-center justify-between h-11 px-4 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/[0.05] select-none z-30">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <img
            src={logoImg}
            alt="NETFIX"
            className="h-5 w-auto max-w-[85px] object-contain drop-shadow-[0_0_8px_rgba(229,9,20,0.4)]"
          />
          <span className="text-xs font-black tracking-widest uppercase text-white font-display">
            NETFIX
          </span>
        </div>
        <span className="text-[10px] text-surface-500 font-mono">v0.1.0</span>

        {/* Replay Intro Action */}
        {onReplayIntro && (
          <button
            onClick={onReplayIntro}
            className="no-drag ml-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-surface-400 hover:text-white bg-white/[0.04] hover:bg-[#E50914]/20 hover:border-[#E50914]/40 border border-white/[0.06] transition-all"
            title="Replay Cinematic Welcome Intro"
          >
            <Play size={9} className="text-[#E50914] fill-[#E50914]" />
            <span>Intro</span>
          </button>
        )}
      </div>

      {/* Window Controls */}
      <div className="no-drag flex items-center -mr-2">
        <button
          onClick={() => window.netfix.window.minimize()}
          className="h-11 w-11 flex items-center justify-center text-surface-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          title="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.netfix.window.maximize()}
          className="h-11 w-11 flex items-center justify-center text-surface-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          title="Maximize"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => window.netfix.window.close()}
          className="h-11 w-11 flex items-center justify-center text-surface-400 hover:text-white hover:bg-[#E50914] transition-colors"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  )
}
