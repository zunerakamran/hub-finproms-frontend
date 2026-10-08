export const TAX_STATUSES = ['Pending', 'Approved', 'Rejected']

/** Who can see the queue and approve / reject taxonomy requests. */
export const TAX_REVIEW_ANY = ['taxonomy_request_manage']

export function taxStatusClass(status) {
  const s = String(status || 'Pending').toLowerCase()
  if (s.includes('approved')) return 'gc-status gc-status--ok'
  if (s.includes('reject')) return 'gc-status gc-status--bad'
  return 'gc-status gc-status--pending'
}

export function canReviewTaxTarget(can, _target) {
  return Boolean(can('taxonomy_request_manage'))
}

/**
 * Filter submit targets by hub + module availability.
 * Backend already scopes options; keep a light client-side guard.
 */
export function filterAvailableTaxTargets(targets, { isControlPlane, can }) {
  return (targets || []).filter((item) => {
    const key = item.key
    if (item.central_only && !isControlPlane) return false
    if (key === 'gc_content_type' && !can('module_general_compliance')) return false
    if (key === 'firm_document_category' && !can('firm_documents')) return false
    return true
  })
}
