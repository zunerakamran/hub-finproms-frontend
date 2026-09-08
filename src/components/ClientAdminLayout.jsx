import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminSubnav from './AdminSubnav'

export default function ClientAdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const onLogout = async () => {
    await logout()
    navigate('/client-admin/login', { replace: true })
  }

  return (
    <div className="admin-app-shell client-admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="admin-shell-kicker">Hub Finproms</span>
          <strong>Client Admin</strong>
        </div>
        <AdminSubnav />
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
          <p className="muted">Manage hub content, types, categories, plans, and settings</p>
          <div className="admin-topbar-links">
            <NavLink to="/" className="admin-home-link">
              Main website
            </NavLink>
            <NavLink to="/client-admin" className="admin-home-link" end>
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
