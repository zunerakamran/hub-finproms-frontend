import { NavLink } from 'react-router-dom'

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/posts', label: 'Posts' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/tags', label: 'Tags' },
  { to: '/admin/plans', label: 'Plans' },
]

export default function AdminSubnav() {
  return (
    <nav className="admin-subnav" aria-label="Admin sections">
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.end}>
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
