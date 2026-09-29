import { Navigate, useLocation } from 'react-router-dom'
import PageLoader from './PageLoader'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import Home from '../pages/Home'

/**
 * Shared hubs: home is public catalog (no login required for landing).
 * Central Hub: when member_view_site_pages is on, home is public like Shared;
 * when off, guests → login and users → dashboard.
 * White-labelled hubs: home requires authentication.
 * Roles without member_view_site_pages cannot open the website.
 */
export default function HomeRoute() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { hub, canViewSitePages, loading: hubLoading } = useHub()
  const location = useLocation()

  if (authLoading || hubLoading) {
    return <PageLoader />
  }

  const isShared = hub?.type === 'shared'
  const isCentral = hub?.type === 'central' || hub?.is_central
  const publicLanding = isShared || (isCentral && canViewSitePages)

  if (!canViewSitePages) {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace state={{ from: location }} />
    }
    return <Navigate to="/my-dashboard" replace />
  }

  if (!publicLanding && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Home />
}
