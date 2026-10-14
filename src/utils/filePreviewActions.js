import {
  browserCanPreviewFile,
  canAttemptInAppPreview,
  needsOfficeClientPreview,
} from './fileDisplay'
import { api } from '../api/client'

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
 * Fetch a public (or cookie-auth) file URL as a Blob.
 * @param {string} url
 */
export async function fetchBlobFromUrl(url) {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: '*/*' },
  })
  if (!response.ok) {
    throw new Error('Unable to open file')
  }
  const mimeType = response.headers.get('Content-Type') || 'application/octet-stream'
  const blob = await response.blob()
  return { blob, mimeType }
}

/**
 * Build preview modal state from a Blob.
 * @returns {{ url: string|null, blob: Blob|null, mimeType: string, filename: string, mode: string }}
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
    }
  }
  if (native) {
    return {
      url: URL.createObjectURL(blob),
      blob: null,
      mimeType: resolvedMime,
      filename: resolvedName,
      mode: 'native',
    }
  }
  return {
    url: null,
    blob: null,
    mimeType: resolvedMime,
    filename: resolvedName,
    mode: 'unavailable',
  }
}

export function unavailablePreviewState(filename, mimeType) {
  return {
    url: null,
    blob: null,
    mimeType: mimeType || '',
    filename: filename || 'file',
    mode: 'unavailable',
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
  const { blob, mimeType: responseMime } = await fetchBlobFromUrl(url)
  return {
    ...previewStateFromBlob(blob, filename, responseMime || mimeType),
    file,
  }
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
  const { blob } = await fetchBlobFromUrl(url)
  triggerBlobDownload(blob, filename)
}

export function fileRowKey(file) {
  return file?.id ?? file?.file_url ?? file?.image_url ?? file?.original_name ?? 'file'
}
