import {
  browserCanPreviewFile,
  canAttemptInAppPreview,
  needsOfficeClientPreview,
} from './fileDisplay'
import { api } from '../api/client'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const API_ORIGIN = String(API_URL).replace(/\/api\/?$/, '') || ''

/**
 * @param {Blob} blob
 * @param {string} filename
 */
export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'download'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Turn relative /storage paths into an absolute URL on the API host.
 * @param {string} url
 */
export function resolvePublicFileUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw) || raw.startsWith('blob:') || raw.startsWith('data:')) {
    return raw
  }
  if (raw.startsWith('//')) {
    return `${window.location.protocol}${raw}`
  }
  if (raw.startsWith('/')) {
    // Prefer API origin for /storage/... assets served by Laravel.
    const base = API_ORIGIN || window.location.origin
    return `${base.replace(/\/$/, '')}${raw}`
  }
  return raw
}

/**
 * Open a public URL in a new tab (CORS-safe download/open fallback).
 * @param {string} url
 * @param {string} [filename]
 */
export function openPublicFileUrl(url, filename) {
  const href = resolvePublicFileUrl(url)
  if (!href) throw new Error('Missing file URL')
  const a = document.createElement('a')
  a.href = href
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  if (filename) a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * Fetch a public file URL as a Blob.
 * Uses credentials: 'omit' by default — storage/CDN URLs often fail CORS when
 * cookies are included (Access-Control-Allow-Credentials).
 *
 * @param {string} url
 * @param {{ credentials?: RequestCredentials }} [options]
 */
export async function fetchBlobFromUrl(url, options = {}) {
  const href = resolvePublicFileUrl(url)
  const credentials = options.credentials || 'omit'
  let response
  try {
    response = await fetch(href, {
      method: 'GET',
      credentials,
      headers: { Accept: '*/*' },
    })
  } catch (err) {
    const error = new Error(
      err?.message === 'Failed to fetch'
        ? 'Unable to load this file for preview (network or CORS). Try Download instead.'
        : (err?.message || 'Unable to open file')
    )
    error.cause = err
    throw error
  }
  if (!response.ok) {
    throw new Error('Unable to open file')
  }
  const mimeType = response.headers.get('Content-Type') || 'application/octet-stream'
  const blob = await response.blob()
  return { blob, mimeType }
}

/**
 * Build preview modal state from a Blob.
 * @returns {{ url: string|null, blob: Blob|null, mimeType: string, filename: string, mode: string, revokeUrl?: boolean }}
 */
export function previewStateFromBlob(blob, filename, mimeType) {
  const resolvedName = filename || 'file'
  const resolvedMime = mimeType || blob?.type || 'application/octet-stream'
  const office = needsOfficeClientPreview(resolvedName, resolvedMime)
  const native = browserCanPreviewFile(resolvedName, resolvedMime)

  if (office) {
    return {
      url: null,
      blob,
      mimeType: resolvedMime,
      filename: resolvedName,
      mode: 'office',
      revokeUrl: false,
    }
  }
  if (native) {
    return {
      url: URL.createObjectURL(blob),
      blob: null,
      mimeType: resolvedMime,
      filename: resolvedName,
      mode: 'native',
      revokeUrl: true,
    }
  }
  return {
    url: null,
    blob: null,
    mimeType: resolvedMime,
    filename: resolvedName,
    mode: 'unavailable',
    revokeUrl: false,
  }
}

/**
 * Native preview using a public URL (img / video / iframe) — no fetch, no CORS.
 */
export function previewStateFromPublicUrl(url, filename, mimeType) {
  return {
    url: resolvePublicFileUrl(url),
    blob: null,
    mimeType: mimeType || '',
    filename: filename || 'file',
    mode: 'native',
    revokeUrl: false,
  }
}

export function unavailablePreviewState(filename, mimeType) {
  return {
    url: null,
    blob: null,
    mimeType: mimeType || '',
    filename: filename || 'file',
    mode: 'unavailable',
    revokeUrl: false,
  }
}

/**
 * Load preview bytes for GC (auth API) or public file_url.
 *
 * @param {object} file
 * @param {'gc'|'public'} accessMode
 */
export async function loadFileForPreview(file, accessMode = 'gc') {
  const filename = file.original_name || file.name || `file-${file.id || 'preview'}`
  const mimeType = file.mime_type || ''

  if (!canAttemptInAppPreview(filename, mimeType)) {
    return { ...unavailablePreviewState(filename, mimeType), file }
  }

  if (accessMode === 'gc') {
    const { blob, filename: savedName, mimeType: responseMime } =
      await api.generalComplianceFetchFile(file, { download: false })
    return {
      ...previewStateFromBlob(blob, savedName || filename, responseMime || mimeType),
      file,
    }
  }

  const url = file.file_url || file.url || file.image_url
  if (!url) {
    throw new Error('Missing file URL')
  }

  // Images / video / PDF / text: point the modal at the public URL.
  // Avoids CORS failures on /storage (credentialed fetch often breaks).
  if (browserCanPreviewFile(filename, mimeType)) {
    return {
      ...previewStateFromPublicUrl(url, filename, mimeType),
      file,
    }
  }

  // Office docs need bytes for client-side renderers — fetch without cookies.
  if (needsOfficeClientPreview(filename, mimeType)) {
    try {
      const { blob, mimeType: responseMime } = await fetchBlobFromUrl(url, {
        credentials: 'omit',
      })
      return {
        ...previewStateFromBlob(blob, filename, responseMime || mimeType),
        file,
      }
    } catch {
      // Still open the modal with a clear message + Download.
      return { ...unavailablePreviewState(filename, mimeType), file }
    }
  }

  return { ...unavailablePreviewState(filename, mimeType), file }
}

/**
 * Download GC (auth) or public URL file.
 *
 * @param {object} file
 * @param {'gc'|'public'} accessMode
 */
export async function downloadComplianceFile(file, accessMode = 'gc') {
  const filename = file.original_name || file.name || `file-${file.id || 'download'}`

  if (accessMode === 'gc') {
    await api.generalComplianceDownloadFile(file)
    return
  }

  const url = file.file_url || file.url || file.image_url
  if (!url) {
    throw new Error('Missing file URL')
  }

  try {
    const { blob } = await fetchBlobFromUrl(url, { credentials: 'omit' })
    triggerBlobDownload(blob, filename)
  } catch {
    // Cross-origin storage without CORS: open the file URL instead.
    openPublicFileUrl(url, filename)
  }
}

export function fileRowKey(file) {
  return file?.id ?? file?.file_url ?? file?.image_url ?? file?.original_name ?? 'file'
}

/** Only revoke blob: URLs we created — never http(s) public URLs. */
export function revokePreviewUrl(preview) {
  if (preview?.revokeUrl && preview?.url && String(preview.url).startsWith('blob:')) {
    URL.revokeObjectURL(preview.url)
  }
}
