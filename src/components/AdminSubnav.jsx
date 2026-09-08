import { NavLink } from 'react-router-dom'

const links = [
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
