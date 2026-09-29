import PageLoader from './PageLoader'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

/**
 * Blocks the whole app until the session and current hub are resolved.
 */
export default function AppBootGate({ children }) {
  const { loading: authLoading } = useAuth()
  const { loading: hubLoading, error } = useHub()

  if (authLoading || hubLoading) {
    return <PageLoader />
  }

  if (error) {
    return (
      <div className="page-loader" role="alert">
        <button type="button" className="btn primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    )
  }

  return children
}
