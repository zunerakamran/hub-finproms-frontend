import { Navigate } from 'react-router-dom'
import { useHub } from '../context/HubContext'

/**
 * Legacy mega-page route. Sends assigners to Assign requests and everyone else to Review queue.
 */
export default function WebsiteComplianceQueue() {
  const { can, loading: hubLoading } = useHub()

  if (hubLoading) {
    return (
      <section>
        <div className="state">Loading…</div>
      </section>
    )
  }

  if (can('wc_assign_change_requests') && !can('wc_review_change_requests')) {
    return <Navigate to="/my-dashboard/website-compliance/assign" replace />
  }

  return <Navigate to="/my-dashboard/website-compliance/review" replace />
}
