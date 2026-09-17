import { websiteComplianceAssetUrl } from '../../api/client'

export function isUploadedAsset(url) {
  return (
    typeof url === 'string' &&
    (url.startsWith('/uploaded-images') ||
      url.includes('/uploaded-images/') ||
      url.includes('/website-compliance/uploaded-images') ||
      url.startsWith('/uploads') ||
      url.includes('/uploads/'))
  )
}

export function absoluteAssetUrl(url) {
  return websiteComplianceAssetUrl(url)
}

export function imageStem(path) {
  if (!path || typeof path !== 'string') return ''
  return path
    .split('/')
    .pop()
    .split('?')[0]
    .replace(/\.[a-zA-Z0-9]+$/, '')
}

export function selectedLocalValue(path, catalog) {
  const stem = imageStem(path)
  return (catalog || []).some((p) => p.value === stem) ? stem : ''
}

export function displayImagePath(url) {
  if (!url || /^data:/i.test(url)) return ''
  return url
}

/**
 * Local /assets/intime/* catalog thumbs are not shipped in hub-finproms-frontend.
 * Prefer upload via websiteComplianceUploadImage; remote https URLs still work.
 */
export function localThumbSrc(path, catalog) {
  const stem = imageStem(path)
  const hit = (catalog || []).find((p) => p.value === stem)
  if (!hit) return ''
  const file = hit.file || `${stem}.jpg`
  const base = import.meta.env.BASE_URL || '/'
  return `${base}assets/intime/${file}`.replace(/([^:]\/)\/+/g, '$1')
}

export function editorPreviewSrc(imagePath, catalog) {
  if (!imagePath) return ''
  if (
    /^(data:|blob:)/i.test(imagePath) ||
    isUploadedAsset(imagePath) ||
    /^https?:/i.test(imagePath)
  ) {
    return absoluteAssetUrl(imagePath)
  }
  return localThumbSrc(imagePath, catalog)
}

export function templateThumbSrc(preset) {
  if (!preset) return ''
  const file = preset.file || `${preset.value}.jpg`
  const base = import.meta.env.BASE_URL || '/'
  return `${base}assets/intime/${file}`.replace(/([^:]\/)\/+/g, '$1')
}
