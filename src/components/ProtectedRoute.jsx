import { Navigate, useLocation } from 'react-router-dom'
import PageLoader from './PageLoader'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

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
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
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
