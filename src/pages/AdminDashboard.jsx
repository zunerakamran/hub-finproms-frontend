import { Link } from 'react-router-dom'
import { useHub } from '../context/HubContext'

const sections = [
  {
    to: '/client-admin/posts',
    title: 'Posts & reels',
    description: 'Create and edit social content, attachments, and credit costs.',
  },
  {
    to: '/client-admin/types',
    title: 'Types',
    description: 'Manage content types such as Post and Reel (separate from category).',
  },
  {
    to: '/client-admin/categories',
    title: 'Categories',
    description: 'Manage topical categories (separate from type and tags).',
  },
  {
    to: '/client-admin/tags',
    title: 'Tags',
    description: 'Manage tags available when creating or editing content.',
  },
  {
    to: '/client-admin/plans',
    title: 'Subscription plans',
    description: 'Add and update credit packages users can purchase.',
  },
  {
    to: '/client-admin/advisors',
    title: 'Advisor import',
    description: 'Import advisors from an Excel/CSV sheet with unlimited credits.',
    requires: 'advisor_excel_import',
  },
  {
    to: '/client-admin/settings',
    title: 'Settings',
    description: 'Configure NEW banner duration and other hub options.',
  },
  {
    to: '/client-admin/bank-transfers',
    title: 'Bank transfers',
    description: 'Confirm pending bank payments and grant credits (temporary until Stripe).',
  },
]

export default function AdminDashboard() {
  const { can } = useHub()
  const visible = sections.filter((section) => !section.requires || can(section.requires))

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client Admin</p>
          <h1>Dashboard</h1>
          <p className="muted">Manage types, categories, posts, tags, plans, and hub settings.</p>
        </div>
      </div>

      <div className="admin-dashboard-grid">
        {visible.map((section) => (
          <Link key={section.to} to={section.to} className="admin-dashboard-card">
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            <span className="admin-dashboard-link">Open →</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
