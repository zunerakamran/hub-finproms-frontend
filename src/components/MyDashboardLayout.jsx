import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { DASHBOARD_LINKS, isDashboardLinkVisible } from '../dashboard/nav'

export default function MyDashboardLayout() {
  const { user, logout, canPower } = useAuth()
  const { can, hub, advisorBillingEnabled } = useHub()
  const navigate = useNavigate()

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const visible = DASHBOARD_LINKS.filter((link) =>
    isDashboardLinkVisible(link, { can, canPower, advisorBillingEnabled })
  )

  return (
    <div className="admin-app-shell member-dashboard-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="admin-shell-kicker">{hub?.name || 'Hub Finproms'}</span>
          <strong>Dashboard</strong>
        </div>
        <nav className="admin-subnav" aria-label="Dashboard sections">
          {visible.map((link) => (
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
          <p className="muted">
            Tools shown here come from Capabilities set by Power Admin for your role.
          </p>
          <div className="admin-topbar-links">
            <NavLink to="/" className="admin-home-link">
              Main website
            </NavLink>
            <NavLink to="/my-dashboard" className="admin-home-link" end>
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
