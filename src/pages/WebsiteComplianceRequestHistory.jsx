import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import ReviewQueuePanel from '../websiteCompliance/components/ReviewQueuePanel'

export default function WebsiteComplianceRequestHistory() {
  const { user } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const moduleOn = can('module_website_compliance')
  const canAssign = can('wc_assign_change_requests')
  const canTakeReviewActions = can('wc_review_change_requests')
  const canViewAll = can('wc_view_all_change_requests')
  const canChangeStatus = can('wc_change_request_status')
  const canView = canAssign || canTakeReviewActions || canViewAll || canChangeStatus
  const seesHubWide =
    (canViewAll || canChangeStatus) && String(user?.role || '') !== 'approver'

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Content Pre Approval</p>
            <h1>Request history</h1>
            <p className="muted">
              Website Content Pre Approval is not enabled for this hub. Ask Power Admin to enable it
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
            <p className="eyebrow">Website Content Pre Approval</p>
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
          <p className="eyebrow">Website Content Pre Approval</p>
          <h1>Request history</h1>
          <p className="muted">
            {seesHubWide
              ? 'Browse in-progress and completed website content reviews across the hub.'
              : 'Browse in-progress and completed reviews you picked up.'}
            {canTakeReviewActions && (
              <>
                {' '}
                Unassigned requests to pick up are in the{' '}
                <Link to="/my-dashboard/website-compliance/review">review queue</Link>.
              </>
            )}
          </p>
        </div>
      </div>
      {/* Without view-all, ReviewQueuePanel scopes history to requests picked by this user.
          AssignmentPanel history is hub-wide and was leaking other approvers' work. */}
      <ReviewQueuePanel variant="history" />
    </section>
  )
}
