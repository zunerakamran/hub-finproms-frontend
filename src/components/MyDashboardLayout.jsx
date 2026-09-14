import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import ActingHubSwitcher from './ActingHubSwitcher'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import {
  DASHBOARD_GROUPS,
  findActiveDashboardLink,
  getVisibleDashboardNav,
} from '../dashboard/nav'

export default function MyDashboardLayout() {
  const { user, logout, canPower } = useAuth()
  const { can, hub, branding, advisorBillingEnabled, isActingOnWhiteLabel, actingHub } = useHub()
  const navigate = useNavigate()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'
  const logoUrl = branding?.logo_url || null

  const visible = useMemo(
    () =>
      getVisibleDashboardNav({
        can,
        canPower,
        advisorBillingEnabled,
        isActingOnWhiteLabel,
      }),
    [advisorBillingEnabled, can, canPower, isActingOnWhiteLabel]
  )

  const activeLink = useMemo(
    () => findActiveDashboardLink(location.pathname),
    [location.pathname]
  )
  const isOverview = location.pathname === '/my-dashboard'
  const pageTitle = isOverview
    ? 'Overview'
    : activeLink?.title || activeLink?.label || 'Workspace'
  const sectionLabel = isOverview
    ? 'Dashboard'
    : DASHBOARD_GROUPS[activeLink?.group] || 'Dashboard'

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!navOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.body.classList.add('dash-nav-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('dash-nav-open')
    }
  }, [navOpen])

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`dash-shell${navOpen ? ' is-nav-open' : ''}`}>
      <button
        type="button"
        className="dash-nav-backdrop"
        aria-label="Close menu"
        tabIndex={navOpen ? 0 : -1}
        onClick={() => setNavOpen(false)}
      />

      <aside className="dash-sidebar" id="dash-sidebar">
        <div className="dash-sidebar__brand">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="dash-sidebar__logo" />
          ) : (
            <span className="dash-sidebar__mark" aria-hidden="true">
              {String(brandName).charAt(0)}
            </span>
          )}
          <div>
            <p className="dash-sidebar__kicker">{brandName}</p>
            <strong>Dashboard</strong>
          </div>
          <button
            type="button"
            className="dash-sidebar__close"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
          >
            ×
          </button>
        </div>

        {isActingOnWhiteLabel ? (
          <div className="dash-acting-pill">Controlling {actingHub?.name}</div>
        ) : null}

        <nav className="dash-nav" aria-label="Dashboard sections">
          {visible.map((link) =>
            link.kind === 'section' ? (
              <p key={`section-${link.label}`} className="dash-nav__section" role="presentation">
                {link.label}
              </p>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                {link.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="dash-sidebar__footer">
          <NavLink to="/" className="dash-site-link">
            ← Back to website
          </NavLink>
          <div className="dash-user-row">
            <span className="dash-user-avatar" aria-hidden="true">
              {String(user?.name || 'U').charAt(0).toUpperCase()}
            </span>
            <div className="dash-user-row__meta">
              <strong>{user?.name}</strong>
              <span className="muted">{user?.email || user?.role}</span>
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
            <div className="dash-topbar__title-row">
              <button
                type="button"
                className="dash-menu-btn"
                aria-expanded={navOpen}
                aria-controls="dash-sidebar"
                onClick={() => setNavOpen((open) => !open)}
              >
                <span className="dash-menu-btn__bars" aria-hidden="true" />
                Menu
              </button>
              <div>
                <p className="dash-topbar__eyebrow">{sectionLabel}</p>
                <p className="dash-topbar__title">{pageTitle}</p>
              </div>
            </div>
            <ActingHubSwitcher />
          </div>
          <div className="dash-topbar__links">
            <NavLink to="/" className="dash-top-link">
              Website
            </NavLink>
            <NavLink to="/my-dashboard" className="dash-top-link" end>
              Overview
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
