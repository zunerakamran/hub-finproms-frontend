import { useCallback, useEffect, useRef, useState } from 'react'
import { absoluteAssetUrl, defaultTemplatePreviewUrl } from '../utils/assetUrl'

const IFRAME_WIDTH = 1280
const IFRAME_HEIGHT = 5000

function scrollDurationMs(distancePx) {
  if (distancePx <= 0) return 0
  // ~90px/sec, clamped so short thumbs still feel smooth and tall pages finish.
  return Math.min(14000, Math.max(4500, Math.round(distancePx * 11)))
}

/**
 * Template card preview: screenshot (or live iframe fallback).
 * On hover/focus, smoothly scrolls through the full page preview.
 */
export default function TemplateScrollPreview({
  template,
  className = 'h-36',
  overlay,
}) {
  const name = template?.name || 'Template'
  const slug = template?.slug || ''
  const previewUrl = template?.preview_url || defaultTemplatePreviewUrl(slug)
  const thumbnailUrl = absoluteAssetUrl(template?.thumbnail_url)
  const [iframeFallback, setIframeFallback] = useState(!thumbnailUrl)
  const containerRef = useRef(null)
  const mediaRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [hovered, setHovered] = useState(false)
  const [scrollPx, setScrollPx] = useState(0)

  const useIframe = Boolean(iframeFallback && previewUrl)

  const measureScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const viewport = container.clientHeight
    const width = container.clientWidth
    if (viewport <= 0 || width <= 0) return

    const nextScale = width / IFRAME_WIDTH
    setScale(nextScale)

    if (useIframe) {
      setScrollPx(Math.max(0, IFRAME_HEIGHT * nextScale - viewport))
      return
    }

    const media = mediaRef.current
    if (!media) return
    const mediaHeight = media.offsetHeight || media.getBoundingClientRect().height
    setScrollPx(Math.max(0, mediaHeight - viewport))
  }, [useIframe])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    measureScroll()
    const observer = new ResizeObserver(() => measureScroll())
    observer.observe(el)
    return () => observer.disconnect()
  }, [measureScroll, thumbnailUrl, previewUrl])

  const startScroll = () => {
    measureScroll()
    setHovered(true)
  }

  const stopScroll = () => setHovered(false)

  const duration = scrollDurationMs(scrollPx)
  const translateY = hovered && scrollPx > 0 ? -scrollPx : 0

  return (
    <div
      ref={containerRef}
      className={`wc-template-preview relative overflow-hidden bg-slate-800 ${className}`}
      onMouseEnter={startScroll}
      onMouseLeave={stopScroll}
      onFocus={startScroll}
      onBlur={stopScroll}
      tabIndex={0}
      role="img"
      aria-label={`${name} template preview`}
    >
      {useIframe ? (
        <div
          ref={mediaRef}
          className="wc-template-preview__scroller absolute top-0 left-0 w-full will-change-transform"
          style={{
            height: IFRAME_HEIGHT * scale,
            transform: `translate3d(0, ${translateY}px, 0)`,
            transition: hovered
              ? `transform ${duration}ms linear`
              : 'transform 700ms ease-out',
          }}
        >
          <iframe
            src={previewUrl}
            title={`${name} preview`}
            loading="lazy"
            className="absolute top-0 left-0 border-0 pointer-events-none"
            style={{
              width: IFRAME_WIDTH,
              height: IFRAME_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      ) : thumbnailUrl ? (
        <img
          ref={mediaRef}
          src={thumbnailUrl}
          alt={`${name} preview`}
          className="wc-template-preview__scroller absolute top-0 left-0 w-full min-w-full h-auto max-w-none block will-change-transform"
          style={{
            transform: `translate3d(0, ${translateY}px, 0)`,
            transition: hovered
              ? `transform ${duration}ms linear`
              : 'transform 700ms ease-out',
          }}
          onLoad={measureScroll}
          onError={() => setIframeFallback(true)}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-slate-400 font-mono text-xs text-center p-4">
          <span>No preview available</span>
        </div>
      )}

      {overlay}

      {(useIframe || thumbnailUrl) && scrollPx > 0 && (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-900/50 to-transparent transition-opacity duration-300 ${
            hovered ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {(useIframe || thumbnailUrl) && scrollPx > 0 && !hovered && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
          <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/90">
            Hover to scroll
          </span>
        </div>
      )}
    </div>
  )
}
