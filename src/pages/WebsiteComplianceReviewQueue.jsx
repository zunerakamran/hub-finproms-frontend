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
              Website Compliance is not enabled for this hub. Ask Power Admin to enable Website Compliance
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
            Pick up pending requests and approve, reject, or approve with feedback.
            {' '}
            <Link to="/my-dashboard/website-compliance/history">View request history</Link>
          </p>
        </div>
      </div>
      <div className="wc-app wc-surface">
        <ReviewQueuePanel variant="active" />
      </div>
    </section>
  )
}
