/**
 * Normalize firm payload from API (nested compliance_visibility or raw columns).
 */
export function normalizeSubmitterFirm(firm) {
  if (!firm?.id) return null
  const vis = firm.compliance_visibility || {}

  const visibleToOwn =
    vis.visible_to_own != null
      ? Boolean(vis.visible_to_own)
      : Boolean(firm.compliance_visible_to_own)

  const visibleToCentral =
    vis.visible_to_central != null
      ? Boolean(vis.visible_to_central)
      : Boolean(firm.compliance_visible_to_central)

  const legacyPeerId =
    vis.visible_to_firm_id != null
      ? Number(vis.visible_to_firm_id)
      : firm.compliance_visible_to_firm_id != null
        ? Number(firm.compliance_visible_to_firm_id)
        : null

  let authorityFirmIds = Array.isArray(vis.authority_firm_ids)
    ? vis.authority_firm_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    : null

  if (!authorityFirmIds) {
    authorityFirmIds = []
    if (legacyPeerId != null && Number.isFinite(legacyPeerId)) {
      authorityFirmIds.push(legacyPeerId)
    }
  }

  return {
    id: Number(firm.id),
    name: firm.name,
    is_central: Boolean(firm.is_central),
    compliance_visibility: {
      visible_to_own: visibleToOwn,
      authority_firm_ids: authorityFirmIds,
      authority_firms: Array.isArray(vis.authority_firms) ? vis.authority_firms : [],
      visible_to_central: visibleToCentral,
      visible_to_firm_id:
        legacyPeerId != null && Number.isFinite(legacyPeerId) ? legacyPeerId : null,
    },
  }
}

const NETWORK_HUB_WIDE_ROLES = [
  'network_admin',
  'top_management',
  'auditor',
  'accounts_admin',
  'approver',
]

function reviewerRoleKeys(reviewer) {
  if (Array.isArray(reviewer?.roles) && reviewer.roles.length) {
    return reviewer.roles.map((r) => String(r))
  }
  return [String(reviewer?.role || '')]
}

function reviewerBypassesFirmScope(reviewer) {
  const roles = reviewerRoleKeys(reviewer)
  if (roles.includes('power_admin') || roles.includes('finproms_admin')) {
    return true
  }
  const isCentral = Boolean(reviewer?.firm?.is_central)
  if (!isCentral) return false
  return roles.some((r) => NETWORK_HUB_WIDE_ROLES.includes(r))
}

/**
 * Filter assignable reviewers by the submitter/editor firm's Delegated compliance access.
 *
 * Eligible:
 * - power_admin / finproms_admin (bypass)
 * - Central / Network oversight roles (network_admin, top_management, auditor,
 *   accounts_admin, approver) — hub-wide bypass
 * - reviewers whose firm is the submitter firm (own) or listed in authority_firm_ids
 * - legacy: visible_to_central / visible_to_firm_id
 */
export function reviewersForSubmitterFirm(reviewers, submitterFirm) {
  const list = Array.isArray(reviewers) ? reviewers : []
  const firm = normalizeSubmitterFirm(submitterFirm)

  return list.filter((reviewer) => {
    if (reviewerBypassesFirmScope(reviewer)) {
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

    const authorityIds = Array.isArray(vis.authority_firm_ids)
      ? vis.authority_firm_ids.map(Number)
      : []

    if (authorityIds.includes(reviewerFirmId)) {
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
