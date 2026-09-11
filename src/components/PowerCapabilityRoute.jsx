import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Gate a Power Admin platform page by pa_* capability.
 */
export default function PowerCapabilityRoute({
  capability,
  anyOf,
  children,
  fallback = '/my-dashboard',
}) {
  const { canPower, isPowerAdmin, loading } = useAuth()

  if (loading) {
    return <div className="state">Loading...</div>
  }

  if (!isPowerAdmin) {
    return <Navigate to={fallback} replace />
  }

  const flags = Array.isArray(anyOf) && anyOf.length > 0
    ? anyOf
    : capability
      ? [capability]
      : []

  const allowed = flags.length === 0 ? true : flags.some((flag) => canPower(flag))

  if (!allowed) {
    return <Navigate to={fallback} replace />
  }

  return children
}
