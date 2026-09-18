import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import AdminSubnav from './AdminSubnav'
import WebsiteNavLink from './WebsiteNavLink'

export default function ClientAdminLayout() {
  const { user, logout } = useAuth()
  const { branding, hub, roleLabel } = useHub()
  const navigate = useNavigate()
  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const shellTitle = roleLabel(user?.role)

  return (
    <div className="dash-shell">
      <aside className="dash-sidebar">
        <div className="dash-sidebar__brand">
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt="" className="dash-sidebar__logo" />
          ) : (
            <span className="dash-sidebar__mark" aria-hidden="true">
              {String(brandName).charAt(0)}
            </span>
          )}
          <div>
            <p className="dash-sidebar__kicker">{brandName}</p>
            <strong>{shellTitle}</strong>
          </div>
        </div>
        <AdminSubnav />
        <div className="dash-sidebar__footer">
          <WebsiteNavLink className="dash-site-link">← Back to website</WebsiteNavLink>
          <div className="dash-user-row">
            <span className="dash-user-avatar" aria-hidden="true">
              {String(user?.name || 'U').charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{user?.name}</strong>
              <span className="muted">{shellTitle}</span>
            </div>
          </div>
          <button type="button" className="btn ghost full" onClick={onLogout}>
            Log out
          </button>
        </div>
      </aside>
      <div className="dash-main">
        <header className="dash-topbar">
          <div className="dash-topbar__lead">
            <h1 className="dash-topbar__title">{shellTitle}</h1>
          </div>
          <div className="dash-topbar__links">
            <WebsiteNavLink className="dash-top-link">Website</WebsiteNavLink>
            <NavLink to="/client-admin" className="dash-top-link" end>
              Home
            </NavLink>
          </div>
        </header>
        <main className="dash-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
