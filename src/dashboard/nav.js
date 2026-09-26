/**
 * Universal dashboard navigation + home cards.
 * Visibility is driven by the Capabilities matrix (hub) and Power Admin checklist (pa_*).
 */

export const GENERAL_DASHBOARD_ANY = [
  'general_show_subscription',
  'general_show_credits',
  'general_show_invoices',
  'general_show_purchases',
]

/** @typedef {{
 *   kind?: 'link' | 'section',
 *   to?: string,
 *   label: string,
 *   title?: string,
 *   description?: string,
 *   end?: boolean,
 *   alsoMatch?: string[],
 *   capability?: string,
 *   anyOf?: string[],
 *   paCapability?: string,
 *   paAnyOf?: string[],
 *   billingOnly?: boolean,
 *   sharedOnly?: boolean,
 *   homeOnly?: boolean,
 *   exceptRoles?: string[],
 *   group?: string,
 * }} DashboardLink */

const SMC_NAV_ANY = [
  'smc_view_own_requests',
  'smc_submit_request',
  'smc_view_all_requests',
  'smc_assign_requests',
  'smc_review_requests',
  'smc_change_request_status',
  'smc_view_reports',
]

const GC_NAV_ANY = [
  'gc_view_own_requests',
  'gc_submit_request',
  'gc_view_all_requests',
  'gc_assign_requests',
  'gc_review_requests',
  'gc_change_request_status',
  'gc_view_reports',
]

const WC_NAV_ANY = [
  'wc_edit_sections',
  'wc_submit_change_requests',
  'wc_assign_change_requests',
  'wc_view_all_change_requests',
  'wc_review_change_requests',
  'wc_change_request_status',
  'wc_request_deployments',
  'wc_assign_website_templates',
  'wc_view_all_deployments',
  'wc_deploy_websites',
  'wc_manage_templates',
  'wc_manage_deployment_sections',
  'wc_publish_live_content',
  'wc_view_activity_logs',
  'wc_view_platform_report',
]

const ACCOUNT_ANY = [
  'general_show_subscription',
  'general_show_credits',
  'general_show_invoices',
  'general_show_purchases',
]

const CONTENT_ANY = [
  'dashboard_manage_posts',
  'dashboard_manage_bundles',
  'dashboard_manage_types',
  'dashboard_manage_categories',
  'dashboard_manage_tags',
]

const HUB_OPS_ANY = [
  'dashboard_manage_plans',
  'dashboard_manage_settings',
  'dashboard_manage_role_display_names',
  'dashboard_manage_compliance_status_display_names',
  'dashboard_manage_email_templates',
  'dashboard_manage_firms',
  'dashboard_bank_transfers',
  'dashboard_view_activity_logs',
  'dashboard_manage_modules',
]

const ADVISOR_ANY = [
  'advisor_excel_import',
  'advisor_discontinue',
  'dashboard_manage_advisor_pricing',
  'dashboard_manage_advisor_renewal',
  'dashboard_manage_subscriber_credits',
  'dashboard_view_advisor_invoices',
]

const PLATFORM_PA_ANY = [
  'pa_manage_payment_methods',
  'pa_manage_users_roles',
  'pa_manage_hubs',
  'pa_manage_hub_checklists',
  'pa_manage_power_capabilities',
]

/** Human-readable group labels for home + nav. */
export const DASHBOARD_GROUPS = {
  account: 'Account',
  content: 'SM Template',
  hub: 'Hub',
  advisors: 'Advisors & billing',
  smc: 'Social Media Compliance',
  gc: 'General Compliance',
  wc: 'Website Compliance',
  platform: 'Platform',
}

/**
 * Resolve a dashboard group / section label for the current hub context.
 * The "Hub" separator becomes Shared hub or White-labelled hub.
 */
export function resolveDashboardGroupLabel(groupOrLabel, { isWhiteLabelHub = false } = {}) {
  const key = groupOrLabel === 'Hub' ? 'hub' : groupOrLabel
  if (key === 'hub') {
    return isWhiteLabelHub ? 'White-labelled hub' : 'Shared hub'
  }
  return DASHBOARD_GROUPS[key] || groupOrLabel
}

