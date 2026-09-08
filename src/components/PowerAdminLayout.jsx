import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/power-admin', label: 'Dashboard', end: true },
  { to: '/power-admin/hubs', label: 'White-label hubs' },
  { to: '/power-admin/checklist', label: 'Rights checklist' },
]

export default function PowerAdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const onLogout = async () => {
    await logout()
    navigate('/power-admin/login', { replace: true })
  }

  return (
    <div className="admin-app-shell power-admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="admin-shell-kicker">Hub Finproms</span>
          <strong>Power Admin</strong>
        </div>
        <nav className="admin-subnav" aria-label="Power admin sections">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <NavLink to="/" className="admin-site-link">
            View main website →
          </NavLink>
          <span className="user-name">{user?.name}</span>
          <button type="button" className="btn ghost" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>
      <div className="admin-app-main">
        <header className="admin-topbar">
          <p className="muted">Platform control plane for white-labelled hubs</p>
          <div className="admin-topbar-links">
            <NavLink to="/" className="admin-home-link">
              Main website
            </NavLink>
            <NavLink to="/power-admin" className="admin-home-link" end>
              Dashboard home
            </NavLink>
          </div>
        </header>
        <main className="admin-page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
