import { DASHBOARD_GROUPS } from '../dashboard/nav'

/** Default dashboard nav copy (mirrors backend DashboardNavDefaults). */
export const DASHBOARD_NAV_DEFAULTS = {
  sections: { ...DASHBOARD_GROUPS },
  items: {
    '/my-dashboard': 'Overview',
    '/my-dashboard/profile': 'Update profile',
    '/my-dashboard/subscription': 'Subscription',
    '/my-dashboard/credits': 'Credits',
    '/my-dashboard/invoices': 'Invoices',
    '/my-dashboard/purchases': 'Purchases',
    '/my-dashboard/posts': 'Posts / reels',
    '/my-dashboard/central-library': 'Central library',
    '/my-dashboard/bundles': 'Bundles',
    '/my-dashboard/types': 'Types',
    '/my-dashboard/categories': 'Categories',
    '/my-dashboard/tags': 'Tags',
    '/my-dashboard/firms': 'Firms',
    '/my-dashboard/firm-documents': 'Firm documents',
    '/my-dashboard/plans': 'Subscriptions',
    '/my-dashboard/settings': 'Settings',
    '/my-dashboard/terms': 'Terms & Conditions',
    '/my-dashboard/role-display-names': 'Manage roles',
    '/my-dashboard/compliance-status-display-names': 'Workflows status title',
    '/my-dashboard/email-templates': 'Email templates',
    '/my-dashboard/bank-transfers': 'Bank transfers',
    '/my-dashboard/activity-logs': 'Activity logs',
    '/my-dashboard/active-sessions': 'Active sessions',
    '/my-dashboard/modules': 'Modules',
    '/my-dashboard/module-pricing': 'Module prices',
    '/my-dashboard/module-invoices': 'Module invoices',
    '/my-dashboard/advisors': 'Import Users',
    '/my-dashboard/payment-card': 'Payment card',
    '/my-dashboard/advisor-renewal': 'Billing renew day',
    '/my-dashboard/subscriber-credits': 'Subscriber credits',
    '/my-dashboard/advisor-invoices': 'Advisor invoices',
    '/my-dashboard/social-media-compliance': 'My requests',
    '/my-dashboard/social-media-compliance/new': 'New request',
    '/my-dashboard/social-media-compliance/queue': 'All requests',
    '/my-dashboard/social-media-compliance/reports': 'Reports',
    '/my-dashboard/general-compliance': 'My requests',
    '/my-dashboard/general-compliance/new': 'New request',
    '/my-dashboard/general-compliance/content-types': 'Content types',
    '/my-dashboard/general-compliance/queue': 'All requests',
    '/my-dashboard/general-compliance/reports': 'Reports',
    '/my-dashboard/support-tickets': 'My tickets',
    '/my-dashboard/support-tickets/new': 'New ticket',
    '/my-dashboard/support-tickets/queue': 'All tickets',
    '/my-dashboard/website-compliance/request-site': 'Request a site',
    '/my-dashboard/website-compliance/my-sites': 'My sites',
    '/my-dashboard/website-compliance/go-live': 'Request go-live',
    '/my-dashboard/website-compliance/deployments': 'Site operations',
    '/my-dashboard/website-compliance/content-editor': 'Content editor',
    '/my-dashboard/website-compliance/my-requests': 'My change requests',
    '/my-dashboard/website-compliance/publish-live': 'Publish content',
    '/my-dashboard/website-compliance/assign': 'Assign requests',
    '/my-dashboard/website-compliance/review': 'Review queue',
    '/my-dashboard/website-compliance/history': 'Request history',
    '/my-dashboard/website-compliance/reports': 'Reports',
    '/my-dashboard/payment-methods': 'Payment methods',
    '/my-dashboard/users': 'Users & roles',
    '/my-dashboard/hubs': 'Hubs',
    '/my-dashboard/checklist': 'Functionalities',
    '/my-dashboard/capabilities': 'Capabilities',
  },
}

export const DASHBOARD_NAV_SECTION_FIELDS = [
  { key: 'dashboard', label: 'Topbar — Dashboard (overview)' },
  { key: 'account', label: 'Separator — Account' },
  { key: 'content', label: 'Separator — SM Template' },
  { key: 'hub', label: 'Separator — Hub (generic)' },
  { key: 'hub_central', label: 'Separator — Central Hub' },
  { key: 'hub_shared', label: 'Separator — Shared hub' },
  { key: 'hub_white_label', label: 'Separator — White-labelled hub' },
  { key: 'modules', label: 'Separator — Modules' },
  { key: 'advisors', label: 'Separator — Advisors & billing' },
  { key: 'smc', label: 'Separator — Social Media Compliance' },
  { key: 'gc', label: 'Separator — General Compliance' },
  { key: 'st', label: 'Separator — Support Tickets' },
  { key: 'wtl', label: 'Separator — Website Template Library' },
  { key: 'wc', label: 'Separator — Website Content Pre Approval' },
  { key: 'platform', label: 'Separator — Platform' },
]

export function emptyDashboardNav() {
  return {
    sections: Object.fromEntries(Object.keys(DASHBOARD_NAV_DEFAULTS.sections).map((k) => [k, ''])),
    items: Object.fromEntries(Object.keys(DASHBOARD_NAV_DEFAULTS.items).map((k) => [k, ''])),
  }
}

export function fillDashboardNavFromSettings(incoming) {
  const next = emptyDashboardNav()
  for (const key of Object.keys(next.sections)) {
    next.sections[key] = incoming?.sections?.[key] ?? DASHBOARD_NAV_DEFAULTS.sections[key] ?? ''
  }
  for (const key of Object.keys(next.items)) {
    next.items[key] = incoming?.items?.[key] ?? DASHBOARD_NAV_DEFAULTS.items[key] ?? ''
  }
  return next
}
