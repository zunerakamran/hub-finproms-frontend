import { useEffect, useId, useState } from 'react'
import { FaBars, FaTimes } from 'react-icons/fa'
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
  const menuId = useId()
  const [menuOpen, setMenuOpen] = useState(false)
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
  const navTagline = tHome('nav_tagline', 'Compliant content hub').trim()
  const footerTagline = tHome('footer_tagline', 'Compliant content, ready to publish')
  const poweredByName =
    tHome('footer_powered_by_name', '').trim() ||
    tHome('footer_powered_by', 'Powered by Bypass').replace(/^powered by\s+/i, '').trim() ||
    'Bypass'
  const poweredByLogo = tHome('footer_powered_by_logo', '').trim()
  const poweredByUrl = tHome('footer_powered_by_url', '').trim()
  const poweredByLabel = `Powered by ${poweredByName}`
  const userInitial = String(user?.name || 'U').charAt(0).toUpperCase()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('site-nav-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('site-nav-open')
    }
  }, [menuOpen])

  const postActive =
    location.pathname === '/posts' && resolveNavCatalogType(location.search) === 'post'
  const reelActive =
    location.pathname === '/posts' && resolveNavCatalogType(location.search) === 'reel'

  const navLinks = (
    <>
      {canViewSitePages && (
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
          Home
        </NavLink>
      )}
      {showCatalog && (
        <NavLink to="/posts?type=post" className={() => (postActive ? 'is-active' : undefined)}>
          Posts
        </NavLink>
      )}
      {showCatalog && (
        <NavLink to="/posts?type=reel" className={() => (reelActive ? 'is-active' : undefined)}>
          Reels
        </NavLink>
      )}
      {showBundles && (
        <NavLink to="/bundles" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
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
    </>
  )

  const authActions = isAuthenticated ? (
    <>
      {canViewSitePages && (
        <div className="site-credit-chip" title="Credit balance">
          <span className="site-credit-chip__label">Credits</span>
          <strong>{creditsLabel}</strong>
        </div>
      )}
      <div className="site-user">
        <span className="site-user__avatar" aria-hidden="true">
          {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : userInitial}
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
  )

  return (
    <div className={`site-shell${menuOpen ? ' is-nav-open' : ''}`}>
      <header className="site-header">
        <div className="site-header__accent" aria-hidden="true" />
        <div className="site-header__inner">
          <NavLink to={canViewSitePages ? '/' : '/my-dashboard'} className="site-brand">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="site-brand__logo" />
            ) : (
              <span className="site-brand__mark" aria-hidden="true">
                {String(brandName).charAt(0)}
              </span>
            )}
            <span className="site-brand__copy">
              <span className="site-brand__text">{brandName}</span>
              {navTagline ? <span className="site-brand__tagline">{navTagline}</span> : null}
            </span>
          </NavLink>

          <nav className="site-nav site-nav--desktop" aria-label="Main">
            {navLinks}
          </nav>

          <div className="site-header__actions site-header__actions--desktop">{authActions}</div>

          <button
            type="button"
            className="site-menu-btn"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <FaTimes aria-hidden="true" /> : <FaBars aria-hidden="true" />}
          </button>
        </div>
      </header>

      <button
        type="button"
        className="site-nav-backdrop"
        aria-label="Close menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <aside id={menuId} className="site-mobile-panel" aria-hidden={!menuOpen}>
        <div className="site-mobile-panel__head">
          <div className="site-mobile-panel__brand">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="site-brand__logo" />
            ) : (
              <span className="site-brand__mark" aria-hidden="true">
                {String(brandName).charAt(0)}
              </span>
            )}
            <div>
              <strong>{brandName}</strong>
              <span className="muted">Menu</span>
            </div>
          </div>
          <button
            type="button"
            className="site-menu-btn site-menu-btn--panel"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        <nav className="site-nav site-nav--mobile" aria-label="Main mobile">
          {navLinks}
        </nav>

        <div className="site-mobile-panel__actions">{authActions}</div>
      </aside>

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
