import { Navigate, useLocation } from 'react-router-dom'
import PageLoader from './PageLoader'
import ExternalNavigationBlocked from '../pages/ExternalNavigationBlocked'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import {
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
  const { hasHubDashboardAccess, hasDashboardAccess, loading: hubLoading } = useHub()
  const location = useLocation()

  if (authLoading || hubLoading) {
    return <PageLoader />
  }

  // Guests never see the external-entry error — send them to sign-in first.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // NFR-SEC-NAV: logged-in users cannot open protected pages via paste / email /
  // chat / address-bar / other-app entry (even when session cookies are valid).
  // Home `/` and allowlisted auth/payment paths remain reachable separately.
  if (shouldBlockExternalNavigation(location.pathname)) {
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
