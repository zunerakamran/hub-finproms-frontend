import { Navigate, useLocation } from 'react-router-dom'
import PageLoader from './PageLoader'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import Home from '../pages/Home'

/**
 * Shared hubs: home is public catalog (no login required for landing).
 * Central Hub Controller / roles without member_view_site_pages: guests → login, users → dashboard.
 * White-labelled hubs: home requires authentication.
 */
export default function HomeRoute() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { hub, can, loading: hubLoading } = useHub()
  const location = useLocation()

  if (authLoading || hubLoading) {
    return <PageLoader />
  }

  const isShared = hub?.type === 'shared'
  const canViewSitePages = can('member_view_site_pages')

  if (!canViewSitePages) {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace state={{ from: location }} />
    }
    return <Navigate to="/my-dashboard" replace />
  }

  if (!isShared && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Home />
}
