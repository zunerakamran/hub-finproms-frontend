import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import WebsiteNavLink from './WebsiteNavLink'

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
    to: '/power-admin/subscriber-credits',
    label: 'Subscriber credits',
    hubCapability: 'dashboard_manage_subscriber_credits',
  },
  {
    to: '/power-admin/plans',
    label: 'Subscription plans',
    hubCapability: 'dashboard_manage_plans',
  },
  {
    to: '/power-admin/posts',
    label: 'Posts / reels',
    hubCapability: 'dashboard_manage_posts',
  },
  {
    to: '/power-admin/bundles',
    label: 'Bundles',
    hubCapability: 'dashboard_manage_bundles',
  },
  {
    to: '/power-admin/types',
    label: 'Types',
    hubCapability: 'dashboard_manage_types',
  },
  {
    to: '/power-admin/categories',
    label: 'Categories',
    hubCapability: 'dashboard_manage_categories',
  },
  {
    to: '/power-admin/tags',
    label: 'Tags',
    hubCapability: 'dashboard_manage_tags',
  },
  {
    to: '/power-admin/firms',
    label: 'Firms',
    hubCapability: 'dashboard_manage_firms',
  },
  { to: '/power-admin/hubs', label: 'White-label hubs', capability: 'pa_manage_hubs' },
  { to: '/power-admin/checklist', label: 'Functionalities', capability: 'pa_manage_hub_checklists' },
  { to: '/power-admin/modules', label: 'Modules', hubCapability: 'dashboard_manage_modules' },
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
  const { can, branding, hub, roleLabel } = useHub()
  const navigate = useNavigate()
  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'
  const powerAdminTitle = roleLabel('power_admin')

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const visible = links.filter((link) => {
    if (link.alwaysForPowerAdmin) return true
    if (Array.isArray(link.hubAnyOf) && link.hubAnyOf.length > 0) {
      return link.hubAnyOf.some((flag) => can(flag))
    }
    if (link.hubCapability) return can(link.hubCapability)
    if (link.capability) return canPower(link.capability)
    return true
  })

  return (
    <div className="dash-shell dash-shell--power">
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
            <strong>{powerAdminTitle}</strong>
          </div>
        </div>

        <nav className="dash-nav" aria-label="Power admin sections">
          {visible.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="dash-sidebar__footer">
          <WebsiteNavLink className="dash-site-link">← Back to website</WebsiteNavLink>
          <div className="dash-user-row">
            <span className="dash-user-avatar" aria-hidden="true">
              {String(user?.name || 'U').charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{user?.name}</strong>
              <span className="muted">{powerAdminTitle}</span>
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
            <h1 className="dash-topbar__title">Platform control</h1>
          </div>
          <div className="dash-topbar__links">
            <WebsiteNavLink className="dash-top-link">Website</WebsiteNavLink>
            <NavLink to="/power-admin" className="dash-top-link" end>
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
