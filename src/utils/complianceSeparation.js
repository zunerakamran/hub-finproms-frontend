import { reviewersForSubmitterFirm } from './firmAssigneeFilter'

/**
 * Separation of duties (§2.7.2) — keep UI aligned with backend
 * ComplianceSeparationService.
 */

export const SOD_MESSAGE =
  'You cannot review or decide on your own request. Another reviewer must handle it.'

/**
 * @param {object|null|undefined} row
 * @param {{ ownerKey?: string, onBehalfKey?: string }} [opts]
 * @returns {number[]}
 */
export function conflictUserIds(row, opts = {}) {
  const ownerKey = opts.ownerKey || 'user_id'
  const onBehalfKey = opts.onBehalfKey || 'on_behalf_by_user_id'
  const ids = []
  const owner = row?.[ownerKey]
  const onBehalf = row?.[onBehalfKey]
  if (owner != null && Number(owner) > 0) ids.push(Number(owner))
  if (onBehalf != null && Number(onBehalf) > 0) ids.push(Number(onBehalf))
  return [...new Set(ids)]
}

/**
 * True when the logged-in user (or acting-as advisor) must not decide on this row.
 *
 * @param {number|string|null|undefined} actorUserId
 * @param {object|null|undefined} row
 * @param {{ ownerKey?: string, onBehalfKey?: string, effectiveAdvisorId?: number|string|null }} [opts]
 */
export function actorIsConflicted(actorUserId, row, opts = {}) {
  const blocked = conflictUserIds(row, opts)
  if (blocked.length === 0) return false

  const candidates = []
  if (actorUserId != null && Number(actorUserId) > 0) {
    candidates.push(Number(actorUserId))
  }
  if (opts.effectiveAdvisorId != null && Number(opts.effectiveAdvisorId) > 0) {
    candidates.push(Number(opts.effectiveAdvisorId))
  }

  return candidates.some((id) => blocked.includes(id))
}

/**
 * @param {Array<{id:number}>} reviewers
 * @param {object|null|undefined} row
 * @param {{ ownerKey?: string, onBehalfKey?: string }} [opts]
 */
export function excludeConflictedReviewers(reviewers, row, opts = {}) {
  const blocked = new Set(conflictUserIds(row, opts))
  if (blocked.size === 0) return Array.isArray(reviewers) ? reviewers : []
  return (Array.isArray(reviewers) ? reviewers : []).filter(
    (r) => !blocked.has(Number(r.id))
  )
}

/**
 * Firm visibility + SoD exclusion for assign dropdowns.
 */
export function assignableReviewers(reviewers, row, submitterFirm, opts = {}) {
  return excludeConflictedReviewers(
    reviewersForSubmitterFirm(reviewers, submitterFirm),
    row,
    opts
  )
}

/**
 * Prefer SoD / assign validation messages from Laravel error bags.
 */
export function apiValidationMessage(err, fallback = 'Request failed.') {
  const errors = err?.data?.errors
  if (errors && typeof errors === 'object') {
    for (const key of [
      'separation_of_duties',
      'assigned_to',
      'approver_id',
      'capability',
      'status',
    ]) {
      const v = errors[key]
      if (Array.isArray(v) && v[0]) return String(v[0])
      if (typeof v === 'string' && v) return v
    }
    const first = Object.values(errors).flat().find(Boolean)
    if (first) return String(first)
  }
  if (err?.data?.message) return String(err.data.message)
  return err?.message || fallback
}
