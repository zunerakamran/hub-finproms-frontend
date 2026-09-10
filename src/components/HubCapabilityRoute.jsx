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
  const { can, loading, hub } = useHub()

  // Only block on the initial hub load — never blank / remount the page afterward.
  if (loading && !hub) {
    return <div className="state">Loading...</div>
  }

  const flags = Array.isArray(anyOf) && anyOf.length > 0
    ? anyOf
    : capability
      ? [capability]
      : []

  const allowed = flags.length === 0 ? true : flags.some((flag) => can(flag))

  if (!allowed) {
    return <Navigate to={fallback} replace />
  }

  return children
}
