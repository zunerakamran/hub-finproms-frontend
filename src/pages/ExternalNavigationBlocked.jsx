import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthFavicon from '../components/AuthFavicon'
import AuthScreen from '../components/AuthScreen'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { markNavigationContinuity } from '../security/navigationContinuity'

export default function ExternalNavigationBlocked() {
  const { isAuthenticated } = useAuth()
  const { hub, branding } = useHub()
  const navigate = useNavigate()
  const location = useLocation()
  const reported = useRef(false)
  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'

  useEffect(() => {
    if (reported.current) return
    reported.current = true
    api.reportExternalNavigationBlocked({
      path: `${location.pathname}${location.search || ''}`,
      referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
    }).catch(() => {})
  }, [location.pathname, location.search])

  const goSafe = (path) => {
    markNavigationContinuity()
    navigate(path, { replace: true })
  }

  return (
    <AuthScreen>
      <AuthFavicon />
      <div className="auth-card">
        <p className="eyebrow">{brandName}</p>
        <h1>External link blocked</h1>
        <p className="muted">
          This page cannot be opened from an external link, email, chat, or another
          application. For security, open {brandName} from the official login or
          dashboard and move between pages inside the application.
        </p>
        <div className="alert" role="alert">
          Copied URLs and redirects from outside {brandName} are not allowed.
        </div>
        <div className="auth-screen__actions" style={{ display: 'grid', gap: '0.75rem', marginTop: '1.25rem' }}>
          {isAuthenticated ? (
            <button type="button" className="btn primary full" onClick={() => goSafe('/my-dashboard')}>
              Go to dashboard
            </button>
          ) : (
            <button type="button" className="btn primary full" onClick={() => goSafe('/login')}>
              Go to sign in
            </button>
          )}
          <button type="button" className="btn ghost full" onClick={() => goSafe('/')}>
            Go to home
          </button>
        </div>
      </div>
    </AuthScreen>
  )
}
