import { Link } from 'react-router-dom'
import AdminSubnav from '../components/AdminSubnav'

const sections = [
  {
    to: '/client-admin/posts',
    title: 'Posts & reels',
    description: 'Create and edit social content, attachments, and credit costs.',
  },
  {
    to: '/client-admin/types',
    title: 'Content types',
    description: 'Manage types such as Post and Reel (category = type).',
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
  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client Admin</p>
          <h1>Dashboard</h1>
          <p className="muted">Manage content types, posts, tags, plans, and hub settings.</p>
        </div>
        <AdminSubnav />
      </div>

      <div className="admin-dashboard-grid">
        {sections.map((section) => (
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
