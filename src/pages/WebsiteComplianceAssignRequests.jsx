import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import ChangeRequestAssignmentPanel from '../websiteCompliance/components/ChangeRequestAssignmentPanel'
import WebsiteScopeCheckboxes, {
  resolveWebsiteScopeFromUser,
} from '../websiteCompliance/components/WebsiteScopeCheckboxes'

export default function WebsiteComplianceAssignRequests() {
  const { user } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const moduleOn = can('module_website_compliance')
  const canAssign = can('wc_assign_change_requests')
  const canView = canAssign || can('wc_view_all_change_requests')

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Content Pre Approval</p>
            <h1>Assign requests</h1>
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
            <h1>Assign requests</h1>
            <p className="muted">
              You do not have permission to assign website change requests.
              {can('wc_review_change_requests') && (
                <>
                  {' '}
                  Open the <Link to="/my-dashboard/website-compliance/review">review queue</Link> instead.
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
          <p className="eyebrow">Website Content Pre Approval</p>
          <h1>Assign requests</h1>
          <p className="muted">
            Assign pending content changes to an approver for review.
            {!canAssign && ' You can view pending requests but cannot assign them.'}
          </p>
        </div>
      </div>
      <WebsiteScopeCheckboxes scope={resolveWebsiteScopeFromUser(user)} />
      <ChangeRequestAssignmentPanel variant="pending" />
    </section>
  )
}
