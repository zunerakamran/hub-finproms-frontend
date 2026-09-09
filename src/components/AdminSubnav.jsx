import { NavLink } from 'react-router-dom'
import { useHub } from '../context/HubContext'

const baseLinks = [
  { to: '/client-admin', label: 'Dashboard', end: true },
  { to: '/client-admin/posts', label: 'Posts' },
  { to: '/client-admin/types', label: 'Types' },
  { to: '/client-admin/categories', label: 'Categories' },
  { to: '/client-admin/tags', label: 'Tags' },
  { to: '/client-admin/plans', label: 'Plans' },
  { to: '/client-admin/settings', label: 'Settings' },
  { to: '/client-admin/bank-transfers', label: 'Bank transfers' },
]

export default function AdminSubnav() {
  const { can } = useHub()
  const links = [...baseLinks]
  if (can('advisor_excel_import')) {
    links.splice(6, 0, { to: '/client-admin/advisors', label: 'Advisors' })
  }

  return (
    <nav className="admin-subnav admin-sidebar-nav" aria-label="Client admin sections">
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.end}>
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
