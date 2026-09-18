import { Link } from 'react-router-dom'
import { useHub } from '../context/HubContext'
import ChangeRequestAssignmentPanel from '../websiteCompliance/components/ChangeRequestAssignmentPanel'
import ReviewQueuePanel from '../websiteCompliance/components/ReviewQueuePanel'

export default function WebsiteComplianceRequestHistory() {
  const { can, loading: hubLoading } = useHub()
  const moduleOn = can('module_website_compliance')
  const canAssign = can('wc_assign_change_requests')
  const canReview = can('wc_review_change_requests') || can('wc_view_all_change_requests')
  const canView = canAssign || canReview

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>Request history</h1>
            <p className="muted">
              Website Compliance is not enabled for this hub. Ask Power Admin to enable Website Compliance
              under Modules.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (!hubLoading && !canView) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>Request history</h1>
            <p className="muted">You do not have permission to view website change-request history.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Website Compliance</p>
          <h1>Request history</h1>
          <p className="muted">
            {can('wc_view_all_change_requests')
              ? 'Browse completed and in-progress website content reviews across the hub.'
              : 'Browse your own completed and in-progress website content reviews.'}
            {canReview && (
              <>
                {' '}
                Active work lives in the <Link to="/my-dashboard/website-compliance/review">review queue</Link>.
              </>
            )}
          </p>
        </div>
      </div>
      <div className="wc-app wc-surface">
        {canAssign ? (
          <ChangeRequestAssignmentPanel variant="history" />
        ) : (
          <ReviewQueuePanel variant="history" />
        )}
      </div>
    </section>
  )
}
