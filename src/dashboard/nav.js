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
 *   to: string,
 *   label: string,
 *   title?: string,
 *   description?: string,
 *   end?: boolean,
 *   capability?: string,
 *   anyOf?: string[],
 *   paCapability?: string,
 *   billingOnly?: boolean,
 *   homeOnly?: boolean,
 * }} DashboardLink */

/** @type {DashboardLink[]} */
export const DASHBOARD_LINKS = [
  {
    to: '/my-dashboard',
    label: 'Dashboard',
    end: true,
    // Always show Dashboard home when the shell is open
  },
  // —— General (member account) ——
  {
    to: '/my-dashboard/subscription',
    label: 'Subscription',
    title: 'Subscription',
    description: 'Your active plan and subscription history for this hub.',
    capability: 'general_show_subscription',
  },
  {
    to: '/my-dashboard/credits',
    label: 'Credits',
    title: 'Remaining credits',
    description: 'See your credit balance. Credits are spent when you unlock posts or bundles.',
    capability: 'general_show_credits',
  },
  {
    to: '/my-dashboard/invoices',
    label: 'Invoices',
    title: 'Invoices',
    description: 'View receipts for subscriptions and content purchases.',
    capability: 'general_show_invoices',
  },
  {
    to: '/my-dashboard/purchases',
    label: 'Purchases',
    title: 'Purchases',
    description: 'Browse content you unlocked with credits.',
    capability: 'general_show_purchases',
  },
  // —— Hub tools (Capabilities matrix dashboard_*) ——
  {
    to: '/my-dashboard/posts',
    label: 'Posts / reels',
    title: 'Posts / reels',
    description: 'Create and edit catalog posts and reels for the current hub.',
    capability: 'dashboard_manage_posts',
  },
  {
    to: '/my-dashboard/bundles',
    label: 'Bundles',
    title: 'Post bundles',
    description: 'Group posts/reels into bundles with a total credit price.',
    capability: 'dashboard_manage_bundles',
  },
  {
    to: '/my-dashboard/types',
    label: 'Types',
    title: 'Content types',
    description: 'Manage content types (post, reel, etc.) for the current hub.',
    capability: 'dashboard_manage_types',
  },
  {
    to: '/my-dashboard/categories',
    label: 'Categories',
    title: 'Categories',
    description: 'Manage topical categories used to group catalog content.',
    capability: 'dashboard_manage_categories',
  },
  {
    to: '/my-dashboard/tags',
    label: 'Tags',
    title: 'Tags',
    description: 'Manage free-form tags for filtering posts and reels.',
    capability: 'dashboard_manage_tags',
  },
  {
    to: '/my-dashboard/plans',
    label: 'Plans',
    title: 'Subscription plans',
    description: 'Create and edit credit packages for public hub self-serve subscriptions.',
    capability: 'dashboard_manage_plans',
  },
  {
    to: '/my-dashboard/settings',
    label: 'Settings',
    title: 'Settings',
    description: 'Configure NEW banner duration and other hub options.',
    capability: 'dashboard_manage_settings',
  },
  {
    to: '/my-dashboard/bank-transfers',
    label: 'Bank transfers',
    title: 'Bank transfers',
    description: 'Confirm pending bank payments and grant credits.',
    capability: 'dashboard_bank_transfers',
  },
  {
    to: '/my-dashboard/advisors',
    label: 'Advisors',
    title: 'Advisors',
    description: 'Import and/or discontinue advisors for the current hub.',
    anyOf: ['advisor_excel_import', 'advisor_discontinue'],
  },
  {
    to: '/my-dashboard/payment-card',
    label: 'Payment card',
    title: 'Payment card',
    description: 'Enter or update the card charged when importing advisors (Stripe).',
    billingOnly: true,
  },
  {
    to: '/my-dashboard/advisor-pricing',
    label: 'Advisor rates',
    title: 'Advisor billing rates',
    description: 'Set rate-per-advisor tiers used for private hub billing.',
    capability: 'dashboard_manage_advisor_pricing',
  },
  {
    to: '/my-dashboard/advisor-renewal',
    label: 'Advisor renew day',
    title: 'Advisor auto-renew day',
    description: 'Set the monthly day the client admin card is charged for advisor seats.',
    capability: 'dashboard_manage_advisor_renewal',
  },
  {
    to: '/my-dashboard/subscriber-credits',
    label: 'Subscriber credits',
    title: 'Subscriber credits',
    description: 'Set unlimited or fixed credits for private-hub Excel subscribers.',
    capability: 'dashboard_manage_subscriber_credits',
  },
  {
    to: '/my-dashboard/advisor-invoices',
    label: 'Advisor invoices',
    title: 'Advisor invoices',
    description: 'View invoices for advisor subscriber billing on this hub.',
    capability: 'dashboard_view_advisor_invoices',
  },
  {
    to: '/my-dashboard/activity-logs',
    label: 'Activity logs',
    title: 'Activity logs & report',
    description: 'Audit trail and activity report for the current hub.',
    capability: 'dashboard_view_activity_logs',
  },
  // —— Power Admin platform tools (pa_* checklist) ——
  {
    to: '/my-dashboard/payment-methods',
    label: 'Payment methods',
    title: 'Payment methods',
    description: 'Enable or disable Stripe and bank transfer checkout for members.',
    paCapability: 'pa_manage_payment_methods',
  },
  {
    to: '/my-dashboard/users',
    label: 'Users & roles',
    title: 'Users & roles',
    description: 'Create users, update accounts, and assign roles across the platform.',
    paCapability: 'pa_manage_users_roles',
  },
  {
    to: '/my-dashboard/hubs',
    label: 'White-label hubs',
    title: 'White-label hubs',
    description: 'Create and configure white-labelled hubs (branding, private access).',
    paCapability: 'pa_manage_hubs',
  },
  {
    to: '/my-dashboard/checklist',
    label: 'Functionalities',
    title: 'Hub Functionalities',
    description: 'Per-hub Functionalities: access, credits, and content distribution.',
    paCapability: 'pa_manage_hub_checklists',
  },
  {
    to: '/my-dashboard/capabilities',
    label: 'Capabilities',
    title: 'User capabilities',
    description: 'Role × capability matrix for members, hub admins, and Power Admin (per hub).',
    paCapability: 'pa_manage_power_capabilities',
  },
]

export function isDashboardLinkVisible(link, { can, canPower, advisorBillingEnabled }) {
  if (link.billingOnly) return Boolean(advisorBillingEnabled)
  if (Array.isArray(link.anyOf) && link.anyOf.length > 0) {
    return link.anyOf.some((flag) => can(flag))
  }
  if (link.paCapability) return Boolean(canPower?.(link.paCapability))
  if (link.capability) return Boolean(can(link.capability))
  return true
}
