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
 *   sharedOnly?: boolean, // legacy — hide while acting on WL / on WL deploy
 *   controlPlaneOnly?: boolean, // Platform tools: only on Central Hub Controller
 *   hideWhenActingRemotely?: boolean, // Hide while Control hub switcher is on Shared/WL
 *   homeOnly?: boolean,
 *   alwaysVisible?: boolean,
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
  'gc_manage_content_types',
]

const ST_NAV_ANY = [
  'st_view_own_tickets',
  'st_submit_ticket',
  'st_view_all_tickets',
  'st_change_ticket_status',
  'st_comment_on_tickets',
]

const WTL_NAV_ANY = [
  'wc_request_deployments',
  'wc_assign_website_templates',
  'wc_view_all_deployments',
  'wc_deploy_websites',
  'wc_manage_templates',
]

const WC_NAV_ANY = [
  'wc_edit_sections',
  'wc_submit_change_requests',
  'wc_assign_change_requests',
  'wc_view_all_change_requests',
  'wc_review_change_requests',
  'wc_change_request_status',
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
  'dashboard_view_posts',
  'dashboard_central_content_library',
  'dashboard_manage_bundles',
  'dashboard_manage_types',
  'dashboard_view_types',
  'dashboard_manage_categories',
  'dashboard_view_categories',
  'dashboard_manage_tags',
  'dashboard_view_tags',
]

const HUB_OPS_ANY = [
  'dashboard_manage_plans',
  'dashboard_manage_settings',
  'dashboard_manage_terms',
  'dashboard_manage_role_display_names',
  'dashboard_manage_compliance_status_display_names',
  'dashboard_manage_email_templates',
  'dashboard_manage_firms',
  'dashboard_assign_firm_head',
  'firm_documents_view',
  'firm_documents_add',
  'firm_documents_delete',
  'firm_documents_archive',
  'dashboard_bank_transfers',
  'dashboard_view_activity_logs',
  'dashboard_manage_active_sessions',
]

const MODULES_ANY = [
  'dashboard_manage_modules',
  'dashboard_manage_module_pricing',
  'dashboard_view_module_invoices',
  'dashboard_mark_module_invoices_paid',
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
  dashboard: 'Dashboard',
  account: 'Account',
  content: 'SM Template',
  hub: 'Hub',
  hub_central: 'Central Hub',
  hub_shared: 'Shared hub',
  hub_white_label: 'White-labelled hub',
  modules: 'Modules',
  advisors: 'Advisors & billing',
  smc: 'Social Media Compliance',
  gc: 'General Compliance',
  st: 'Support Tickets',
  wtl: 'Website Template Library',
  wc: 'Website Content Pre Approval',
  platform: 'Platform',
}

/**
 * Resolve a dashboard group / section label for the current hub context.
 * The "Hub" separator becomes Central Hub / Shared hub / White-labelled hub.
 * Optional `dashboardNav.sections` overrides come from hub Settings.
 */
export function resolveDashboardGroupLabel(
  groupOrLabel,
  {
    isWhiteLabelHub = false,
    isControlPlane = false,
    isActingRemotely = false,
    dashboardNav = null,
  } = {}
) {
  const sections = dashboardNav?.sections || {}
  const key = groupOrLabel === 'Hub' ? 'hub' : groupOrLabel

  if (key === 'hub') {
    if (isControlPlane && !isActingRemotely) {
      return sections.hub_central || DASHBOARD_GROUPS.hub_central
    }
    if (isActingRemotely && isWhiteLabelHub) {
      return sections.hub_white_label || DASHBOARD_GROUPS.hub_white_label
    }
    if (isActingRemotely) {
      return sections.hub_shared || DASHBOARD_GROUPS.hub_shared
    }
    return isWhiteLabelHub
      ? sections.hub_white_label || DASHBOARD_GROUPS.hub_white_label
      : sections.hub_shared || DASHBOARD_GROUPS.hub_shared
  }

  if (sections[key]) return sections[key]
  return DASHBOARD_GROUPS[key] || groupOrLabel
}

