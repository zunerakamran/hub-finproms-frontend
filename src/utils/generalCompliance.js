/** General Compliance shared helpers */

export const GC_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
  'Approved with Feedback',
]

export const GC_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.zip'

export function gcStatusClass(status) {
  const s = String(status || 'Pending').toLowerCase()
  if (s.includes('approved with')) return 'gc-status gc-status--awf'
  if (s.includes('approved')) return 'gc-status gc-status--ok'
  if (s.includes('reject')) return 'gc-status gc-status--bad'
  return 'gc-status gc-status--pending'
}

export function formatGcDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

export function formatGcFileSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
