import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import ReviewQueuePanel from '../websiteCompliance/components/ReviewQueuePanel'

export default function WebsiteComplianceRequestHistory() {
  const { user } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const moduleOn = can('module_website_compliance')
  const canAssign = can('wc_assign_change_requests')
  const canReview = can('wc_review_change_requests') || can('wc_view_all_change_requests')
  const canView = canAssign || canReview
  const seesHubWide =
    can('wc_view_all_change_requests') && String(user?.role || '') !== 'approver'

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
            {seesHubWide
              ? 'Browse completed and in-progress website content reviews across the hub.'
              : 'Browse your own completed and in-progress website content reviews — only requests you picked.'}
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
        {/* Always the review panel: without view-all it scopes to requests picked by this user.
            AssignmentPanel history is hub-wide and was leaking other approvers' work. */}
        <ReviewQueuePanel variant="history" />
      </div>
    </section>
  )
}
