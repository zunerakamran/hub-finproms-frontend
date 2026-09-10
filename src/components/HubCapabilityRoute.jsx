import { Navigate } from 'react-router-dom'
import { useHub } from '../context/HubContext'

/**
 * Gate a client-admin / power-admin page by hub dashboard capability.
 * Pass `capability` for a single flag, or `anyOf` for OR logic.
 */
export default function HubCapabilityRoute({
  capability,
  anyOf,
  children,
  fallback = '/client-admin',
}) {
  const { can, loading } = useHub()

  if (loading) {
    return <div className="state">Loading...</div>
  }

  const flags = Array.isArray(anyOf) && anyOf.length > 0
    ? anyOf
    : capability
      ? [capability]
      : []

  const allowed = flags.some((flag) => can(flag))

  if (!allowed) {
    return <Navigate to={fallback} replace />
  }

  return children
}
