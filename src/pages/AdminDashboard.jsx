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
    title: 'Advisor import',
    description: 'Import advisors from an Excel/CSV sheet with unlimited credits.',
    capability: 'advisor_excel_import',
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
  const { can } = useHub()
  const visible = sections.filter((section) => can(section.capability))

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
