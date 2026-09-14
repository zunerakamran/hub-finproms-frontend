import { useState, useEffect, useRef } from 'react'

function normalizeName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

const TEMPLATE_BASE = 'https://epatronus.space/template4/'

/**
 * Renders the real template4 section inside an iframe and keeps it
 * in sync with the dashboard form via a two-step handshake:
 *
 *  1. Iframe React app mounts → sends SECTION_PREVIEW_READY to us
 *  2. We respond immediately with the current section content data
 *  3. Every subsequent change to `data` is pushed live via postMessage
 *
 * Props
 *  sectionName  – e.g. "About Section", "Hero Slider"
 *  data         – plain object with the section content fields (from form)
 *  height       – iframe height in px  (default 520)
 *  label        – optional label shown above the iframe
 *  borderColor  – Tailwind border colour class  (default 'border-gray-300')
 */
export default function SectionIframePreview({
  sectionName,
  data,
  height = 520,
  label,
  borderColor = 'border-gray-300',
}) {
  const iframeRef  = useRef(null)
  const readyRef   = useRef(false)   // true once SECTION_PREVIEW_READY received
  const latestData = useRef(data)    // always holds the most-recent data prop
  const [isLoading, setIsLoading] = useState(true)

  const key = normalizeName(sectionName)
  const src = `${TEMPLATE_BASE}?section=${encodeURIComponent(key)}`

  // Keep latestData in sync so the message handler closure sees fresh data
  latestData.current = data

  // ── Send data into the iframe ──────────────────────────────────────────────
  const send = (payload) => {
    if (!payload || !iframeRef.current?.contentWindow) return
    let content = payload
    try {
      content = JSON.parse(JSON.stringify(payload))
    } catch {
      content = payload
    }
    iframeRef.current.contentWindow.postMessage(
      { type: 'SECTION_PREVIEW', sectionKey: key, content },
      '*'
    )
  }

  // ── Step 1: listen for SECTION_PREVIEW_READY from the iframe ──────────────
  // When template4's Home.jsx finishes mounting its message listener it fires
  // SECTION_PREVIEW_READY.  We reply immediately with the current form data.
  // This replaces the unreliable fixed-delay setTimeout approach.
  useEffect(() => {
    const onMessage = (event) => {
      if (event.data?.type !== 'SECTION_PREVIEW_READY') return
      if (event.data?.sectionKey !== key) return  // ignore other sections' iframes

      // Mark ready so subsequent data changes are sent directly
      readyRef.current = true
      setIsLoading(false)

      // Push whatever data the advisor has entered so far
      send(latestData.current)
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 2: push every subsequent form-field change into the iframe ────────
  // Runs whenever the `data` prop reference changes (i.e. every keystroke).
  // The latestData ref update above ensures we always send the freshest value.
  useEffect(() => {
    if (readyRef.current) {
      send(data)
    }
    // If not yet ready, the SECTION_PREVIEW_READY handler will pick up
    // latestData.current which already points to the newest data.
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fallback: hide loading spinner when iframe DOM load fires ─────────────
  // In case SECTION_PREVIEW_READY never arrives (non-template4 site, network
  // error, etc.) we still remove the spinner after iframe onLoad.
  const handleIframeLoad = () => {
    // Give React a moment to mount inside the iframe before we hide the overlay.
    // The spinner will also be hidden by the SECTION_PREVIEW_READY handler above.
    setTimeout(() => setIsLoading(false), 1200)
  }

  return (
    <div className="space-y-1">
      {label && (
        <span className="block text-[11px] font-extrabold uppercase tracking-wide text-gray-500">
          {label}
        </span>
      )}

      <div
        className={`relative border-2 ${borderColor} rounded-xl overflow-hidden bg-slate-100`}
        style={{ height: `${height}px` }}
      >
        {/* Loading overlay — shown until iframe signals SECTION_PREVIEW_READY */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10 gap-3">
            <div className="w-9 h-9 rounded-full border-4 border-[#C8102E] border-t-transparent animate-spin" />
            <p className="text-xs font-semibold text-gray-500">
              Loading live template preview…
            </p>
            <p className="text-[10px] text-gray-400">
              Your edits will appear automatically
            </p>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={src}
          onLoad={handleIframeLoad}
          title={`Live preview — ${sectionName}`}
          className="w-full h-full border-none"
          style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.3s ease' }}
          // No sandbox — we trust our own template4 site and need full JS execution
        />
      </div>
    </div>
  )
}
