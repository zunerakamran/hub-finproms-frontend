/** Social Media Compliance shared helpers */

export const SMC_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
  'Approved with Feedback',
]

export function smcStatusClass(status) {
  const s = String(status || 'Pending').toLowerCase()
  if (s.includes('approved with')) return 'smc-status smc-status--awf'
  if (s.includes('approved')) return 'smc-status smc-status--ok'
  if (s.includes('reject')) return 'smc-status smc-status--bad'
  return 'smc-status smc-status--pending'
}

export function formatSmcDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

export function inactiveReasonLabel(reason) {
  switch (reason) {
    case 'public_only':
      return 'Public only'
    case 'private_only':
      return 'Private only'
    case 'module_social_media_compliance_off':
      return 'Module off'
    case 'module_general_compliance_off':
      return 'Module off'
    default:
      return 'Inactive'
  }
}

export function inactiveReasonHint(reason) {
  switch (reason) {
    case 'public_only':
      return 'Inactive while the hub is private. Turn on Public subscribe to use this.'
    case 'private_only':
      return 'Inactive while the hub is public. Turn on Private invite-only to use this.'
    case 'module_social_media_compliance_off':
      return 'Inactive while Social Media Compliance module is off. Enable it under Functionalities → Modules.'
    case 'module_general_compliance_off':
      return 'Inactive while General Compliance module is off. Enable it under Functionalities → Modules.'
    default:
      return 'This capability is currently inactive for this hub.'
  }
}

export function inactiveReasonTitle(reason) {
  switch (reason) {
    case 'public_only':
      return 'Public hub only — inactive while this hub is private'
    case 'private_only':
      return 'Private hub only — inactive while this hub is public'
    case 'module_social_media_compliance_off':
      return 'Requires Social Media Compliance module — enable it on the hub checklist'
    case 'module_general_compliance_off':
      return 'Requires General Compliance module — enable it on the hub checklist'
    default:
      return 'Inactive for this hub'
  }
}
