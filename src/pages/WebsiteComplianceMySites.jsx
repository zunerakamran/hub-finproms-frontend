import { Link } from 'react-router-dom'
import { useHub } from '../context/HubContext'
import AdvisorDashboard from '../websiteCompliance/AdvisorDashboard'

function ModuleOff() {
  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Website Compliance</p>
          <h1>My sites</h1>
          <p className="muted">
            Website Compliance is not enabled for this hub. Ask Power Admin to enable Website Compliance
            under Modules.
          </p>
        </div>
      </div>
    </section>
  )
}

export default function WebsiteComplianceMySites() {
  const { can, loading: hubLoading } = useHub()
  const moduleOn = can('module_website_compliance')
  const canView =
    can('wc_edit_sections') ||
    can('wc_submit_change_requests') ||
    can('wc_request_deployments')

  if (!hubLoading && !moduleOn) return <ModuleOff />

  if (!hubLoading && !canView) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>My sites</h1>
            <p className="muted">
              You do not have permission to view site deployments. Staff can manage hub-wide deployments from{' '}
              <Link to="/my-dashboard/website-compliance/deployments">Site operations</Link>.
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
          <h1>My sites</h1>
          <p className="muted">
            Track your pending and live showcase sites. Open a live site to edit its content.
          </p>
        </div>
      </div>
      <div className="wc-app wc-surface">
        <AdvisorDashboard embedded forcedTab="deployments" />
      </div>
    </section>
  )
}
