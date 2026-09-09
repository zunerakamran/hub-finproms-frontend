import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({
  children,
  adminOnly = false,
  clientAdminOnly = false,
  powerAdminOnly = false,
}) {
  const { isAuthenticated, isClientAdmin, isPowerAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="state">Loading...</div>
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (powerAdminOnly && !isPowerAdmin) return <Navigate to="/" replace />
  if ((adminOnly || clientAdminOnly) && !isClientAdmin) return <Navigate to="/" replace />

  return children
}
