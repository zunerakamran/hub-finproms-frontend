import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import ActingHubSwitcher from './ActingHubSwitcher'
import ActingAdvisorSwitcher from './ActingAdvisorSwitcher'
import PageLoader from './PageLoader'
import WebsiteNavLink from './WebsiteNavLink'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import {
  applyDashboardNavLabel,
  findActiveDashboardLink,
  getVisibleDashboardNav,
  isDashboardLinkVisible,
  isDashboardNavActive,
  resolveDashboardGroupLabel,
  resolveItemGroup,
} from '../dashboard/nav'
import { brandLogoUrl } from '../utils/brandLogo'

export default function MyDashboardLayout() {
  const { user, logout, canPower } = useAuth()
  const { can, hub, branding, advisorBillingEnabled, canManagePaymentCard, isActingOnWhiteLabel, isActingRemotely, isControlPlane, actingHub, actingHubId, actingHubSwitching, hubRefreshing, actingAdvisor, roleLabel, canViewSitePages } = useHub()
  const dashboardNav = hub?.dashboard_nav || null
  const navBusy = Boolean(hubRefreshing || actingHubSwitching)
  const navigate = useNavigate()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const topbarRef = useRef(null)
  const dashMainRef = useRef(null)

  // WC CSS is large — load only when a Website Compliance route is open.
  useEffect(() => {
    if (!location.pathname.includes('/website-compliance')) return undefined
    let cancelled = false
    import('../websiteCompliance/wc.css').catch(() => {
      if (!cancelled) {
        // Styles are best-effort; page remains usable without them.
      }
    })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'
  const logoUrl = brandLogoUrl(branding, { onDark: true })
  // Remount the white content panel when the controlled hub changes so page data reloads.
  const contentKey = `${isActingRemotely ? (isActingOnWhiteLabel ? 'wl' : 'shared') : 'home'}:${actingHubId ?? hub?.id ?? 'hub'}`
  const isWhiteLabelHub = Boolean(
    isActingOnWhiteLabel || hub?.type === 'white_label' || actingHub?.is_white_label
  )

  const visible = useMemo(
    () =>
      getVisibleDashboardNav({
        can,
        canPower,
        advisorBillingEnabled,
        canManagePaymentCard,
        isActingOnWhiteLabel,
        isWhiteLabelHub,
        isControlPlane,
        isActingRemotely,
        userRole: user?.role,
        dashboardNav,
      }),
    [advisorBillingEnabled, canManagePaymentCard, can, canPower, isActingOnWhiteLabel, isWhiteLabelHub, isControlPlane, isActingRemotely, user?.role, dashboardNav]
  )

  const activeLink = useMemo(
    () => findActiveDashboardLink(location.pathname),
    [location.pathname]
  )
  const isOverview = location.pathname === '/my-dashboard'
  const groupLabelOpts = {
    isWhiteLabelHub,
    isControlPlane,
    isActingRemotely,
    dashboardNav,
  }
  const sectionLabel = isOverview
    ? resolveDashboardGroupLabel('dashboard', groupLabelOpts)
    : resolveDashboardGroupLabel(
        resolveItemGroup(activeLink?.to, dashboardNav, activeLink?.group || 'dashboard'),
        groupLabelOpts
      )

  // Leave pages that are unavailable for the selected hub (e.g. White-labelled hubs while controlling a WL tenant).
  useEffect(() => {
    if (navBusy) return
    if (location.pathname === '/my-dashboard') return

    const link = findActiveDashboardLink(location.pathname)
    if (!link) return

    // Nested routes (e.g. /social-media-compliance/42) can resolve to a parent nav
    // item whose caps are narrower than HubCapabilityRoute on the detail page.
    // Only enforce nav visibility on the link's own path (or explicit alsoMatch).
    const onLinkPath =
      location.pathname === link.to ||
      (link.alsoMatch || []).some(
        (prefix) => location.pathname === prefix || location.pathname.startsWith(prefix)
      )
    if (!onLinkPath) return

    const stillVisible = isDashboardLinkVisible(link, {
      can,
      canPower,
      advisorBillingEnabled,
      canManagePaymentCard,
      isActingOnWhiteLabel,
      isWhiteLabelHub,
      isControlPlane,
      isActingRemotely,
      userRole: user?.role,
    })

    if (!stillVisible) {
      navigate('/my-dashboard', { replace: true })
    }
  }, [
    navBusy,
    location.pathname,
    can,
    canPower,
    advisorBillingEnabled,
    canManagePaymentCard,
    isActingOnWhiteLabel,
    isWhiteLabelHub,
    isControlPlane,
    isActingRemotely,
    actingHubId,
    user?.role,
    navigate,
  ])

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

  // Expose real topbar height so in-page sticky headers (e.g. WC section bar) sit below it
  useEffect(() => {
    const topbar = topbarRef.current
    const main = dashMainRef.current
    if (!topbar || !main) return undefined

    const syncHeight = () => {
      const height = Math.ceil(topbar.getBoundingClientRect().height)
      main.style.setProperty('--dash-topbar-height', `${height}px`)
    }

    syncHeight()
    const observer = new ResizeObserver(syncHeight)
    observer.observe(topbar)
    return () => observer.disconnect()
  }, [])

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  // Hub switch / caps refresh: one full-screen white loader only (no sidebar + content spinners).
  if (navBusy) {
    return <PageLoader />
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

      <aside className="dash-sidebar" id="dash-sidebar" aria-busy={navBusy || undefined}>
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

        {isActingRemotely ? (
          <div className="dash-acting-pill">Controlling {actingHub?.name}</div>
        ) : null}
        {actingAdvisor ? (
          <div className="dash-acting-pill">
            On behalf of {actingAdvisor.name} — acting as {roleLabel('advisor') || 'Advisor'} (
            {roleLabel('admin_staff') || 'Admin-staff'})
          </div>
        ) : null}

        <nav className="dash-nav" aria-label="Dashboard sections">
          {visible.map((link) =>
            link.kind === 'section' ? (
              <p
                key={`section-${link.id || link.label}`}
                className="dash-nav__section"
                role="presentation"
              >
                {resolveDashboardGroupLabel(link.id || link.label, groupLabelOpts)}
              </p>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={() =>
                  isDashboardNavActive(link, location.pathname) ? 'is-active' : undefined
                }
              >
                {applyDashboardNavLabel(link, dashboardNav).label}
              </NavLink>
            )
          )}
        </nav>
      </aside>

      <div className="dash-main" ref={dashMainRef}>
        <header className="dash-topbar" ref={topbarRef}>
          <div className="dash-topbar__lead">
            <div className="dash-topbar__toolbar">
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
              <p className="dash-topbar__section" role="presentation">
                {sectionLabel}
              </p>
              <ActingHubSwitcher />
            </div>
            <ActingAdvisorSwitcher />
          </div>
          <div className="dash-topbar__session">
            {canViewSitePages ? (
              <WebsiteNavLink className="dash-back-link">Back to website</WebsiteNavLink>
            ) : null}
            <p className="dash-session-welcome">
              <span>Welcome</span>
              <strong>{user?.name || 'there'}</strong>
              {user?.email ? <span className="dash-session-email">{user.email}</span> : null}
            </p>
            <button type="button" className="dash-logout-link" onClick={onLogout}>
              Log out
            </button>
          </div>
        </header>
        <main className="dash-content">
          <Outlet key={contentKey} />
        </main>
      </div>
    </div>
  )
}
