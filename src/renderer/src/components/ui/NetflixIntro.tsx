import { useEffect, useState, useRef } from 'react'
import introVideo from '../../assets/intro.mp4'

interface NetflixIntroProps {
  onComplete: () => void
}

export default function NetflixIntro({ onComplete }: NetflixIntroProps) {
  const [fading, setFading] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hasFinishedRef = useRef(false)

  const finishIntro = () => {
    if (hasFinishedRef.current) return
    hasFinishedRef.current = true
    setFading(true)
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.pause()
      }
      onComplete()
    }, 450)
  }

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.volume = 1.0
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser policy blocks unmuted autoplay, try muted or await user click
          video.muted = true
          video.play().catch(() => {})
        })
      }
    }

    // Safety timeout: if video fails to report ended after 7 seconds, auto-proceed
    const safetyTimer = setTimeout(() => {
      finishIntro()
    }, 7000)

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        finishIntro()
      }
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      clearTimeout(safetyTimer)
      window.removeEventListener('keydown', handleKey)
      if (videoRef.current) {
        videoRef.current.pause()
      }
    }
  }, [onComplete])

  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (video && video.duration > 0) {
      // Start fade out 0.4s before video finishes for a buttery smooth dissolve
      if (video.currentTime >= video.duration - 0.45) {
        setFading(true)
      }
    }
  }

  return (
    <div
      onClick={finishIntro}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#000000] cursor-pointer overflow-hidden select-none transition-opacity duration-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Cinematic Intro Video */}
      <video
        ref={videoRef}
        src={introVideo}
        playsInline
        autoPlay
        onTimeUpdate={handleTimeUpdate}
        onEnded={finishIntro}
        onError={finishIntro}
        className="w-full h-full object-contain max-h-screen max-w-screen"
      />

      {/* Skip Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          finishIntro()
        }}
        className="absolute bottom-7 right-8 text-xs font-semibold text-surface-400 hover:text-white px-3.5 py-1.5 rounded-lg border border-white/[0.1] hover:border-white/[0.3] bg-surface-950/60 backdrop-blur-md transition-all tracking-wider uppercase z-20"
      >
        Skip Intro (Esc)
      </button>
    </div>
  )
}
