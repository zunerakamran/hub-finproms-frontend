import { Link } from 'react-router-dom'
import { useHub } from '../context/HubContext'
import {
  websiteModuleOffMessage,
  websiteTemplateLibraryOn,
} from '../utils/websiteCompliance'
import AdvisorDashboard from '../websiteCompliance/AdvisorDashboard'

function ModuleOff() {
  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Website Template Library</p>
          <h1>My sites</h1>
          <p className="muted">{websiteModuleOffMessage({ templateLibrary: true })}</p>
        </div>
      </div>
    </section>
  )
}

export default function WebsiteComplianceMySites() {
  const { can, loading: hubLoading } = useHub()
  const moduleOn = websiteTemplateLibraryOn(can)
  const canView =
    can('wc_request_deployments') ||
    can('wc_edit_sections') ||
    can('wc_submit_change_requests')

  if (!hubLoading && !moduleOn) return <ModuleOff />

  if (!hubLoading && !canView) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Template Library</p>
            <h1>My sites</h1>
            <p className="muted">
              You do not have permission to view site deployments. Staff can manage hub-wide deployments
              from <Link to="/my-dashboard/website-compliance/deployments">Site operations</Link>.
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
          <p className="eyebrow">Website Template Library</p>
          <h1>My sites</h1>
          <p className="muted">
            Track your pending and live template deployments.
            {can('module_website_compliance') &&
              (can('wc_edit_sections') || can('wc_submit_change_requests')) && (
                <>
                  {' '}
                  Open a live site to edit content under Website Content Pre Approval.
                </>
              )}
          </p>
        </div>
      </div>
      <div className="wc-app wc-surface">
        <AdvisorDashboard embedded forcedTab="deployments" />
      </div>
    </section>
  )
}
