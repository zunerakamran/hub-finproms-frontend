import { useState, useEffect, useRef, useMemo } from 'react'
import { useHub } from '../../context/HubContext'
import { defaultTemplatePreviewUrl, resolveHubPreviewBase } from '../utils/assetUrl'

function normalizeName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeBranding(branding) {
  if (!branding || typeof branding !== 'object') return null
  const primary = branding.primary_color || branding.primaryColor || null
  const secondary = branding.secondary_color || branding.secondaryColor || null
  const logo = branding.logo_url || branding.logoUrl || null
  const favicon = branding.favicon_url || branding.faviconUrl || null
  if (!primary && !secondary && !logo && !favicon) return null
  return {
    primary_color: primary,
    secondary_color: secondary,
    logo_url: logo,
    favicon_url: favicon,
  }
}

/**
 * Renders the real template4 section inside an iframe and keeps it
 * in sync with the dashboard form via a two-step handshake:
 *
 *  1. Iframe React app mounts → sends SECTION_PREVIEW_READY to us
 *  2. We respond immediately with the current section content + advisor branding
 *  3. Every subsequent change to `data` / `branding` is pushed live via postMessage
 *
 * Props
 *  sectionName  – e.g. "About Section", "Hero Slider"
 *  data         – plain object with the section content fields (from form)
 *  branding     – advisor TemplateRequest colours/logo (not hub/showcase defaults)
 *  templateSlug – template folder slug (default "template4")
 *  height       – iframe height in px  (default 520)
 *  label        – optional label shown above the iframe
 *  borderColor  – Tailwind border colour class  (default 'border-gray-300')
 */
export default function SectionIframePreview({
  sectionName,
  data,
  branding = null,
  templateSlug = 'template4',
  height = 520,
  label,
  borderColor = 'border-gray-300',
}) {
  const { hub, actingHub } = useHub()
  const previewBase = resolveHubPreviewBase({ hub, actingHub })
  const templateBase = useMemo(
    () => defaultTemplatePreviewUrl(templateSlug || 'template4', previewBase),
    [previewBase, templateSlug]
  )
  const iframeRef  = useRef(null)
  const readyRef   = useRef(false)   // true once SECTION_PREVIEW_READY received
  const latestData = useRef(data)    // always holds the most-recent data prop
  const latestBranding = useRef(normalizeBranding(branding))
  const [isLoading, setIsLoading] = useState(true)

  const key = normalizeName(sectionName)
  const src = `${templateBase}?section=${encodeURIComponent(key)}`
  const normalizedBranding = useMemo(() => normalizeBranding(branding), [branding])

  // Keep refs in sync so the message handler closure sees fresh values
  latestData.current = data
  latestBranding.current = normalizedBranding

  // ── Send data into the iframe ──────────────────────────────────────────────
  const send = (payload, brandingPayload = latestBranding.current) => {
    if (!payload || !iframeRef.current?.contentWindow) return
    let content = payload
    try {
      content = JSON.parse(JSON.stringify(payload))
    } catch {
      content = payload
    }
    iframeRef.current.contentWindow.postMessage(
      {
        type: 'SECTION_PREVIEW',
        sectionKey: key,
        content,
        branding: brandingPayload || undefined,
      },
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

      // Push whatever data the advisor has entered so far + their site branding
      send(latestData.current, latestBranding.current)
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 2: push every subsequent form-field / branding change ─────────────
  useEffect(() => {
    if (readyRef.current) {
      send(data, normalizedBranding)
    }
  }, [data, normalizedBranding]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fallback: hide loading spinner when iframe DOM load fires ─────────────
  const handleIframeLoad = () => {
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
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10 gap-3">
            <div className="w-9 h-9 rounded-full border-4 border-[var(--brand)] border-t-transparent animate-spin" />
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
        />
      </div>
    </div>
  )
}
