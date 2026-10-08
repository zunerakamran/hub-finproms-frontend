import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { brandLogoUrl } from '../utils/brandLogo'
import { fillPageText, pageText } from '../utils/pageContent'

function resolveNavCatalogType(search) {
  const type = new URLSearchParams(search).get('type')
  const value = String(type || '').trim().toLowerCase()
  if (value === 'reel' || value === 'reels') return 'reel'
  return 'post'
}

export default function Layout() {
  const { user, logout, isAdvisor, isAuthenticated } = useAuth()
  const {
    can,
    hub,
    hasDashboardAccess,
    branding,
    isActingAsAdvisor,
    registrationEnabled,
    canViewSitePages,
    pageContent,
  } = useHub()
  const location = useLocation()
  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'
  const logoUrl = brandLogoUrl(branding, { onDark: false })
  const showPlans =
    canViewSitePages &&
    can('member_view_plans') &&
    (can('public_subscribe') || can('paid_credits'))
  const isHome = location.pathname === '/'
  const showCatalog = canViewSitePages && isAuthenticated && can('member_browse_catalog')
  const showBundles = canViewSitePages && isAuthenticated && can('member_browse_bundles')
  const tHome = (key, fallback = '') => pageText(pageContent, 'home', key, fallback)
  const creditsLabel =
    user?.has_unlimited_credits ||
    (can('unlimited_credits') && (isAdvisor || isActingAsAdvisor))
      ? 'Unlimited'
      : `${user?.credits ?? 0}`

  const footerCopyright = fillPageText(
    tHome('footer_copyright', '© {year} {brand}. All rights reserved.'),
    { year: new Date().getFullYear(), brand: brandName }
  )
  const footerTagline = tHome('footer_tagline', 'Compliant content, ready to publish')
  const poweredByName =
    tHome('footer_powered_by_name', '').trim() ||
    tHome('footer_powered_by', 'Powered by Bypass').replace(/^powered by\s+/i, '').trim() ||
    'Bypass'
  const poweredByLogo = tHome('footer_powered_by_logo', '').trim()
  const poweredByUrl = tHome('footer_powered_by_url', '').trim()
  const poweredByLabel = `Powered by ${poweredByName}`
  const userInitial = String(user?.name || 'U').charAt(0).toUpperCase()

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <NavLink to={canViewSitePages ? '/' : '/my-dashboard'} className="site-brand">
            {logoUrl ? <img src={logoUrl} alt="" className="site-brand__logo" /> : (
              <span className="site-brand__mark" aria-hidden="true">
                {String(brandName).charAt(0)}
              </span>
            )}
            <span className="site-brand__text">{brandName}</span>
          </NavLink>

          <nav className="site-nav" aria-label="Main">
            {canViewSitePages && (
              <NavLink to="/" end className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                Home
              </NavLink>
            )}
            {showCatalog && (
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
            {showCatalog && (
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
            {showBundles && (
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
                {canViewSitePages && (
                  <div className="site-credit-chip" title="Credit balance">
                    <span className="site-credit-chip__label">Credits</span>
                    <strong>{creditsLabel}</strong>
                  </div>
                )}
                <div className="site-user">
                  <span className="site-user__avatar" aria-hidden="true">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" />
                    ) : (
                      userInitial
                    )}
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
                {registrationEnabled && canViewSitePages && (
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
        <div className="site-footer__inner site-footer__inner--stack">
          <div className="site-footer__row">
            <span>{brandName}</span>
            <span className="muted">{footerTagline}</span>
          </div>
          <div className="site-footer__row site-footer__credits">
            <span className="muted">{footerCopyright}</span>
            {poweredByUrl ? (
              <a
                className="site-footer__powered"
                href={poweredByUrl}
                target="_blank"
                rel="noreferrer"
              >
                {poweredByLogo ? (
                  <img src={poweredByLogo} alt="" className="site-footer__powered-logo" />
                ) : null}
                <span>
                  Powered by <span className="site-footer__powered-name">{poweredByName}</span>
                </span>
              </a>
            ) : (
              <span className="site-footer__powered" title={poweredByLabel}>
                {poweredByLogo ? (
                  <img src={poweredByLogo} alt="" className="site-footer__powered-logo" />
                ) : null}
                <span>
                  Powered by <span className="site-footer__powered-name">{poweredByName}</span>
                </span>
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
