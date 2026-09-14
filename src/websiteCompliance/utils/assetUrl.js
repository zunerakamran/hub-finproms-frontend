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

export function defaultTemplatePreviewUrl(slug) {
  if (!slug) return ''
  const host = String(WC_TEMPLATE_PREVIEW_BASE || 'https://epatronus.space').replace(/\/$/, '')
  return `${host}/${String(slug).replace(/^\/+|\/+$/g, '')}/`
}

export { API_BASE, WC_TEMPLATE_PREVIEW_BASE, WEBSITE_COMPLIANCE_API_BASE }
