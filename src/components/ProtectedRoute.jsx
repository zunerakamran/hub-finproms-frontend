import { Navigate, useLocation } from 'react-router-dom'
import PageLoader from './PageLoader'
import ExternalNavigationBlocked from '../pages/ExternalNavigationBlocked'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import {
  hasCrossOriginReferrer,
  isAllowlistedExternalPath,
  markNavigationContinuity,
  shouldBlockExternalNavigation,
} from '../security/navigationContinuity'

export function ProtectedRoute({
  children,
  adminOnly = false,
  clientAdminOnly = false,
  powerAdminOnly = false,
  dashboardOnly = false,
}) {
  const { isAuthenticated, isPowerAdmin, loading: authLoading } = useAuth()
  const { hasHubDashboardAccess, hasDashboardAccess, canViewSitePages, loading: hubLoading } = useHub()
  const location = useLocation()
  // Hubs without member_view_site_pages have no usable `/` home page.
  const softLandPath = canViewSitePages ? '/' : '/my-dashboard'

  if (authLoading || hubLoading) {
    return <PageLoader />
  }

  // Guests never see the external-entry error — send them to sign-in first.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // NFR-SEC-NAV: logged-in users cannot open protected pages via external entry
  // (even when session cookies are still valid).
  // - Cross-site referrer (webmail / other app) → security error page.
  // - No referrer (tab search autocomplete, address bar, paste) → soft-land on
  //   home (or dashboard when the hub has no home page) so the deep link is
  //   not opened and the block page is not shown.
  if (shouldBlockExternalNavigation(location.pathname)) {
    if (!hasCrossOriginReferrer()) {
      markNavigationContinuity()
      return <Navigate to={softLandPath} replace />
    }
    return <ExternalNavigationBlocked />
  }

  // Payment / bank-transfer return URLs: establish continuity so in-app nav works after.
  if (isAllowlistedExternalPath(location.pathname)) {
    markNavigationContinuity()
  }
  if (powerAdminOnly && !isPowerAdmin) return <Navigate to="/my-dashboard" replace />
  if ((adminOnly || clientAdminOnly) && !hasHubDashboardAccess) {
    return <Navigate to="/my-dashboard" replace />
  }
  if (dashboardOnly && !hasDashboardAccess) {
    return <Navigate to="/" replace />
  }

  return children
}
