import { useEffect, useMemo, useRef } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthFavicon from '../components/AuthFavicon'
import AuthScreen from '../components/AuthScreen'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { markNavigationContinuity } from '../security/navigationContinuity'

function ShieldIcon() {
  return (
    <svg className="nav-blocked__icon-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        className="nav-blocked__icon-shield"
        d="M24 4 8 10v12c0 11.2 7.2 21.6 16 24 8.8-2.4 16-12.8 16-24V10L24 4z"
      />
      <path
        className="nav-blocked__icon-slash"
        d="M16.5 16.5 31.5 31.5"
      />
      <circle className="nav-blocked__icon-dot" cx="24" cy="22" r="2.6" />
    </svg>
  )
}

export default function ExternalNavigationBlocked() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { hub, branding, canViewSitePages } = useHub()
  const navigate = useNavigate()
  const location = useLocation()
  const reported = useRef(false)
  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'
  // Central (and others) may disable the public home via capabilities —
  // then `/` is not a usable destination; send them to the dashboard instead.
  const safePath = canViewSitePages ? '/' : '/my-dashboard'
  const safeLabel = canViewSitePages ? 'Back to home' : 'Go to dashboard'

  const blockedPath = useMemo(() => {
    const full = `${location.pathname}${location.search || ''}`
    if (full.length <= 72) return full
    return `${full.slice(0, 34)}…${full.slice(-28)}`
  }, [location.pathname, location.search])

  useEffect(() => {
    // Only record for authenticated sessions — guests are sent to login instead.
    if (!isAuthenticated || reported.current) return
    reported.current = true
    api.reportExternalNavigationBlocked({
      path: `${location.pathname}${location.search || ''}`,
      referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
    }).catch(() => {})
  }, [isAuthenticated, location.pathname, location.search])

  const goSafe = (path) => {
    markNavigationContinuity()
    navigate(path, { replace: true })
  }

  // Guests must not see this error — send them to sign-in.
  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <AuthScreen className="nav-blocked-screen">
      <div className="auth-screen__panel nav-blocked">
        <div className="auth-screen__brand">
          <AuthFavicon />
          <div>
            <p className="eyebrow">{brandName}</p>
            <h1>Access blocked</h1>
          </div>
        </div>

        <div className="nav-blocked__hero" aria-hidden="true">
          <div className="nav-blocked__icon">
            <ShieldIcon />
          </div>
        </div>

        <p className="nav-blocked__lead">
          This page cannot be opened from an external link, email, chat, or another
          application.
        </p>

        <div className="nav-blocked__alert" role="alert">
          <span className="nav-blocked__alert-label">Security check</span>
          <p>
            Copied URLs and redirects from outside {brandName} are not allowed.
            Open the hub from the official sign-in or dashboard, then move between
            pages inside the application.
          </p>
        </div>

        <div className="nav-blocked__meta">
          <span className="nav-blocked__meta-label">Blocked path</span>
          <code className="nav-blocked__path" title={`${location.pathname}${location.search || ''}`}>
            {blockedPath}
          </code>
        </div>

        <ul className="nav-blocked__reasons">
          <li>Email or chat links</li>
          <li>Copied / pasted addresses</li>
          <li>Redirects from other apps</li>
        </ul>

        <div className="nav-blocked__actions">
          <button type="button" className="btn primary full" onClick={() => goSafe(safePath)}>
            {safeLabel}
          </button>
        </div>
      </div>
    </AuthScreen>
  )
}
