import { useEffect, useMemo, useRef, useState } from 'react'
import { useHub } from '../../context/HubContext'
import {
  API_BASE,
  resolveAdvisorLiveSiteUrl,
  resolveAdvisorPreviewUrl,
} from '../utils/assetUrl'
import { getPreviewSlideCount, withPreviewSlide } from '../utils/previewSlides'

function normalizeName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Pass through real branding — never invent hub/showcase colour defaults. */
function normalizeBranding(branding) {
  if (!branding || typeof branding !== 'object') return null
  const primary = branding.primary_color || branding.primaryColor || null
  const secondary = branding.secondary_color || branding.secondaryColor || null
  const logo = branding.logo_url || branding.logoUrl || null
  const whiteLogo = branding.white_logo_url || branding.whiteLogoUrl || null
  const favicon = branding.favicon_url || branding.faviconUrl || null
  if (!primary && !secondary && !logo && !whiteLogo && !favicon) return null
  return {
    primary_color: primary || null,
    secondary_color: secondary || null,
    logo_url: logo || null,
    white_logo_url: whiteLogo || null,
    favicon_url: favicon || null,
  }
}

/**
 * Renders the advisor's live website section inside an iframe.
 * Uses the hub embed proxy so X-Frame-Options on the advisor host cannot block it.
 *
 * For hero/slider sections, injects `preview_slide` and (unless disabled) shows
 * slide tabs so reviewers can see slide 2, 3, etc. — not only the first slide.
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
  /** When set, controls which hero slide the template shows (0-based). */
  previewSlide: previewSlideProp = null,
  onPreviewSlideChange = null,
  /** Show built-in slide tabs when content has multiple slides. Default true. */
  showSlideControls = true,
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
  const [internalSlide, setInternalSlide] = useState(0)

  const deploymentBranding = useMemo(() => normalizeBranding(branding), [branding])

  const slideCount = getPreviewSlideCount(data)
  const hasSlides = slideCount > 1
  const controlled =
    typeof previewSlideProp === 'number'
      ? previewSlideProp
      : typeof data?.preview_slide === 'number'
        ? data.preview_slide
        : null
  const activeSlide = Math.max(
    0,
    Math.min(controlled != null ? controlled : internalSlide, Math.max(0, slideCount - 1))
  )

  const setActiveSlide = (index) => {
    const safe = Math.max(0, Math.min(Number(index) || 0, Math.max(0, slideCount - 1)))
    if (onPreviewSlideChange) onPreviewSlideChange(safe)
    if (previewSlideProp == null) setInternalSlide(safe)
  }

  useEffect(() => {
    if (slideCount <= 0) return
    if (internalSlide >= slideCount) setInternalSlide(0)
  }, [slideCount, internalSlide])

  const previewPayload = useMemo(
    () => (hasSlides ? withPreviewSlide(data, activeSlide) : data),
    [data, hasSlides, activeSlide]
  )

  // Pull live colours via hub embed proxy (avoids CORS) when possible.
  useEffect(() => {
    const proxyApi =
      resolvedRequestId && API_BASE
        ? `${API_BASE}/embed-site/${resolvedRequestId}/api.php`
        : null
    const directApi = liveSiteRoot ? `${liveSiteRoot}api.php` : null
    const apiUrl = proxyApi || directApi

    if (!apiUrl) {
      setLiveBranding(null)
      return undefined
    }

    let cancelled = false

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
        setLiveBranding({
          primary_color: primary,
          secondary_color: secondary,
          logo_url: payload.logo_url || null,
          white_logo_url: payload.white_logo_url || null,
          favicon_url: payload.favicon_url || null,
        })
      })
      .catch(() => {
        if (!cancelled) setLiveBranding(null)
      })

    return () => {
      cancelled = true
    }
  }, [liveSiteRoot, resolvedRequestId])

  const key = normalizeName(sectionName)
  const src = `${templateBase}?section=${encodeURIComponent(key)}`
  // Live site wins; otherwise use saved deployment colours so Submission preview updates.
  const brandingForPreview = liveBranding || deploymentBranding

  latestData.current = previewPayload
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
      send(previewPayload, brandingForPreview)
    }
  }, [previewPayload, brandingForPreview]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleIframeLoad = () => {
    setTimeout(() => setIsLoading(false), 1200)
  }

  const renderSlideControls = showSlideControls && hasSlides

  return (
    <div className="space-y-1">
      {label && (
        <span className="block text-[11px] font-extrabold uppercase tracking-wide text-gray-500">
          {label}
        </span>
      )}

      {renderSlideControls && (
        <div className="flex flex-wrap items-center gap-2 py-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
            Slides
          </span>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: slideCount }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveSlide(i)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                  activeSlide === i
                    ? 'bg-[var(--brand-dark)] text-white border-[var(--brand-dark)]'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Slide {i + 1}
              </button>
            ))}
          </div>
        </div>
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
