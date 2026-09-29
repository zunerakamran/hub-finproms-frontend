/** Social Media / compliance shared helpers */

import { formatDateTime } from './dateFormat'

export const SMC_STATUSES = [
  'Pending',
  'Approved',
  'Approved with Feedback',
  'Rejected',
]

export function smcStatusClass(status) {
  const s = String(status || 'Pending').toLowerCase()
  if (s.includes('approved with')) return 'smc-status smc-status--awf'
  if (s.includes('approved')) return 'smc-status smc-status--ok'
  if (s.includes('reject')) return 'smc-status smc-status--bad'
  return 'smc-status smc-status--pending'
}

export function formatSmcDate(value) {
  return formatDateTime(value)
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
    case 'charge_amount_per_module_off':
      return 'Functionality off'
    case 'central_hub_no_member_catalog':
      return 'Central only'
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
    case 'charge_amount_per_module_off':
      return 'Inactive while “Charge amount per module (one time)” is off. Enable it under Functionalities.'
    case 'central_hub_no_member_catalog':
      return 'Not used on Central Hub Controller (no member catalog / compliance products).'
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
    case 'charge_amount_per_module_off':
      return 'Requires Charge amount per module (one time) — enable it under Functionalities'
    case 'central_hub_no_member_catalog':
      return 'Not applicable on Central Hub Controller'
    default:
      return 'Inactive for this hub'
  }
}
