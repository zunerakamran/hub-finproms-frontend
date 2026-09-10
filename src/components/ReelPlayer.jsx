import { useEffect, useRef, useState } from 'react'

/**
 * Autoplaying muted reel preview with a top play/pause badge
 * that marks the item as a reel.
 */
export default function ReelPlayer({ src, title = '', className = '', compact = false }) {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    const el = videoRef.current
    if (!el || !src) return

    el.muted = true
    const attempt = el.play()
    if (attempt?.catch) {
      attempt.catch(() => setPlaying(false))
    } else {
      setPlaying(true)
    }
  }, [src])

  const toggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const el = videoRef.current
    if (!el) return

    if (el.paused) {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
    } else {
      el.pause()
      setPlaying(false)
    }
  }

  return (
    <div className={`reel-player ${compact ? 'is-compact' : ''} ${className}`.trim()}>
      <video
        ref={videoRef}
        src={src}
        title={title}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        type="button"
        className="reel-toggle"
        onClick={toggle}
        aria-label={playing ? 'Pause reel' : 'Play reel'}
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        )}
        <span className="reel-toggle-label">Reel</span>
      </button>
    </div>
  )
}
