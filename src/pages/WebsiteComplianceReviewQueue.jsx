import { Link } from 'react-router-dom'
import { useHub } from '../context/HubContext'
import ReviewQueuePanel from '../websiteCompliance/components/ReviewQueuePanel'

export default function WebsiteComplianceReviewQueue() {
  const { can, loading: hubLoading } = useHub()
  const moduleOn = can('module_website_compliance')
  const canReview = can('wc_review_change_requests')

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>Review queue</h1>
            <p className="muted">
              Website Content Pre Approval is not enabled for this hub. Ask Power Admin to enable it
              under Modules.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (!hubLoading && !canReview) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>Review queue</h1>
            <p className="muted">
              You do not have permission to review website change requests.
              {can('wc_assign_change_requests') && (
                <>
                  {' '}
                  You can still <Link to="/my-dashboard/website-compliance/assign">assign requests</Link>.
                </>
              )}
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
          <h1>Review queue</h1>
          <p className="muted">
            Pick up unassigned requests, then open them to approve, reject, or approve with feedback.
            {' '}
            Picked and completed work is in{' '}
            <Link to="/my-dashboard/website-compliance/history">request history</Link>.
          </p>
        </div>
      </div>
      <ReviewQueuePanel variant="active" />
    </section>
  )
}
