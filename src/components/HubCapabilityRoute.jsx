import { Navigate } from 'react-router-dom'
import PageLoader from './PageLoader'
import { useHub } from '../context/HubContext'

/**
 * Gate a client-admin / power-admin page by hub dashboard capability.
 * Pass `capability` for a single flag, or `anyOf` for OR logic.
 * Pass `billingPayer` to require payment-card access (client_admin only
 * when advisor billing is on).
 */
export default function HubCapabilityRoute({
  capability,
  anyOf,
  billingPayer = false,
  children,
  fallback = '/my-dashboard',
}) {
  const { can, loading, hub, canManagePaymentCard } = useHub()

  if (loading && !hub) {
    return <PageLoader />
  }

  if (billingPayer && !canManagePaymentCard) {
    return <Navigate to={fallback} replace />
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