/** Apply hub Settings overrides to a nav link (menu label + title). */
export function applyDashboardNavLabel(link, dashboardNav = null) {
  if (!link) return link
  if (link.kind === 'section') {
    return link
  }
  const custom = dashboardNav?.items?.[link.to]
  if (!custom) return link
  return { ...link, label: custom, title: custom }
}

/** Apply hub Settings group override (which separator the item sits under). */
export function applyDashboardNavGroup(link, dashboardNav = null) {
  if (!link || link.kind === 'section' || !link.to) return link
  const group = dashboardNav?.item_groups?.[link.to]
  if (!group) return link
  return { ...link, group }
}

/** Default separator order (excludes hub_* label variants). */
export const DEFAULT_SECTION_ORDER = [
  'account',
  'content',
  'hub',
  'modules',
  'advisors',
  'smc',
  'gc',
  'st',
  'wtl',
  'wc',
  'platform',
]

export function normalizeSectionOrder(incoming) {
  const allowed = new Set(DEFAULT_SECTION_ORDER)
  const order = []
  if (Array.isArray(incoming)) {
    for (const id of incoming) {
      if (allowed.has(id) && !order.includes(id)) order.push(id)
    }
  }
  for (const id of DEFAULT_SECTION_ORDER) {
    if (!order.includes(id)) order.push(id)
  }
  return order
}

export function defaultItemGroupsFromLinks() {
  const groups = {}
  for (const link of DASHBOARD_LINKS) {
    if (link.kind === 'section' || !link.to || link.to === '/my-dashboard') continue
    groups[link.to] = link.group || 'account'
  }
  return groups
}

export function defaultItemOrderFromLinks() {
  return Object.keys(defaultItemGroupsFromLinks())
}

export function resolveItemGroup(path, dashboardNav = null, fallback = 'account') {
  return dashboardNav?.item_groups?.[path] || defaultItemGroupsFromLinks()[path] || fallback
}

