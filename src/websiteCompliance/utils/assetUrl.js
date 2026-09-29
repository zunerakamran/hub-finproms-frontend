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
 * Prefer acting white-labelled frontend_url, then hub.frontend_url, then env / window.
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

/**
 * Folder name used on advisor cPanel / hub static hosting.
 * Catalog slug stays "template4"; the shipped package is template4-showcase.
 */
export function resolveTemplateFolderSlug(slug) {
  const safe = String(slug || 'template4').replace(/^\/+|\/+$/g, '') || 'template4'
  if (safe === 'template4' || safe === 'template4showcase') {
    return 'template4-showcase'
  }
  return safe
}

/**
 * Absolute URL for the advisor's live site (open-in-new-tab, sync checks).
 * Site roots like …/advisor2 are used as-is (do not append template4-showcase).
 */
export function resolveAdvisorLiveSiteUrl({
  siteUrl,
  cpanelDomain,
} = {}) {
  const live = String(siteUrl || cpanelDomain || '').trim().replace(/\/$/, '')
  if (!live) return ''

  try {
    const withProtocol = /^https?:\/\//i.test(live) ? live : `https://${live}`
    const url = new URL(withProtocol)
    const path = url.pathname.replace(/\/+$/, '')
    if (path && path !== '/') {
      return `${url.origin}${path}/`
    }
    return `${url.origin}/`
  } catch {
    return `${live}/`
  }
}

/**
 * Hub reverse-proxy URL that loads the advisor's live site without X-Frame-Options.
 * Falls back to hub catalog template when undeployed.
 */
export function resolveAdvisorPreviewUrl({
  siteUrl,
  cpanelDomain,
  templateRequestId = null,
  templateSlug = 'template4',
  hub,
  actingHub,
} = {}) {
  const live = String(siteUrl || cpanelDomain || '').trim()
  const id = Number(templateRequestId) > 0 ? Number(templateRequestId) : 0

  // Prefer embed proxy whenever we have a deployment id + live site URL.
  // Direct iframe of advisers.fin-proms.com is blocked (X-Frame-Options: SAMEORIGIN).
  if (id > 0 && live && API_BASE) {
    return `${API_BASE}/embed-site/${id}/`
  }

  // Legacy: try live URL only if no deployment id (will still fail if XFO is set).
  if (live) {
    return resolveAdvisorLiveSiteUrl({ siteUrl, cpanelDomain })
  }

  const hubFolderSlug =
    String(templateSlug || 'template4').replace(/^\/+|\/+$/g, '') || 'template4'

  return defaultTemplatePreviewUrl(
    hubFolderSlug,
    resolveHubPreviewBase({ hub, actingHub })
  )
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
