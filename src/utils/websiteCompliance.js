/** Website Compliance shared helpers */

import {
  DEFAULT_COMPLIANCE_STATUS_LABELS,
  complianceStatusLabel,
  normalizeComplianceStatusKey,
} from './complianceStatusLabels'

export const WC_STATUSES = [
  'pending',
  'under_review',
  'scheduled',
  'approved',
  'rejected',
  'approved_with_feedback',
]

/** Manager override options — matches SMC/GC (Pending / Approved / Rejected / Approved with feedback). */
export const WC_CHANGE_STATUS_OPTIONS = [
  'pending',
  'approved',
  'rejected',
  'approved_with_feedback',
]

export function wcStatusLabel(status, hubOrLabels = null) {
  if (hubOrLabels) {
    return complianceStatusLabel(hubOrLabels, status)
  }
  const key = normalizeComplianceStatusKey(status)
  return DEFAULT_COMPLIANCE_STATUS_LABELS[key] || status || 'Pending'
}

export function wcStatusClass(status) {
  const s = String(status || 'pending').toLowerCase()
  if (s.includes('approved_with') || s.includes('approved with')) return 'wc-status wc-status--awf'
  if (s.includes('approved')) return 'wc-status wc-status--ok'
  if (s.includes('reject')) return 'wc-status wc-status--bad'
  if (s.includes('schedul')) return 'wc-status wc-status--scheduled'
  if (s.includes('under_review') || s.includes('under review')) return 'wc-status wc-status--review'
  return 'wc-status wc-status--pending'
}

export function formatWcDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

export function wcSectionTitle(cr) {
  if (Array.isArray(cr?.section_edits) && cr.section_edits.length) {
    const names = cr.section_edits
      .map((e) => e.section_name || e.display_name)
      .filter(Boolean)
    if (names.length) return names.join(', ')
  }
  return (
    cr?.section?.display_name ||
    cr?.section?.name ||
    (cr?.section_id ? `Section #${cr.section_id}` : 'Website change')
  )
}

export function wcVersionSectionNames(version) {
  const edits = Array.isArray(version?.section_edits) ? version.section_edits : null
  if (edits?.length) {
    return edits.map((e) => e.section_name || e.display_name || `Section #${e.section_id}`)
  }
  try {
    const parsed = JSON.parse(version?.proposed_content || '[]')
    if (Array.isArray(parsed)) {
      return parsed.map((e) => e.section_name || e.display_name || `Section #${e.section_id}`)
    }
  } catch {
    /* ignore */
  }
  return []
}
