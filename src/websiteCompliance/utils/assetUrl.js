import {
  WC_TEMPLATE_PREVIEW_BASE,
  WEBSITE_COMPLIANCE_API_BASE,
  websiteComplianceAssetUrl,
} from '../../api/client'

const API_BASE = String(WEBSITE_COMPLIANCE_API_BASE || '').replace(/\/$/, '')

export function isUploadedAsset(url) {
  return (
    typeof url === 'string' &&
    (url.startsWith('/uploaded-images') ||
      url.includes('/uploaded-images/') ||
      url.startsWith('/uploads') ||
      url.includes('/uploads/'))
  )
}

export function absoluteAssetUrl(url) {
  return websiteComplianceAssetUrl(url)
}

/**
 * Resolve the live site / template preview host for the current hub.
 * Prefer acting white-label frontend_url, then hub.frontend_url, then env / window.
 */
export function resolveHubPreviewBase({ hub, actingHub } = {}) {
  const candidates = [
    actingHub?.frontend_url,
    hub?.acting_hub?.frontend_url,
    hub?.frontend_url,
    WC_TEMPLATE_PREVIEW_BASE,
    typeof window !== 'undefined' ? window.location.origin : '',
  ]

  for (const candidate of candidates) {
    const value = String(candidate || '').trim()
    if (!value) continue
    // Ignore legacy hard-coded showcase host if still present in env.
    if (/epatronus\.space/i.test(value)) continue
    return value.replace(/\/$/, '')
  }

  return ''
}

export function defaultTemplatePreviewUrl(slug, baseUrl) {
  if (!slug) return ''
  const host = String(baseUrl || resolveHubPreviewBase() || '').replace(/\/$/, '')
  const path = String(slug).replace(/^\/+|\/+$/g, '')
  if (!host) return `/${path}/`
  return `${host}/${path}/`
}

/** Example advisor domain derived from the hub frontend host. */
export function hubDomainPlaceholder(baseUrl, subdomain = 'advisor') {
  const raw = String(baseUrl || resolveHubPreviewBase() || '').trim()
  if (!raw) return `${subdomain}.example.com`
  try {
    const host = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname
    if (host) return `${subdomain}.${host}`
  } catch {
    /* ignore */
  }
  return `${subdomain}.example.com`
}

export { API_BASE, WC_TEMPLATE_PREVIEW_BASE, WEBSITE_COMPLIANCE_API_BASE }
