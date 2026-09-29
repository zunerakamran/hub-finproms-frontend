/** Shared display date formats — always DD/MM/YYYY (UK-style). */

const DATE_LOCALE = 'en-GB'

const DATE_OPTS = { day: '2-digit', month: '2-digit', year: 'numeric' }
const TIME_OPTS = { hour: '2-digit', minute: '2-digit', hour12: false }

function toValidDate(value) {
  if (value == null || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

/** DD/MM/YYYY */
export function formatDate(value, fallback = '—') {
  const date = toValidDate(value)
  if (!date) return fallback
  return date.toLocaleDateString(DATE_LOCALE, DATE_OPTS)
}

/** DD/MM/YYYY HH:mm */
export function formatDateTime(value, fallback = '—') {
  const date = toValidDate(value)
  if (!date) return fallback
  const day = date.toLocaleDateString(DATE_LOCALE, DATE_OPTS)
  const time = date.toLocaleTimeString(DATE_LOCALE, TIME_OPTS)
  return `${day} ${time}`
}

/** Time only HH:mm (for same-day list rows). */
export function formatTime(value, fallback = '—') {
  const date = toValidDate(value)
  if (!date) return fallback
  return date.toLocaleTimeString(DATE_LOCALE, TIME_OPTS)
}

/**
 * Best timestamp for when the current compliance status was set.
 * Prefers review/schedule times, then falls back to submission/created.
 */
export function complianceStatusChangedAt(row) {
  if (!row || typeof row !== 'object') return null
  return (
    row.reviewed_at ||
    row.scheduled_at ||
    row.submission_date ||
    row.submitted_at ||
    row.updated_at ||
    row.created_at ||
    null
  )
}
