import { Navigate, useLocation } from 'react-router-dom'
import PageLoader from './PageLoader'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import Home from '../pages/Home'

/**
 * Shared hubs: home is public catalog (no login required for landing).
 * Central Hub: home follows member_view_site_pages (default off → dashboard;
 * enable in Capabilities to show the public site shell).
 * Roles without member_view_site_pages cannot open the website.
 * White-labelled hubs: home requires authentication.
 */
export default function HomeRoute() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { hub, canViewSitePages, loading: hubLoading } = useHub()
  const location = useLocation()

  if (authLoading || hubLoading) {
    return <PageLoader />
  }

  const isShared = hub?.type === 'shared'

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
