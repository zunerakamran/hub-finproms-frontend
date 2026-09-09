import { Navigate } from 'react-router-dom'
import { useHub } from '../context/HubContext'

/**
 * Gate a client-admin page by hub dashboard capability.
 */
export default function HubCapabilityRoute({ capability, children, fallback = '/client-admin' }) {
  const { can, loading } = useHub()

  if (loading) {
    return <div className="state">Loading...</div>
  }

  if (!can(capability)) {
    return <Navigate to={fallback} replace />
  }

  return children
}
