import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { brandLogoUrl } from '../utils/brandLogo'

export default function Layout() {
  const { user, logout, isAdvisor } = useAuth()
  const { can, hub, hasDashboardAccess, branding, isActingAsAdvisor } = useHub()
  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'
  const logoUrl = brandLogoUrl(branding, { onDark: false })
  const showPlans =
    can('member_view_plans') && (can('public_subscribe') || can('paid_credits'))

  const creditsLabel =
    user?.has_unlimited_credits ||
    (can('unlimited_credits') && (isAdvisor || isActingAsAdvisor))
      ? 'Unlimited'
      : `${user?.credits ?? 0}`

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <NavLink to="/" className="site-brand">
            {logoUrl ? <img src={logoUrl} alt="" className="site-brand__logo" /> : (
              <span className="site-brand__mark" aria-hidden="true">
                {String(brandName).charAt(0)}
              </span>
            )}
            <span className="site-brand__text">{brandName}</span>
          </NavLink>

          <nav className="site-nav" aria-label="Main">
            {can('member_browse_catalog') && (
              <NavLink to="/" end className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                Posts
              </NavLink>
            )}
            {can('member_browse_catalog') && (
              <NavLink to="/bundles" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                Bundles
              </NavLink>
            )}
            {showPlans && (
              <NavLink
                to="/subscriptions"
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                Subscriptions
              </NavLink>
            )}
            {hasDashboardAccess && (
              <NavLink
                to="/my-dashboard"
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                Dashboard
              </NavLink>
            )}
          </nav>

          <div className="site-header__actions">
            <div className="site-credit-chip" title="Credit balance">
              <span className="site-credit-chip__label">Credits</span>
              <strong>{creditsLabel}</strong>
            </div>
            <div className="site-user">
              <span className="site-user__avatar" aria-hidden="true">
                {String(user?.name || 'U').charAt(0).toUpperCase()}
              </span>
              <span className="site-user__name">{user?.name}</span>
            </div>
            <button type="button" className="btn site-logout" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <span>{brandName}</span>
          <span className="muted">Compliant content, ready to publish</span>
        </div>
      </footer>
    </div>
  )
}
