import { Link } from 'react-router-dom'
import { useHub } from '../context/HubContext'
import AdvisorDashboard from '../websiteCompliance/AdvisorDashboard'

function ModuleOff() {
  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Website Compliance</p>
          <h1>Content editor</h1>
          <p className="muted">
            Website Content Pre Approval is not enabled for this hub. Ask Power Admin to enable it
            under Modules.
          </p>
        </div>
      </div>
    </section>
  )
}

export default function WebsiteComplianceContentEditor() {
  const { can, loading: hubLoading } = useHub()
  const moduleOn = can('module_website_compliance')
  const canEditor =
    can('wc_edit_sections') ||
    can('wc_submit_change_requests')

  if (!hubLoading && !moduleOn) return <ModuleOff />

  if (!hubLoading && !canEditor) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>Content editor</h1>
            <p className="muted">
              You do not have permission to edit website sections.
              {can('wc_request_deployments') && (
                <>
                  {' '}
                  You can still <Link to="/my-dashboard/website-compliance/request-site">request a site</Link>.
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
          <h1>Content editor</h1>
          <p className="muted">
            Edit sections on your live site and submit changes for review.{' '}
            <Link to="/my-dashboard/website-compliance/my-requests">View my change requests</Link>
          </p>
        </div>
      </div>
      <div className="wc-app wc-surface">
        <AdvisorDashboard embedded forcedTab="editor" />
      </div>
    </section>
  )
}