/** @type {DashboardLink[]} */
export const DASHBOARD_LINKS = [
  {
    to: '/my-dashboard',
    label: 'Overview',
    end: true,
  },

  // —— Account ——
  {
    kind: 'section',
    label: 'Account',
    anyOf: ACCOUNT_ANY,
  },
  {
    to: '/my-dashboard/subscription',
    label: 'Subscription',
    title: 'Subscription',
    description: 'Your active plan and subscription history for this hub.',
    capability: 'general_show_subscription',
    group: 'account',
  },
  {
    to: '/my-dashboard/credits',
    label: 'Credits',
    title: 'Credits',
    description: 'See your credit balance. Credits are spent when you unlock posts or bundles.',
    capability: 'general_show_credits',
    group: 'account',
  },
  {
    to: '/my-dashboard/invoices',
    label: 'Invoices',
    title: 'Invoices',
    description: 'View receipts for subscriptions and content purchases.',
    capability: 'general_show_invoices',
    group: 'account',
  },
  {
    to: '/my-dashboard/purchases',
    label: 'Purchases',
    title: 'Purchases',
    description: 'Browse content you unlocked with credits.',
    capability: 'general_show_purchases',
    group: 'account',
  },

  // —— SM Template ——
  {
    kind: 'section',
    label: 'SM Template',
    anyOf: CONTENT_ANY,
  },
  {
    to: '/my-dashboard/posts',
    label: 'Posts / reels',
    title: 'Posts / reels',
    description: 'Create and edit catalog posts and reels for the current hub.',
    capability: 'dashboard_manage_posts',
    group: 'content',
  },
  {
    to: '/my-dashboard/bundles',
    label: 'Bundles',
    title: 'Bundles',
    description: 'Group posts/reels into bundles with a total credit price.',
    capability: 'dashboard_manage_bundles',
    group: 'content',
  },
  {
    to: '/my-dashboard/types',
    label: 'Types',
    title: 'Types',
    description: 'Manage content types (post, reel, etc.) for the current hub.',
    capability: 'dashboard_manage_types',
    group: 'content',
  },
  {
    to: '/my-dashboard/categories',
    label: 'Categories',
    title: 'Categories',
    description: 'Manage topical categories used to group catalog content.',
    capability: 'dashboard_manage_categories',
    group: 'content',
  },
  {
    to: '/my-dashboard/tags',
    label: 'Tags',
    title: 'Tags',
    description: 'Manage free-form tags for filtering posts and reels.',
    capability: 'dashboard_manage_tags',
    group: 'content',
  },

  // —— Hub ——
  {
    kind: 'section',
    label: 'Hub',
    anyOf: [...HUB_OPS_ANY],
  },
  {
    to: '/my-dashboard/firms',
    label: 'Firms',
    title: 'Firms',
    description:
      'Manage firms, rename Central / Network, and set who can review and report on each firm’s compliance requests.',
    capability: 'dashboard_manage_firms',
    group: 'hub',
  },
  {
    to: '/my-dashboard/plans',
    label: 'Subscriptions',
    title: 'Subscriptions',
    description: 'Create and edit credit packages for shared hub self-serve subscriptions.',
    capability: 'dashboard_manage_plans',
    group: 'hub',
  },
  {
    to: '/my-dashboard/settings',
    label: 'Settings',
    title: 'Settings',
    description: 'Configure branding, NEW banner duration, and other hub options.',
    capability: 'dashboard_manage_settings',
    group: 'hub',
  },
  {
    to: '/my-dashboard/role-display-names',
    label: 'User role title',
    title: 'User role title',
    description: 'Customize how role names appear across this hub’s UI.',
    capability: 'dashboard_manage_role_display_names',
    group: 'hub',
  },
  {
    to: '/my-dashboard/compliance-status-display-names',
    label: 'Workflows status title',
    title: 'Workflows status title',
    description: 'Customize Pending / Approved / Rejected wording across compliance modules.',
    capability: 'dashboard_manage_compliance_status_display_names',
    group: 'hub',
  },
  {
    to: '/my-dashboard/email-templates',
    label: 'Email templates',
    title: 'Email templates',
    description: 'Edit subject and body copy for user and admin transactional emails.',
    capability: 'dashboard_manage_email_templates',
    group: 'hub',
  },
  {
    to: '/my-dashboard/bank-transfers',
    label: 'Bank transfers',
    title: 'Bank transfers',
    description: 'Confirm pending bank payments and grant credits.',
    capability: 'dashboard_bank_transfers',
    group: 'hub',
  },
  {
    to: '/my-dashboard/activity-logs',
    label: 'Activity logs',
    title: 'Activity logs',
    description: 'Audit trail and activity report for the current hub.',
    capability: 'dashboard_view_activity_logs',
    group: 'hub',
  },
  {
    to: '/my-dashboard/modules',
    label: 'Modules',
    title: 'Modules',
    description: 'Enable product modules (White Label, template libraries, and pre-approval workflows) for the current hub.',
    capability: 'dashboard_manage_modules',
    group: 'hub',
  },

  // —— Advisors & billing ——
  {
    kind: 'section',
    label: 'Advisors & billing',
    anyOf: ADVISOR_ANY,
    // Also show when billing card is available (billingOnly link has no capability).
  },
  {
    to: '/my-dashboard/advisors',
    label: 'Import Users',
    title: 'Import Users',
    description: 'Import and/or discontinue advisors for the current hub.',
    anyOf: ['advisor_excel_import', 'advisor_discontinue'],
    group: 'advisors',
  },
  {
    to: '/my-dashboard/payment-card',
    label: 'Payment card',
    title: 'Payment card',
    description: 'Enter or update the card charged when importing advisors (Stripe).',
    billingOnly: true,
    group: 'advisors',
  },
  {
    to: '/my-dashboard/advisor-pricing',
    label: 'Advisor rates',
    title: 'Advisor rates',
    description: 'Set rate-per-advisor tiers used for white-labelled hub billing.',
    capability: 'dashboard_manage_advisor_pricing',
    group: 'advisors',
  },
  {
    to: '/my-dashboard/advisor-renewal',
    label: 'Renewal day',
    title: 'Advisor renewal day',
    description: 'Set the monthly day the client admin card is charged for advisor seats.',
    capability: 'dashboard_manage_advisor_renewal',
    group: 'advisors',
  },
  {
    to: '/my-dashboard/subscriber-credits',
    label: 'Subscriber credits',
    title: 'Subscriber credits',
    description: 'Set unlimited or fixed credits for white-labelled hub Excel subscribers.',
    capability: 'dashboard_manage_subscriber_credits',
    group: 'advisors',
  },
  {
    to: '/my-dashboard/advisor-invoices',
    label: 'Advisor invoices',
    title: 'Advisor invoices',
    description: 'View invoices for advisor subscriber billing on this hub.',
    capability: 'dashboard_view_advisor_invoices',
    group: 'advisors',
  },

  // —— Social Media Compliance ——
  {
    kind: 'section',
    label: 'Social Media Compliance',
    anyOf: SMC_NAV_ANY,
  },
  {
    to: '/my-dashboard/social-media-compliance',
    label: 'My requests',
    title: 'My requests',
    description: 'View and track social media pre-approval requests you submitted.',
    anyOf: ['smc_view_own_requests', 'smc_submit_request'],
    end: true,
    group: 'smc',
  },
  {
    to: '/my-dashboard/social-media-compliance/new',
    label: 'New request',
    title: 'New request',
    description: 'Submit an image or video for social media pre-approval review.',
    capability: 'smc_submit_request',
    group: 'smc',
  },
  {
    to: '/my-dashboard/social-media-compliance/queue',
    label: 'All requests',
    title: 'All requests',
    description: 'Assign and review social media pre-approval requests for this hub.',
    anyOf: ['smc_view_all_requests', 'smc_assign_requests', 'smc_review_requests', 'smc_change_request_status'],
    group: 'smc',
  },
  {
    to: '/my-dashboard/social-media-compliance/reports',
    label: 'Reports',
    title: 'Reports',
    description: 'Social media pre-approval reports, CSV export, and charts.',
    capability: 'smc_view_reports',
    group: 'smc',
  },

  // —— General Compliance ——
  {
    kind: 'section',
    label: 'General Compliance',
    anyOf: GC_NAV_ANY,
  },
  {
    to: '/my-dashboard/general-compliance',
    label: 'My requests',
    title: 'My requests',
    description: 'View and track generic content pre-approval requests you submitted.',
    anyOf: ['gc_view_own_requests', 'gc_submit_request'],
    end: true,
    group: 'gc',
  },
  {
    to: '/my-dashboard/general-compliance/new',
    label: 'New request',
    title: 'New request',
    description: 'Submit a description and file attachments for generic content pre-approval.',
    capability: 'gc_submit_request',
    group: 'gc',
  },
  {
    to: '/my-dashboard/general-compliance/queue',
    label: 'All requests',
    title: 'All requests',
    description: 'Assign and review generic content pre-approval requests for this hub.',
    anyOf: ['gc_view_all_requests', 'gc_assign_requests', 'gc_review_requests', 'gc_change_request_status'],
    group: 'gc',
  },
  {
    to: '/my-dashboard/general-compliance/reports',
    label: 'Reports',
    title: 'Reports',
    description: 'Generic content pre-approval reports, CSV export, and charts.',
    capability: 'gc_view_reports',
    group: 'gc',
  },

  // —— Website Compliance ——
  {
    kind: 'section',
    label: 'Website Compliance',
    anyOf: WC_NAV_ANY,
  },
  {
    to: '/my-dashboard/website-compliance/request-site',
    label: 'Request a site',
    title: 'Request a site',
    description: 'Browse templates and request a new showcase website.',
    capability: 'wc_request_deployments',
    group: 'wc',
  },
  {
    to: '/my-dashboard/website-compliance/my-sites',
    label: 'My sites',
    title: 'My sites',
    description: 'Track your pending and live showcase sites.',
    anyOf: [
      'wc_edit_sections',
      'wc_submit_change_requests',
      'wc_request_deployments',
    ],
    // Power Admin / FinProms use Publish live content + Site operations instead.
    exceptRoles: ['power_admin', 'finproms_admin'],
    group: 'wc',
  },
  {
    to: '/my-dashboard/website-compliance/content-editor',
    label: 'Content editor',
    title: 'Content editor',
    description: 'Edit website sections and submit changes for review.',
    anyOf: ['wc_edit_sections', 'wc_submit_change_requests'],
    exceptRoles: ['power_admin', 'finproms_admin'],
    group: 'wc',
  },
  {
    to: '/my-dashboard/website-compliance/my-requests',
    label: 'My change requests',
    title: 'My change requests',
    description: 'See your submitted content changes and version history.',
    anyOf: ['wc_submit_change_requests', 'wc_edit_sections'],
    exceptRoles: ['power_admin', 'finproms_admin'],
    // Detail URLs (/my-requests/:id) are opened from queue/history too — do not
    // treat them as this nav item (reviewers / Power Admin would get redirected).
    end: true,
    group: 'wc',
  },
  {
    to: '/my-dashboard/website-compliance/publish-live',
    label: 'Publish live content',
    title: 'Publish live content',
    description: 'Edit and publish live site content without approver review.',
    capability: 'wc_publish_live_content',
    // Detail editor lives at /publish/:deploymentId (not under publish-live/).
    alsoMatch: ['/my-dashboard/website-compliance/publish/'],
    group: 'wc',
  },
  {
    to: '/my-dashboard/website-compliance/deployments',
    label: 'Site operations',
    title: 'Site operations',
    description: 'Staff tools to request sites for advisors, assign editors, and deploy.',
    anyOf: [
      'wc_view_all_deployments',
      'wc_deploy_websites',
      'wc_manage_templates',
      'wc_manage_deployment_sections',
      'wc_assign_website_templates',
    ],
    group: 'wc',
  },
  {
    to: '/my-dashboard/website-compliance/assign',
    label: 'Assign requests',
    title: 'Assign requests',
    description: 'Assign pending website content changes to an approver.',
    capability: 'wc_assign_change_requests',
    group: 'wc',
  },
  {
    to: '/my-dashboard/website-compliance/review',
    label: 'Review queue',
    title: 'Review queue',
    description: 'Approve, reject, or approve with feedback website content changes.',
    capability: 'wc_review_change_requests',
    group: 'wc',
  },
  {
    to: '/my-dashboard/website-compliance/history',
    label: 'Request history',
    title: 'Request history',
    description: 'Browse completed and in-progress website content reviews.',
    anyOf: [
      'wc_assign_change_requests',
      'wc_review_change_requests',
      'wc_view_all_change_requests',
      'wc_change_request_status',
    ],
    group: 'wc',
  },
  {
    to: '/my-dashboard/website-compliance/reports',
    label: 'Reports',
    title: 'Reports',
    description: 'Website summary for templates, deployments, and content change requests.',
    capability: 'wc_view_platform_report',
    group: 'wc',
  },

  // —— Platform (Power Admin) ——
  {
    kind: 'section',
    label: 'Platform',
    paAnyOf: PLATFORM_PA_ANY,
  },
  {
    to: '/my-dashboard/payment-methods',
    label: 'Payment methods',
    title: 'Payment methods',
    description: 'Enable or disable Stripe and bank transfer checkout for members.',
    paCapability: 'pa_manage_payment_methods',
    group: 'platform',
  },
  {
    to: '/my-dashboard/users',
    label: 'Users & roles',
    title: 'Users & roles',
    description: 'Create users, update accounts, and assign roles across the platform.',
    paCapability: 'pa_manage_users_roles',
    group: 'platform',
  },
  {
    to: '/my-dashboard/hubs',
    label: 'White-labelled hubs',
    title: 'White-labelled hubs',
    description: 'Create and configure white-labelled hubs (branding, private access).',
    paCapability: 'pa_manage_hubs',
    sharedOnly: true,
    group: 'platform',
  },
  {
    to: '/my-dashboard/checklist',
    label: 'Functionalities',
    title: 'Functionalities',
    description: 'Per-hub Functionalities: access, credits, and content distribution.',
    paCapability: 'pa_manage_hub_checklists',
    group: 'platform',
  },
  {
    to: '/my-dashboard/capabilities',
    label: 'Capabilities',
    title: 'Capabilities',
    description: 'Role × capability matrix for members, hub admins, and Power Admin (per hub).',
    paCapability: 'pa_manage_power_capabilities',
    group: 'platform',
  },
]

