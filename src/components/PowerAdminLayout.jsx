import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const links = [
  { to: '/power-admin', label: 'Dashboard', end: true, capability: 'pa_view_dashboard' },
  { to: '/power-admin/payment-methods', label: 'Payment methods', capability: 'pa_manage_payment_methods' },
  { to: '/power-admin/users', label: 'Users & roles', capability: 'pa_manage_users_roles' },
  {
    to: '/power-admin/advisor-pricing',
    label: 'Advisor rates',
    hubCapability: 'dashboard_manage_advisor_pricing',
  },
  {
    to: '/power-admin/advisor-renewal',
    label: 'Advisor renew day',
    hubCapability: 'dashboard_manage_advisor_renewal',
  },
  {
    to: '/power-admin/plans',
    label: 'Subscription plans',
    hubCapability: 'dashboard_manage_plans',
  },
  { to: '/power-admin/hubs', label: 'White-label hubs', capability: 'pa_manage_hubs' },
  { to: '/power-admin/checklist', label: 'Functionalities', capability: 'pa_manage_hub_checklists' },
  {
    to: '/power-admin/capabilities',
    label: 'Capabilities',
    capability: 'pa_manage_power_capabilities',
  },
  {
    to: '/power-admin/advisors',
    label: 'Advisors',
    hubAnyOf: ['advisor_excel_import', 'advisor_discontinue'],
  },
  {
    to: '/power-admin/advisor-invoices',
    label: 'Advisor invoices',
    hubCapability: 'dashboard_view_advisor_invoices',
  },
  {
    to: '/power-admin/activity-logs',
    label: 'Activity logs',
    hubCapability: 'dashboard_view_activity_logs',
  },
]

export default function PowerAdminLayout() {
  const { user, logout, canPower } = useAuth()
  const { can } = useHub()
  const navigate = useNavigate()

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const visible = links.filter((link) => {
    if (Array.isArray(link.hubAnyOf) && link.hubAnyOf.length > 0) {
      return link.hubAnyOf.some((flag) => can(flag))
    }
    if (link.hubCapability) return can(link.hubCapability)
    if (link.capability) return canPower(link.capability)
    return true
  })

  return (
    <div className="admin-app-shell power-admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="admin-shell-kicker">Hub Finproms</span>
          <strong>Power Admin</strong>
        </div>
        <nav className="admin-subnav" aria-label="Power admin sections">
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
