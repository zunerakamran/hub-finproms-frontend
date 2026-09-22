import { useState, useEffect, useRef, useMemo } from 'react'
import { useHub } from '../../context/HubContext'
import {
  resolveAdvisorLiveSiteUrl,
  resolveAdvisorPreviewUrl,
} from '../utils/assetUrl'

function normalizeName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Renders the advisor's live website section inside an iframe.
 * Uses the hub embed proxy so X-Frame-Options on the advisor host cannot block it.
 * Colours always come from the live advisor api.php (not hub/showcase TemplateRequest).
 */
export default function SectionIframePreview({
  sectionName,
  data,
  branding = null,
  templateSlug = 'template4',
  siteUrl = null,
  cpanelDomain = null,
  templateRequestId = null,
  height = 520,
  label,
  borderColor = 'border-gray-300',
}) {
  const { hub, actingHub } = useHub()
  const resolvedSiteUrl =
    siteUrl || branding?.site_url || cpanelDomain || branding?.cpanel_domain || null
  const resolvedRequestId =
    templateRequestId || branding?.template_request_id || null

  const templateBase = useMemo(
    () =>
      resolveAdvisorPreviewUrl({
        siteUrl: resolvedSiteUrl,
        cpanelDomain: cpanelDomain || branding?.cpanel_domain || resolvedSiteUrl,
        templateRequestId: resolvedRequestId,
        templateSlug: templateSlug || branding?.template_name || 'template4',
        hub,
        actingHub,
      }),
    [
      resolvedSiteUrl,
      cpanelDomain,
      resolvedRequestId,
      templateSlug,
      branding,
      hub,
      actingHub,
    ]
  )

  const liveSiteRoot = useMemo(
    () =>
      resolveAdvisorLiveSiteUrl({
        siteUrl: resolvedSiteUrl,
        cpanelDomain: cpanelDomain || branding?.cpanel_domain || resolvedSiteUrl,
      }),
    [resolvedSiteUrl, cpanelDomain, branding]
  )

  const [liveBranding, setLiveBranding] = useState(null)
  const iframeRef = useRef(null)
  const readyRef = useRef(false)
  const latestData = useRef(data)
  const latestBranding = useRef(null)
  const [isLoading, setIsLoading] = useState(true)

  // Always pull colours from the live advisor site when we have a URL.
  // Hub TemplateRequest / showcase defaults are often wrong (e.g. red #C8102E).
  useEffect(() => {
    if (!liveSiteRoot) {
      setLiveBranding(null)
      return undefined
    }

    let cancelled = false
    const apiUrl = `${liveSiteRoot}api.php`

    fetch(apiUrl, { cache: 'no-store', credentials: 'omit' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((payload) => {
        if (cancelled || !payload || typeof payload !== 'object') return
        const primary = payload.primary_color || null
        const secondary = payload.secondary_color || null
        if (!primary && !secondary) {
          setLiveBranding(null)
          return
        }
        // Colours only — skip huge data-URI logos over postMessage.
        setLiveBranding({
          primary_color: primary,
          secondary_color: secondary,
          logo_url: null,
          favicon_url: null,
        })
      })
      .catch(() => {
        if (!cancelled) setLiveBranding(null)
      })

    return () => {
      cancelled = true
    }
  }, [liveSiteRoot])

  const key = normalizeName(sectionName)
  const src = `${templateBase}?section=${encodeURIComponent(key)}`
  // Live advisor colours only. Never apply hub / TemplateRequest / showcase
  // fallbacks — those override the template's own CSS (e.g. hub greens or
  // default navy/red) and make previews look wrong on My requests / review.
  const brandingForPreview = liveBranding

  latestData.current = data
  latestBranding.current = brandingForPreview

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
        ...(brandingPayload ? { branding: brandingPayload } : {}),
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
      send(data, brandingForPreview)
    }
  }, [data, brandingForPreview]) // eslint-disable-line react-hooks/exhaustive-deps

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
              Loading advisor site preview…
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
