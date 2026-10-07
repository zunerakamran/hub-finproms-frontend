import {
  DASHBOARD_GROUPS,
  DEFAULT_SECTION_ORDER,
  createCustomSectionId,
  defaultItemGroupsFromLinks,
  defaultItemOrderFromLinks,
  extractCustomSectionIds,
  isCustomSectionId,
  normalizeSectionOrder,
  resolveItemOrder,
} from '../dashboard/nav'

/** Default dashboard nav copy + layout (mirrors backend DashboardNavDefaults). */
export const DASHBOARD_NAV_DEFAULTS = {
  sections: { ...DASHBOARD_GROUPS },
  items: {
    '/my-dashboard': 'Overview',
    '/my-dashboard/profile': 'Update profile',
    '/my-dashboard/subscription': 'Subscription',
    '/my-dashboard/credits': 'Credits',
    '/my-dashboard/my-invoices': 'My invoices',
    '/my-dashboard/purchases': 'Purchases',
    '/my-dashboard/posts': 'Posts / reels',
    '/my-dashboard/central-library': 'Central library',
    '/my-dashboard/bundles': 'Bundles',
    '/my-dashboard/types': 'Types',
    '/my-dashboard/categories': 'Categories',
    '/my-dashboard/tags': 'Tags',
    '/my-dashboard/taxonomy-add-requests': 'Taxonomy requests',
    '/my-dashboard/taxonomy-add-requests/new': 'Request taxonomy',
    '/my-dashboard/taxonomy-add-requests/queue': 'Taxonomy queue',
    '/my-dashboard/firms': 'Firms',
    '/my-dashboard/firm-documents': 'Firm documents',
    '/my-dashboard/firm-documents/categories': 'Document categories',
    '/my-dashboard/plans': 'Subscriptions',
    '/my-dashboard/settings': 'Settings',
    '/my-dashboard/terms': 'Terms & Conditions',
    '/my-dashboard/role-display-names': 'Manage roles',
    '/my-dashboard/compliance-status-display-names': 'Workflows status title',
    '/my-dashboard/email-templates': 'Email templates',
    '/my-dashboard/bank-transfers': 'Bank transfers',
    '/my-dashboard/activity-logs': 'Activity logs',
    '/my-dashboard/active-sessions': 'Active sessions',
    '/my-dashboard/hub-users': 'Users',
    '/my-dashboard/compliance-audit-trail': 'Audit trail',
    '/my-dashboard/one-time-invoices': 'One-time invoices',
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
  section_order: [...DEFAULT_SECTION_ORDER],
  item_groups: defaultItemGroupsFromLinks(),
  item_order: defaultItemOrderFromLinks(),
}

/** Built-in separators that can be renamed (includes hub context variants + topbar). */
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

export function assignableSectionsFromNav(dashboardNav) {
  const customIds = extractCustomSectionIds(dashboardNav?.sections, dashboardNav?.section_order)
  const order = normalizeSectionOrder(dashboardNav?.section_order, customIds)
  return order.map((key) => ({
    key,
    label: dashboardNav?.sections?.[key] || DASHBOARD_GROUPS[key] || key,
    custom: isCustomSectionId(key),
  }))
}

export function emptyDashboardNav() {
  return {
    sections: Object.fromEntries(Object.keys(DASHBOARD_NAV_DEFAULTS.sections).map((k) => [k, ''])),
    items: Object.fromEntries(Object.keys(DASHBOARD_NAV_DEFAULTS.items).map((k) => [k, ''])),
    section_order: [...DEFAULT_SECTION_ORDER],
    item_groups: { ...DASHBOARD_NAV_DEFAULTS.item_groups },
    item_order: [...DASHBOARD_NAV_DEFAULTS.item_order],
  }
}

export function fillDashboardNavFromSettings(incoming) {
  const remapped = remapLegacyDashboardNavPaths(incoming)
  const next = emptyDashboardNav()
  for (const key of Object.keys(next.sections)) {
    next.sections[key] = remapped?.sections?.[key] ?? DASHBOARD_NAV_DEFAULTS.sections[key] ?? ''
  }
  for (const key of Object.keys(next.items)) {
    next.items[key] = remapped?.items?.[key] ?? DASHBOARD_NAV_DEFAULTS.items[key] ?? ''
  }

  const customIds = extractCustomSectionIds(remapped?.sections, remapped?.section_order)
  for (const customId of customIds) {
    next.sections[customId] = remapped?.sections?.[customId] || 'Custom section'
  }

  next.section_order = normalizeSectionOrder(remapped?.section_order, customIds)
  const defaultGroups = defaultItemGroupsFromLinks()
  const allowedGroups = new Set([...DEFAULT_SECTION_ORDER, ...customIds])
  next.item_groups = { ...defaultGroups }
  if (remapped?.item_groups && typeof remapped.item_groups === 'object') {
    for (const path of Object.keys(defaultGroups)) {
      const value = remapped.item_groups[path]
      if (value && allowedGroups.has(value)) {
        next.item_groups[path] = value
      }
    }
  }
  next.item_order = resolveItemOrder(remapped)
  return next
}

function remapLegacyDashboardNavPaths(incoming) {
  if (!incoming || typeof incoming !== 'object') return incoming
  const map = { '/my-dashboard/invoices': '/my-dashboard/my-invoices' }
  const next = { ...incoming }
  for (const bucket of ['items', 'item_groups']) {
    if (!next[bucket] || typeof next[bucket] !== 'object') continue
    const remapped = {}
    for (const [path, value] of Object.entries(next[bucket])) {
      remapped[map[path] || path] = value
    }
    next[bucket] = remapped
  }
  if (Array.isArray(next.item_order)) {
    next.item_order = next.item_order.map((path) => map[path] || path)
  }
  return next
}

export function moveListItem(list, index, direction) {
  const next = [...list]
  const target = index + direction
  if (target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export function addCustomSeparator(dashboardNav, label = 'New separator') {
  const existing = extractCustomSectionIds(dashboardNav?.sections, dashboardNav?.section_order)
  const id = createCustomSectionId(existing)
  const cleanLabel = String(label || 'New separator').trim() || 'New separator'
  return {
    ...dashboardNav,
    sections: {
      ...(dashboardNav?.sections || {}),
      [id]: cleanLabel,
    },
    section_order: normalizeSectionOrder(
      [...(dashboardNav?.section_order || DEFAULT_SECTION_ORDER), id],
      [...existing, id]
    ),
  }
}

export function removeCustomSeparator(dashboardNav, sectionId) {
  if (!isCustomSectionId(sectionId)) return dashboardNav
  const defaultGroups = defaultItemGroupsFromLinks()
  const nextSections = { ...(dashboardNav?.sections || {}) }
  delete nextSections[sectionId]
  const customIds = extractCustomSectionIds(nextSections, dashboardNav?.section_order).filter(
    (id) => id !== sectionId
  )
  const nextGroups = { ...(dashboardNav?.item_groups || {}) }
  for (const [path, group] of Object.entries(nextGroups)) {
    if (group === sectionId) {
      nextGroups[path] = defaultGroups[path] || 'account'
    }
  }
  return {
    ...dashboardNav,
    sections: nextSections,
    section_order: normalizeSectionOrder(
      (dashboardNav?.section_order || []).filter((id) => id !== sectionId),
      customIds
    ),
    item_groups: nextGroups,
  }
}

export { isCustomSectionId, createCustomSectionId }
