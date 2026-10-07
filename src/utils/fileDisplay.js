/**
 * Shared helpers for showing uploaded file names in the UI:
 * strip the extension and pick a kind for the matching icon.
 */

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'avif'])
const VIDEO_EXT = new Set(['mp4', 'mov', 'webm', 'm4v', 'ogg', 'avi', 'mkv'])
const PDF_EXT = new Set(['pdf'])
const WORD_EXT = new Set(['doc', 'docx', 'odt', 'rtf'])
const EXCEL_EXT = new Set(['xls', 'xlsx', 'csv', 'ods'])
const PPT_EXT = new Set(['ppt', 'pptx', 'odp'])
const ARCHIVE_EXT = new Set(['zip', 'rar', '7z', 'tar', 'gz'])
const TEXT_EXT = new Set(['txt', 'md', 'log', 'json', 'xml', 'html', 'htm'])

/**
 * Basename of a path/URL, without query/hash.
 * @param {string|null|undefined} nameOrPath
 */
export function fileBasename(nameOrPath) {
  if (!nameOrPath || typeof nameOrPath !== 'string') return ''
  const cleaned = nameOrPath.split(/[?#]/)[0].trim()
  if (!cleaned) return ''
  const parts = cleaned.split(/[/\\]/)
  return parts[parts.length - 1] || cleaned
}

/**
 * Display label: filename without extension.
 * @param {string|null|undefined} nameOrPath
 */
export function fileDisplayName(nameOrPath) {
  const base = fileBasename(nameOrPath)
  if (!base) return ''
  return base.replace(/\.[a-zA-Z0-9]+$/, '') || base
}

/**
 * Lowercase extension without the dot.
 * @param {string|null|undefined} nameOrPath
 */
export function fileExtension(nameOrPath) {
  const base = fileBasename(nameOrPath)
  const match = base.match(/\.([a-zA-Z0-9]+)$/)
  return match ? match[1].toLowerCase() : ''
}

/**
 * @returns {'image'|'video'|'pdf'|'word'|'excel'|'powerpoint'|'archive'|'text'|'file'}
 */
export function fileKind(nameOrPath, mimeType) {
  const mime = String(mimeType || '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime === 'application/pdf') return 'pdf'
  if (
    mime.includes('word') ||
    mime === 'application/msword' ||
    mime.includes('opendocument.text')
  ) {
    return 'word'
  }
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime === 'text/csv' ||
    mime.includes('opendocument.spreadsheet')
  ) {
    return 'excel'
  }
  if (
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    mime.includes('opendocument.presentation')
  ) {
    return 'powerpoint'
  }
  if (
    mime.includes('zip') ||
    mime.includes('compressed') ||
    mime.includes('x-rar') ||
    mime.includes('x-7z') ||
    mime.includes('x-tar') ||
    mime.includes('gzip')
  ) {
    return 'archive'
  }
  if (mime.startsWith('text/')) return 'text'

  const ext = fileExtension(nameOrPath)
  if (IMAGE_EXT.has(ext)) return 'image'
  if (VIDEO_EXT.has(ext)) return 'video'
  if (PDF_EXT.has(ext)) return 'pdf'
  if (WORD_EXT.has(ext)) return 'word'
  if (EXCEL_EXT.has(ext)) return 'excel'
  if (PPT_EXT.has(ext)) return 'powerpoint'
  if (ARCHIVE_EXT.has(ext)) return 'archive'
  if (TEXT_EXT.has(ext)) return 'text'

  return 'file'
}
