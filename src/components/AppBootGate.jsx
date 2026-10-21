import AccessBlockedSplash from './AccessBlockedSplash'
import PageLoader from './PageLoader'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

/**
 * Blocks the whole app until the session and current hub are resolved.
 * Access-restricted visitors see hub logo + loader (no deny details).
 */
export default function AppBootGate({ children }) {
  const { loading: authLoading } = useAuth()
  const { loading: hubLoading, error, accessBlocked } = useHub()

  if (accessBlocked) {
    return <AccessBlockedSplash branding={accessBlocked.branding} />
  }

  if (authLoading || hubLoading) {
    return <PageLoader />
  }

  if (error) {
    return (
      <div className="page-loader" role="alert">
        <p className="page-loader__message" style={{ marginBottom: '1rem', textAlign: 'center', maxWidth: 420 }}>
          {error}
        </p>
        <button type="button" className="btn primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    )
  }

  return children
}
