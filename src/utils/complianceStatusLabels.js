/** Default compliance status labels (snake_case keys). */
export const DEFAULT_COMPLIANCE_STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  approved_with_feedback: 'Approved with Feedback',
  under_review: 'Under review',
  scheduled: 'Scheduled',
  deployed: 'Deployed',
}

/**
 * Normalize API/DB status strings to snake_case keys.
 * Handles SMC/GC Title Case ("Approved with Feedback") and WC snake_case.
 */
export function normalizeComplianceStatusKey(status) {
  const raw = String(status || '').trim()
  if (!raw) return 'pending'
  return raw
    .toLowerCase()
    .replace(/[\s\-]+/g, '_')
    .replace(/_+/g, '_')
}

/**
 * @param {object|null|undefined} hubOrLabels - hub object with compliance_status_labels, or a labels map
 * @param {string} status
 */
export function complianceStatusLabel(hubOrLabels, status) {
  const key = normalizeComplianceStatusKey(status)
  const map =
    hubOrLabels?.compliance_status_labels ||
    (hubOrLabels && !hubOrLabels.id && !hubOrLabels.checklist ? hubOrLabels : null) ||
    {}
  return map[key] || DEFAULT_COMPLIANCE_STATUS_LABELS[key] || status || 'Pending'
}

/**
 * @param {object|null|undefined} hub
 * @returns {Record<string, string>}
 */
export function complianceStatusLabelsMap(hub) {
  return {
    ...DEFAULT_COMPLIANCE_STATUS_LABELS,
    ...(hub?.compliance_status_labels || {}),
  }
}
