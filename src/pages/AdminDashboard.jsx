import { Link } from 'react-router-dom'
import AdminSubnav from '../components/AdminSubnav'

const sections = [
  {
    to: '/admin/posts',
    title: 'Posts',
    description: 'Create and edit social media posts, attachments, and credit costs.',
  },
  {
    to: '/admin/categories',
    title: 'Categories',
    description: 'Manage post categories shown in the post form dropdown.',
  },
  {
    to: '/admin/tags',
    title: 'Tags',
    description: 'Manage tags available when creating or editing posts.',
  },
  {
    to: '/admin/plans',
    title: 'Subscription plans',
    description: 'Add and update credit packages users can purchase.',
  },
]

export default function AdminDashboard() {
  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Dashboard</h1>
          <p className="muted">Manage posts, categories, tags, and subscription plans.</p>
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