export function resolveItemOrder(dashboardNav = null) {
  const defaults = defaultItemOrderFromLinks()
  const allowed = new Set(defaults)
  const order = []
  if (Array.isArray(dashboardNav?.item_order)) {
    for (const path of dashboardNav.item_order) {
      if (allowed.has(path) && !order.includes(path)) order.push(path)
    }
  }
  for (const path of defaults) {
    if (!order.includes(path)) order.push(path)
  }
  return order
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
    id: 'account',
    label: 'Account',
    alwaysVisible: true,
  },
  {
    to: '/my-dashboard/profile',
    label: 'Update profile',
    title: 'Update profile',
    description: 'Change your name, email, profile picture, and two-factor authentication.',
    alwaysVisible: true,
    group: 'account',
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
    id: 'content',
    label: 'SM Template',
    anyOf: CONTENT_ANY,
  },
  {
    to: '/my-dashboard/posts',
    label: 'Posts / reels',
    title: 'Posts / reels',
    description:
      'List posts/reels on the current hub. Create/edit only where Manage posts is enabled — content hubs receive posts from the Central library.',
    anyOf: ['dashboard_manage_posts', 'dashboard_view_posts'],
    group: 'content',
  },
  {
    to: '/my-dashboard/central-library',
    label: 'Central library',
    title: 'Central content library',
    description:
          'Central only: Create, AI posts, Distribute, and Archive tabs. Create manual posts (single or Excel), distribute ready posts to hubs, archive/unarchive with remarks. AI generation under development.',
    capability: 'dashboard_central_content_library',
    controlPlaneOnly: true,
    hideWhenActingRemotely: true,
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
    description:
      'List content types on this hub. Create/edit only on Central (or where Manage types is enabled).',
    anyOf: ['dashboard_manage_types', 'dashboard_view_types'],
    group: 'content',
  },
  {
    to: '/my-dashboard/categories',
    label: 'Categories',
    title: 'Categories',
    description:
      'List categories on this hub. Create/edit only on Central (or where Manage categories is enabled).',
    anyOf: ['dashboard_manage_categories', 'dashboard_view_categories'],
    group: 'content',
  },
  {
    to: '/my-dashboard/tags',
    label: 'Tags',
    title: 'Tags',
    description:
      'List tags on this hub. Create/edit only on Central (or where Manage tags is enabled).',
    anyOf: ['dashboard_manage_tags', 'dashboard_view_tags'],
    group: 'content',
  },

  // —— Hub ——
  {
    kind: 'section',
    id: 'hub',
    label: 'Hub',
    anyOf: [...HUB_OPS_ANY],
  },
  {
    to: '/my-dashboard/firms',
    label: 'Firms',
    title: 'Firms',
    description:
      'Manage firms, appoint a Head of Firm, and set who can review and report on each firm’s compliance requests.',
    anyOf: ['dashboard_manage_firms', 'dashboard_assign_firm_head'],
    group: 'hub',
  },
  {
    to: '/my-dashboard/firm-documents',
    label: 'Firm documents',
    title: 'Firm documents',
    description:
      'Upload and manage firm attachments (images, Word, PDF). Heads have all rights and can grant access to members.',
    anyOf: [
      'firm_documents_view',
      'firm_documents_add',
      'firm_documents_delete',
      'firm_documents_archive',
    ],
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
    to: '/my-dashboard/terms',
    label: 'Terms & Conditions',
    title: 'Terms & Conditions',
    description: 'Edit the Terms & Conditions users must accept on first login.',
    capability: 'dashboard_manage_terms',
    group: 'hub',
  },
  {
    to: '/my-dashboard/role-display-names',
    label: 'Manage roles',
    title: 'Manage roles',
    description: 'Add roles to this hub and customize how role names appear in the UI.',
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
    to: '/my-dashboard/active-sessions',
    label: 'Active sessions',
    title: 'Active sessions',
    description: 'See who is logged in and force-logout any user.',
    capability: 'dashboard_manage_active_sessions',
    group: 'hub',
  },

  // —— Modules ——
  {
    kind: 'section',
    id: 'modules',
    label: 'Modules',
    anyOf: MODULES_ANY,
  },
  {
    to: '/my-dashboard/modules',
    label: 'Modules',
    title: 'Modules',
    description: 'Enable product modules (White Label, template libraries, and pre-approval workflows) for the current hub.',
    capability: 'dashboard_manage_modules',
    group: 'modules',
  },
  {
    to: '/my-dashboard/module-pricing',
    label: 'Module prices',
    title: 'Module one-time prices',
    description: 'Set one-time (or per-website) catalogue prices charged when modules are enabled.',
    capability: 'dashboard_manage_module_pricing',
    group: 'modules',
  },
  {
    to: '/my-dashboard/module-invoices',
    label: 'Module invoices',
    title: 'Module invoices',
    description: 'View one-time invoices generated when product modules are enabled.',
    capability: 'dashboard_view_module_invoices',
    group: 'modules',
  },

  // —— Advisors & billing ——
  {
    kind: 'section',
    id: 'advisors',
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
    to: '/my-dashboard/advisor-renewal',
    label: 'Billing renew day',
    title: 'Billing renew + grace',
    description: 'Set renew day (charge all due unpaid invoices) and grace day (suspend users / disable modules if still unpaid).',
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
    id: 'smc',
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
    id: 'gc',
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
    to: '/my-dashboard/general-compliance/content-types',
    label: 'Content types',
    title: 'Content types',
    description: 'Manage content type options for the general compliance submit dropdown.',
    capability: 'gc_manage_content_types',
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

  // —— Support Tickets ——
  {
    kind: 'section',
    id: 'st',
    label: 'Support Tickets',
    anyOf: ST_NAV_ANY,
  },
  {
    to: '/my-dashboard/support-tickets',
    label: 'My tickets',
    title: 'My tickets',
    description: 'View issues you reported and track their status.',
    anyOf: ['st_view_own_tickets', 'st_submit_ticket'],
    end: true,
    group: 'st',
  },
  {
    to: '/my-dashboard/support-tickets/new',
    label: 'New ticket',
    title: 'New ticket',
    description: 'Report a system error with module, description, and screenshots.',
    capability: 'st_submit_ticket',
    group: 'st',
  },
  {
    to: '/my-dashboard/support-tickets/queue',
    label: 'All tickets',
    title: 'All tickets',
    description: 'Developer inbox — review tickets and change their status.',
    anyOf: ['st_view_all_tickets', 'st_change_ticket_status'],
    group: 'st',
  },

  // —— Website Template Library ——
  {
    kind: 'section',
    id: 'wtl',
    label: 'Website Template Library',
    anyOf: WTL_NAV_ANY,
  },
  {
    to: '/my-dashboard/website-compliance/request-site',
    label: 'Request a site',
    title: 'Request a site',
    description: 'Browse website templates and request one by filling the deployment form.',
    capability: 'wc_request_deployments',
    group: 'wtl',
  },
  {
    to: '/my-dashboard/website-compliance/my-sites',
    label: 'My sites',
    title: 'My sites',
    description: 'Track your pending and live template deployments.',
    anyOf: [
      'wc_request_deployments',
      'wc_edit_sections',
      'wc_submit_change_requests',
    ],
    // Power Admin / FinProms use Site operations + Publish live instead.
    exceptRoles: ['power_admin', 'finproms_admin'],
    group: 'wtl',
  },
  {
    to: '/my-dashboard/website-compliance/go-live',
    label: 'Request go-live',
    title: 'Request go-live',
    description:
      'Submit a request for Power Admin to deploy your completed staging website to the main URL.',
    anyOf: ['wc_request_deployments', 'wc_assign_website_templates'],
    exceptRoles: ['power_admin', 'finproms_admin'],
    group: 'wtl',
  },
  {
    to: '/my-dashboard/website-compliance/deployments',
    label: 'Site operations',
    title: 'Site operations',
    description: 'Manage templates, view deployment requests, and manually deploy to cPanel.',
    anyOf: [
      'wc_view_all_deployments',
      'wc_deploy_websites',
      'wc_manage_templates',
      'wc_assign_website_templates',
    ],
    group: 'wtl',
  },

  // —— Website Content Pre Approval ——
  {
    kind: 'section',
    id: 'wc',
    label: 'Website Content Pre Approval',
    anyOf: WC_NAV_ANY,
  },
  {
    to: '/my-dashboard/website-compliance/content-editor',
    label: 'Content editor',
    title: 'Content editor',
    description: 'Edit website sections and submit changes for pre-approval review.',
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
    label: 'Publish content',
    title: 'Publish content',
    description: 'Edit and publish staging or live site content without approver review.',
    capability: 'wc_publish_live_content',
    // Detail editor lives at /publish/:deploymentId (not under publish-live/).
    alsoMatch: ['/my-dashboard/website-compliance/publish/'],
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
    description: 'Website Content Pre Approval summary for change requests and deployments.',
    capability: 'wc_view_platform_report',
    group: 'wc',
  },

  // —— Platform (Power Admin — Central Hub Controller only) ——
  {
    kind: 'section',
    id: 'platform',
    label: 'Platform',
    paAnyOf: PLATFORM_PA_ANY,
    controlPlaneOnly: true,
  },
  {
    to: '/my-dashboard/payment-methods',
    label: 'Payment methods',
    title: 'Payment methods',
    description: 'Enable or disable Stripe and bank transfer checkout for members.',
    paCapability: 'pa_manage_payment_methods',
    controlPlaneOnly: true,
    group: 'platform',
  },
  {
    to: '/my-dashboard/users',
    label: 'Users & roles',
    title: 'Users & roles',
    description: 'Create users, update accounts, and assign roles across the platform.',
    paCapability: 'pa_manage_users_roles',
    controlPlaneOnly: true,
    group: 'platform',
  },
  {
    to: '/my-dashboard/hubs',
    label: 'Hubs',
    title: 'Hubs',
    description: 'Create and configure Shared and White-labelled hubs (registry, deploy wiring).',
    paCapability: 'pa_manage_hubs',
    controlPlaneOnly: true,
    sharedOnly: true,
    group: 'platform',
  },
  {
    to: '/my-dashboard/checklist',
    label: 'Functionalities',
    title: 'Functionalities',
    description: 'Per-hub Functionalities: access, credits, and content distribution.',
    paCapability: 'pa_manage_hub_checklists',
    controlPlaneOnly: true,
    group: 'platform',
  },
  {
    to: '/my-dashboard/capabilities',
    label: 'Capabilities',
    title: 'Capabilities',
    description: 'Role × capability matrix for members, hub admins, and Power Admin (per hub).',
    paCapability: 'pa_manage_power_capabilities',
    controlPlaneOnly: true,
    group: 'platform',
  },
]

