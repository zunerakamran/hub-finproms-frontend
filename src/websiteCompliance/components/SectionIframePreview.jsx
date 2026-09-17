import { useState, useEffect, useRef, useMemo } from 'react'
import { useHub } from '../../context/HubContext'
import { resolveAdvisorPreviewUrl } from '../utils/assetUrl'

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
 * Renders a template section inside an iframe on the hub catalog host.
 * Advisor live domains cannot be framed (X-Frame-Options / CSP → "refused to
 * connect"); colours/logo come from branding via postMessage instead.
 */
export default function SectionIframePreview({
  sectionName,
  data,
  branding = null,
  templateSlug = 'template4',
  siteUrl = null, // kept for callers; live URL is not used as iframe src
  cpanelDomain = null,
  height = 520,
  label,
  borderColor = 'border-gray-300',
}) {
  const { hub, actingHub } = useHub()
  const templateBase = useMemo(
    () =>
      resolveAdvisorPreviewUrl({
        templateSlug: templateSlug || branding?.template_name || 'template4',
        hub,
        actingHub,
      }),
    // siteUrl / cpanelDomain intentionally ignored for iframe src
    [templateSlug, branding, hub, actingHub]
  )
  const iframeRef = useRef(null)
  const readyRef = useRef(false)
  const latestData = useRef(data)
  const latestBranding = useRef(normalizeBranding(branding))
  const [isLoading, setIsLoading] = useState(true)

  const key = normalizeName(sectionName)
  const src = `${templateBase}?section=${encodeURIComponent(key)}`
  const normalizedBranding = useMemo(() => normalizeBranding(branding), [branding])

  latestData.current = data
  latestBranding.current = normalizedBranding

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

  useEffect(() => {
    readyRef.current = false
    setIsLoading(true)
  }, [src])

  useEffect(() => {
    const onMessage = (event) => {
      if (event.data?.type !== 'SECTION_PREVIEW_READY') return
      if (event.data?.sectionKey !== key) return

      readyRef.current = true
      setIsLoading(false)
      send(latestData.current, latestBranding.current)
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [key, src]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (readyRef.current) {
      send(data, normalizedBranding)
    }
  }, [data, normalizedBranding]) // eslint-disable-line react-hooks/exhaustive-deps

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
              Loading preview…
            </p>
            <p className="text-[10px] text-gray-400">
              Your edits will appear automatically
            </p>
          </div>
        )}

        <iframe
          ref={iframeRef}
          key={src}
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
