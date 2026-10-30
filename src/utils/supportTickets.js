import { formatDateTime } from './dateFormat'

export const ST_STATUSES = [
  'Open',
  'In Progress',
  'Waiting on User',
  'Resolved',
  'Closed',
]

export const ST_SCREENSHOT_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.pdf'

/** Screenshots / PDF + short guidance video clips for staff replies. */
export const ST_REPLY_MEDIA_ACCEPT =
  '.jpg,.jpeg,.png,.gif,.webp,.pdf,.mp4,.webm,.mov,.m4v,video/mp4,video/webm,video/quicktime'

export const ST_ETA_PRESETS = [
  { key: '1h', label: 'About 1 hour', hours: 1 },
  { key: '4h', label: 'About 4 hours', hours: 4 },
  { key: '1d', label: 'About 1 day', hours: 24 },
  { key: '2d', label: 'About 2 days', hours: 48 },
  { key: '1w', label: 'About 1 week', hours: 168 },
]

export function stStatusClass(status) {
  const s = String(status || 'Open').toLowerCase()
  if (s.includes('resolved')) return 'gc-status gc-status--ok'
  if (s.includes('closed')) return 'gc-status gc-status--ok'
  if (s.includes('waiting')) return 'gc-status gc-status--awf'
  if (s.includes('progress')) return 'gc-status gc-status--pending'
  return 'gc-status gc-status--pending'
}

export function formatStDate(value) {
  return formatDateTime(value)
}

export function formatStFileSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function appendScreenshots(form, files = []) {
  ;(files || []).slice(0, 8).forEach((file) => {
    if (file) form.append('screenshots[]', file)
  })
}

export function appendReplyAttachments(form, files = []) {
  ;(files || []).slice(0, 8).forEach((file) => {
    if (file) form.append('attachments[]', file)
  })
}
