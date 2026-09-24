/** Social Media / compliance shared helpers */

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
    case 'module_social_media_template_library_off':
    case 'module_social_media_compliance_off':
    case 'module_general_compliance_off':
    case 'module_website_template_library_off':
    case 'module_website_compliance_off':
      return 'Module off'
    default:
      return 'Inactive'
  }
}

export function inactiveReasonHint(reason) {
  switch (reason) {
    case 'public_only':
      return 'Inactive while the hub is white-labelled. Turn on Shared subscribe to use this.'
    case 'private_only':
      return 'Inactive while the hub is shared. Turn on White-labelled invite-only to use this.'
    case 'module_social_media_template_library_off':
      return 'Inactive while Social Media Template Library is off. Enable it under Modules.'
    case 'module_social_media_compliance_off':
      return 'Inactive while Social Media Pre Approval is off. Enable it under Modules.'
    case 'module_general_compliance_off':
      return 'Inactive while Generic Content Pre Approval is off. Enable it under Modules.'
    case 'module_website_template_library_off':
      return 'Inactive while Website Template Library is off. Enable it under Modules.'
    case 'module_website_compliance_off':
      return 'Inactive while Website Content Pre Approval is off. Enable it under Modules.'
    default:
      return 'This capability is currently inactive for this hub.'
  }
}

export function inactiveReasonTitle(reason) {
  switch (reason) {
    case 'public_only':
      return 'Shared hub only — inactive while this hub is white-labelled'
    case 'private_only':
      return 'White-labelled hub only — inactive while this hub is shared'
    case 'module_social_media_template_library_off':
      return 'Requires Social Media Template Library — enable it under Modules'
    case 'module_social_media_compliance_off':
      return 'Requires Social Media Pre Approval Workflow — enable it under Modules'
    case 'module_general_compliance_off':
      return 'Requires Generic Content Pre Approval Workflow — enable it under Modules'
    case 'module_website_template_library_off':
      return 'Requires Website Template Library — enable it under Modules'
    case 'module_website_compliance_off':
      return 'Requires Website Content Pre Approval Workflow — enable it under Modules'
    default:
      return 'Inactive for this hub'
  }
}
