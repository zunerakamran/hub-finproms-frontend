import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, adminOnly = false, clientAdminOnly = false }) {
  const { isAuthenticated, isClientAdmin, loading } = useAuth()
  const location = useLocation()
  const requiresClientAdmin = adminOnly || clientAdminOnly

  if (loading) return <div className="state">Loading...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (requiresClientAdmin && !isClientAdmin) return <Navigate to="/" replace />

  return children
}
