import { useHub } from '../context/HubContext'
import ChangeRequestAssignmentPanel from '../websiteCompliance/components/ChangeRequestAssignmentPanel'
import ReviewQueuePanel from '../websiteCompliance/components/ReviewQueuePanel'

export default function WebsiteComplianceQueue() {
  const { can, loading: hubLoading } = useHub()
  const moduleOn = can('module_website_compliance')
  const canAssign = can('wc_assign_change_requests') || can('wc_view_all_change_requests')
  const canReview = can('wc_review_change_requests') || can('wc_view_all_change_requests')

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>Change requests</h1>
            <p className="muted">
              Website Compliance is not enabled for this hub. Ask Power Admin to enable Website Compliance
              under Modules.
            </p>
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
          <h1>Change requests</h1>
          <p className="muted">Assign and approve or reject website content changes.</p>
        </div>
      </div>
      <div className="wc-app wc-surface space-y-8">
        {canAssign && (
          <div>
            <h2 className="text-sm font-bold text-[#0B1B3D] mb-3 uppercase tracking-wide">Assignment</h2>
            <ChangeRequestAssignmentPanel variant="pending" />
          </div>
        )}
        {canReview && (
          <div>
            <h2 className="text-sm font-bold text-[#0B1B3D] mb-3 uppercase tracking-wide">Review queue</h2>
            <ReviewQueuePanel variant="active" />
          </div>
        )}
        {(canAssign || canReview) && (
          <div>
            <h2 className="text-sm font-bold text-[#0B1B3D] mb-3 uppercase tracking-wide">History</h2>
            {canAssign ? (
              <ChangeRequestAssignmentPanel variant="history" />
            ) : (
              <ReviewQueuePanel variant="history" />
            )}
          </div>
        )}
        {!hubLoading && !canAssign && !canReview && (
          <p className="muted text-sm">You do not have change-request capabilities for Website Compliance.</p>
        )}
      </div>
    </section>
  )
}
