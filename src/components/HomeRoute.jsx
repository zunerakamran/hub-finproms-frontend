import { Navigate } from 'react-router-dom'
import PageLoader from './PageLoader'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import Home from '../pages/Home'
import {
  acceptHomeDocumentEntry,
  markNavigationContinuity,
} from '../security/navigationContinuity'

/**
 * Shared hubs: home is public catalog (no login required for landing).
 * Central Hub: when member_view_site_pages is on, home is public like Shared;
 * when off, guests → login and users → dashboard.
 * White-labelled hubs: home requires authentication.
 * Roles without member_view_site_pages cannot open the website.
 *
 * NFR-SEC-NAV: `/` is always reachable (tab search / address-bar autocomplete
 * of the site URL must work). Deep protected routes remain guarded.
 */
export default function HomeRoute() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { hub, canViewSitePages, loading: hubLoading } = useHub()

  if (authLoading || hubLoading) {
    return <PageLoader />
  }

  // Tab search / address-bar autocomplete of the site URL must not be blocked.
  acceptHomeDocumentEntry(isAuthenticated)

  const isShared = hub?.type === 'shared'
  const isCentral = hub?.type === 'central' || hub?.is_central
  const publicLanding = isShared || (isCentral && canViewSitePages)

  if (!canViewSitePages) {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }
    markNavigationContinuity()
    return <Navigate to="/my-dashboard" replace />
  }

  if (!publicLanding && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Home />
}
