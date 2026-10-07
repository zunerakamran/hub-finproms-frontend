export const TAX_STATUSES = ['Pending', 'Approved', 'Rejected']

export const TAX_REVIEW_ANY = [
  'dashboard_manage_types',
  'dashboard_manage_categories',
  'dashboard_manage_tags',
  'gc_manage_content_types',
  'firm_documents_manage_categories',
]

export const TAX_TARGET_MANAGE_CAPS = {
  content_type: 'dashboard_manage_types',
  category: 'dashboard_manage_categories',
  tag: 'dashboard_manage_tags',
  gc_content_type: 'gc_manage_content_types',
  firm_document_category: 'firm_documents_manage_categories',
}

export function taxStatusClass(status) {
  const s = String(status || 'Pending').toLowerCase()
  if (s.includes('approved')) return 'gc-status gc-status--ok'
  if (s.includes('reject')) return 'gc-status gc-status--bad'
  return 'gc-status gc-status--pending'
}

export function canReviewTaxTarget(can, target) {
  const cap = TAX_TARGET_MANAGE_CAPS[target]
  return Boolean(cap && can(cap))
}

/**
 * Filter submit targets by hub + module availability.
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
