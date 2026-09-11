import { Link } from 'react-router-dom'
import { useHub } from '../context/HubContext'

const sections = [
  {
    to: '/client-admin/posts',
    title: 'Posts & reels',
    description: 'Create and edit social content, attachments, and credit costs.',
    capability: 'dashboard_manage_posts',
  },
  {
    to: '/client-admin/bundles',
    title: 'Post bundles',
    description: 'Group existing or new posts/reels into a bundle with description and total credits.',
    capability: 'dashboard_manage_bundles',
  },
  {
    to: '/client-admin/types',
    title: 'Types',
    description: 'Manage content types such as Post and Reel (separate from category).',
    capability: 'dashboard_manage_types',
  },
  {
    to: '/client-admin/categories',
    title: 'Categories',
    description: 'Manage topical categories (separate from type and tags).',
    capability: 'dashboard_manage_categories',
  },
  {
    to: '/client-admin/tags',
    title: 'Tags',
    description: 'Manage tags available when creating or editing content.',
    capability: 'dashboard_manage_tags',
  },
  {
    to: '/client-admin/plans',
    title: 'Subscription plans',
    description: 'Add and update credit packages users can purchase.',
    capability: 'dashboard_manage_plans',
  },
  {
    to: '/client-admin/advisors',
    title: 'Advisors',
    description: 'Import advisors from Excel/CSV and/or discontinue advisor access.',
    anyOf: ['advisor_excel_import', 'advisor_discontinue'],
  },
  {
    to: '/client-admin/payment-card',
    title: 'Payment card',
    description: 'Enter or update the card charged when importing advisors (Stripe).',
    billingOnly: true,
  },
  {
    to: '/client-admin/advisor-pricing',
    title: 'Advisor billing rates / quotas',
    description: 'Set rate-per-advisor tiers used for private hub billing (rate × advisors).',
    capability: 'dashboard_manage_advisor_pricing',
  },
  {
    to: '/client-admin/advisor-renewal',
    title: 'Advisor auto-renew day',
    description: 'Set the monthly day the client admin card is charged for advisor seats.',
    capability: 'dashboard_manage_advisor_renewal',
  },
  {
    to: '/client-admin/subscriber-credits',
    title: 'Subscriber credits',
    description: 'Set unlimited or fixed credits for Excel-imported private-hub subscribers.',
    capability: 'dashboard_manage_subscriber_credits',
  },
  {
    to: '/client-admin/advisor-invoices',
    title: 'Advisor billing invoices',
    description: 'View invoices created for advisor subscriber billing.',
    capability: 'dashboard_view_advisor_invoices',
  },
  {
    to: '/client-admin/activity-logs',
    title: 'Activity logs & report',
    description: 'Audit trail of user activity and a summary report for this hub.',
    capability: 'dashboard_view_activity_logs',
  },
  {
    to: '/client-admin/settings',
    title: 'Settings',
    description: 'Configure NEW banner duration and other hub options.',
    capability: 'dashboard_manage_settings',
  },
  {
    to: '/client-admin/bank-transfers',
    title: 'Bank transfers',
    description: 'Confirm pending bank payments and grant credits (temporary until Stripe).',
    capability: 'dashboard_bank_transfers',
  },
]

export default function AdminDashboard() {
  const { can, advisorBillingEnabled } = useHub()
  const visible = sections.filter((section) => {
    if (section.billingOnly) return advisorBillingEnabled
    if (Array.isArray(section.anyOf) && section.anyOf.length > 0) {
      return section.anyOf.some((flag) => can(flag))
    }
    return can(section.capability)
  })

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client Admin</p>
          <h1>Dashboard</h1>
          <p className="muted">
            Tools enabled for this hub by Power Admin. Restricted options stay hidden.
          </p>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <h2>No dashboard tools enabled</h2>
          <p className="muted">
            Power Admin has not enabled any hub-admin capabilities for this hub yet.
          </p>
        </div>
      ) : (
        <div className="admin-dashboard-grid">
          {visible.map((section) => (
            <Link key={section.to} to={section.to} className="admin-dashboard-card">
              <h2>{section.title}</h2>
              <p>{section.description}</p>
              <span className="admin-dashboard-link">Open →</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