export function isDashboardLinkVisible(
  link,
  { can, canPower, advisorBillingEnabled, canManagePaymentCard, isActingOnWhiteLabel, userRole }
) {
  if (link.sharedOnly && isActingOnWhiteLabel) return false
  if (Array.isArray(link.exceptRoles) && link.exceptRoles.length > 0) {
    const role = String(userRole || '')
    if (role && link.exceptRoles.includes(role)) return false
  }
  // Payment card is client_admin only when advisor billing is on.
  if (link.billingOnly) return Boolean(canManagePaymentCard)
  if (Array.isArray(link.anyOf) && link.anyOf.length > 0) {
    return link.anyOf.some((flag) => can(flag))
  }
  if (Array.isArray(link.paAnyOf) && link.paAnyOf.length > 0) {
    return link.paAnyOf.some((flag) => Boolean(canPower?.(flag)))
  }
  if (link.paCapability) return Boolean(canPower?.(link.paCapability))
  if (link.capability) return Boolean(can(link.capability))
  // Section headings need anyOf / paAnyOf / capability to appear.
  if (link.kind === 'section') return false
  return true
}

/**
 * Filter links and drop section headers that have no visible children.
 * Also show "Advisors & billing" when only the payment-card (billingOnly) link is visible.
 */
export function getVisibleDashboardNav(ctx) {
  const filtered = DASHBOARD_LINKS.filter((link) => {
    if (link.kind === 'section' && link.label === 'Advisors & billing') {
      return isDashboardLinkVisible(link, ctx) || Boolean(ctx.canManagePaymentCard)
    }
    return isDashboardLinkVisible(link, ctx)
  })

  const result = []
  for (let i = 0; i < filtered.length; i += 1) {
    const item = filtered[i]
    if (item.kind === 'section') {
      let hasChild = false
      for (let j = i + 1; j < filtered.length; j += 1) {
        if (filtered[j].kind === 'section') break
        hasChild = true
        break
      }
      if (hasChild) result.push(item)
    } else {
      result.push(item)
    }
  }
  return result
}

