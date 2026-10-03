/**
 * Normalize firm payload from API (nested compliance_visibility or raw columns).
 */
export function normalizeSubmitterFirm(firm) {
  if (!firm?.id) return null
  const vis = firm.compliance_visibility || {}
  return {
    id: Number(firm.id),
    name: firm.name,
    is_central: Boolean(firm.is_central),
    compliance_visibility: {
      visible_to_own:
        vis.visible_to_own != null
          ? Boolean(vis.visible_to_own)
          : Boolean(firm.compliance_visible_to_own),
      visible_to_central:
        vis.visible_to_central != null
          ? Boolean(vis.visible_to_central)
          : Boolean(firm.compliance_visible_to_central),
      visible_to_firm_id:
        vis.visible_to_firm_id != null
          ? Number(vis.visible_to_firm_id)
          : firm.compliance_visible_to_firm_id != null
            ? Number(firm.compliance_visible_to_firm_id)
            : null,
    },
  }
}

/**
 * Filter assignable reviewers by the submitter/editor firm's compliance visibility.
 *
 * Eligible:
 * - power_admin / finproms_admin (bypass firm scope)
 * - reviewers whose firm matches the submitter firm's own / central / other-firm settings
 *
 * When the submitter has no firm, only bypass roles are shown.
 *
 * @param {Array<{id:number, role?:string, firm_id?:number|null, firm?:{id:number,is_central?:boolean}}>} reviewers
 * @param {{id?:number, compliance_visibility?:{visible_to_own?:boolean, visible_to_central?:boolean, visible_to_firm_id?:number|null}, compliance_visible_to_own?:boolean, compliance_visible_to_central?:boolean, compliance_visible_to_firm_id?:number|null}|null|undefined} submitterFirm
 */
export function reviewersForSubmitterFirm(reviewers, submitterFirm) {
  const list = Array.isArray(reviewers) ? reviewers : []
  const firm = normalizeSubmitterFirm(submitterFirm)

  return list.filter((reviewer) => {
    const role = String(reviewer?.role || '')
    if (role === 'power_admin' || role === 'finproms_admin') {
      return true
    }

    if (!firm?.id) {
      return false
    }

    const reviewerFirmId = reviewer?.firm_id != null ? Number(reviewer.firm_id) : null
    if (reviewerFirmId == null) {
      return false
    }

    const vis = firm.compliance_visibility || {}
    const submitterFirmId = Number(firm.id)

    if (Boolean(vis.visible_to_own) && reviewerFirmId === submitterFirmId) {
      return true
    }

    if (Boolean(vis.visible_to_central) && Boolean(reviewer?.firm?.is_central)) {
      return true
    }

    if (vis.visible_to_firm_id != null && Number(vis.visible_to_firm_id) === reviewerFirmId) {
      return true
    }

    return false
  })
}
