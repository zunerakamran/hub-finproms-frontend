import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { brandLogoUrl } from '../utils/brandLogo'

function resolveNavCatalogType(search) {
  const type = new URLSearchParams(search).get('type')
  const value = String(type || '').trim().toLowerCase()
  if (value === 'reel' || value === 'reels') return 'reel'
  return 'post'
}

export default function Layout() {
  const { user, logout, isAdvisor, isAuthenticated } = useAuth()
  const { can, hub, hasDashboardAccess, branding, isActingAsAdvisor, registrationEnabled } =
    useHub()
  const location = useLocation()
  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'
  const logoUrl = brandLogoUrl(branding, { onDark: false })
  const showPlans =
    can('member_view_plans') && (can('public_subscribe') || can('paid_credits'))
  const isHome = location.pathname === '/'

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
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
              Home
            </NavLink>
            {isAuthenticated && can('member_browse_catalog') && (
              <NavLink
                to="/posts?type=post"
                className={() =>
                  location.pathname === '/posts' &&
                  resolveNavCatalogType(location.search) === 'post'
                    ? 'is-active'
                    : undefined
                }
              >
                Posts
              </NavLink>
            )}
            {isAuthenticated && can('member_browse_catalog') && (
              <NavLink
                to="/posts?type=reel"
                className={() =>
                  location.pathname === '/posts' &&
                  resolveNavCatalogType(location.search) === 'reel'
                    ? 'is-active'
                    : undefined
                }
              >
                Reels
              </NavLink>
            )}
            {isAuthenticated && can('member_browse_catalog') && (
              <NavLink
                to="/bundles"
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                Bundles
              </NavLink>
            )}
            {isAuthenticated && showPlans && (
              <NavLink
                to="/subscriptions"
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                Subscriptions
              </NavLink>
            )}
            {isAuthenticated && hasDashboardAccess && (
              <NavLink
                to="/my-dashboard"
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                Dashboard
              </NavLink>
            )}
          </nav>

          <div className="site-header__actions">
            {isAuthenticated ? (
              <>
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
              </>
            ) : (
              <>
                <NavLink to="/login" className="btn ghost site-auth-btn">
                  Log in
                </NavLink>
                {registrationEnabled && (
                  <NavLink to="/register" className="btn primary site-auth-btn">
                    Sign up
                  </NavLink>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className={`site-main${isHome ? ' site-main--home' : ''}`}>
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