export function isDashboardHomeCard(link) {
  return link.kind !== 'section' && Boolean(link.to) && link.to !== '/my-dashboard'
}

/** Resolve the best matching nav link for the current path (for topbar + active menu). */
export function findActiveDashboardLink(pathname) {
  const links = DASHBOARD_LINKS.filter((l) => l.kind !== 'section' && l.to)

  const exact = links.find((l) => pathname === l.to)
  if (exact) return exact

  const scored = links
    .map((link) => {
      let score = 0
      if (pathname.startsWith(`${link.to}/`)) {
        const rest = pathname.slice(link.to.length + 1)
        // `end: true` mirrors NavLink `end` — do not claim nested detail routes
        // like /social-media-compliance/42 as "My requests".
        if (link.end && /^\d+(\/|$)/.test(rest)) {
          score = 0
        } else {
          score = link.to.length
        }
      }
      for (const prefix of link.alsoMatch || []) {
        if (pathname === prefix || pathname.startsWith(prefix)) {
          score = Math.max(score, prefix.length)
        }
      }
      return { link, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored[0]?.link || null
}

/** Whether a nav link should show the selected background for this path. */
export function isDashboardNavActive(link, pathname) {
  if (!link?.to || link.kind === 'section') return false
  const active = findActiveDashboardLink(pathname)
  return Boolean(active && active.to === link.to)
}