export function isDashboardLinkVisible(
  link,
  {
    can,
    canPower,
    advisorBillingEnabled,
    canManagePaymentCard,
    isActingOnWhiteLabel,
    isWhiteLabelHub,
    isControlPlane,
    isActingRemotely,
    userRole,
  }
) {
  // Hub tools on Central follow the Capabilities matrix (same as Shared /
  // White-label). Platform-only links still require isControlPlane below.
  if (link.controlPlaneOnly && !isControlPlane) return false
  if (link.hideWhenActingRemotely && isActingRemotely) return false
  if (link.sharedOnly && (isActingOnWhiteLabel || isWhiteLabelHub)) return false
  if (Array.isArray(link.exceptRoles) && link.exceptRoles.length > 0) {
    const role = String(userRole || '')
    if (role && link.exceptRoles.includes(role)) return false
  }
  if (link.alwaysVisible) return true
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
 * When dashboardNav is provided, rebuild order from section_order / item_groups / item_order.
 */
export function getVisibleDashboardNav(ctx) {
  const dashboardNav = ctx.dashboardNav || null
  const filtered = DASHBOARD_LINKS.filter((link) => {
    if (link.kind === 'section' && link.id === 'advisors') {
      return isDashboardLinkVisible(link, ctx) || Boolean(ctx.canManagePaymentCard)
    }
    return isDashboardLinkVisible(link, ctx)
  })

  const overview = filtered.filter((l) => l.to === '/my-dashboard')
  const sectionDefs = filtered.filter((l) => l.kind === 'section')
  const sectionById = Object.fromEntries(sectionDefs.map((s) => [s.id, s]))

  const items = filtered
    .filter((l) => l.kind !== 'section' && l.to && l.to !== '/my-dashboard')
    .map((l) => applyDashboardNavGroup(l, dashboardNav))

  const sectionOrder = normalizeSectionOrder(dashboardNav?.section_order)
  const itemOrder = resolveItemOrder(dashboardNav)
  const orderIndex = new Map(itemOrder.map((path, idx) => [path, idx]))

  const byGroup = {}
  for (const item of items) {
    const group = item.group || 'account'
    if (!byGroup[group]) byGroup[group] = []
    byGroup[group].push(item)
  }
  for (const group of Object.keys(byGroup)) {
    byGroup[group].sort(
      (a, b) => (orderIndex.get(a.to) ?? 9999) - (orderIndex.get(b.to) ?? 9999)
    )
  }

  const result = [...overview]
  for (const sectionId of sectionOrder) {
    const kids = byGroup[sectionId] || []
    if (!kids.length) continue
    const section =
      sectionById[sectionId] ||
      ({
        kind: 'section',
        id: sectionId,
        label: DASHBOARD_GROUPS[sectionId] || sectionId,
      })
    result.push(section, ...kids)
  }

  // Any items whose group is unknown / not in order — append without inventing separators.
  const placed = new Set(sectionOrder)
  for (const [group, kids] of Object.entries(byGroup)) {
    if (placed.has(group) || !kids.length) continue
    result.push(
      {
        kind: 'section',
        id: group,
        label: DASHBOARD_GROUPS[group] || group,
      },
      ...kids
    )
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
