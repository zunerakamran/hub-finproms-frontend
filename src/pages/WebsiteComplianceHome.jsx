import { Link } from 'react-router-dom'
import { useHub } from '../context/HubContext'
import AdvisorDashboard from '../websiteCompliance/AdvisorDashboard'

function ModuleOff() {
  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Website Compliance</p>
          <h1>My websites</h1>
          <p className="muted">
            Website Compliance is not enabled for this hub. Ask Power Admin to enable Website Compliance
            under Modules.
          </p>
        </div>
      </div>
    </section>
  )
}

export default function WebsiteComplianceHome() {
  const { can, loading: hubLoading } = useHub()
  const moduleOn = can('module_website_compliance')
  const canEditor =
    can('wc_edit_sections') ||
    can('wc_submit_change_requests') ||
    can('wc_publish_live_content')
  const canDeployments =
    can('wc_request_deployments') ||
    can('wc_view_all_deployments') ||
    can('wc_deploy_websites') ||
    can('wc_manage_templates')

  if (!hubLoading && !moduleOn) return <ModuleOff />

  if (!hubLoading && !canEditor && canDeployments) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>My websites</h1>
            <p className="muted">
              You can manage deployment requests from{' '}
              <Link to="/my-dashboard/website-compliance/deployments">Deployments</Link>.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (!hubLoading && !canEditor) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>My websites</h1>
            <p className="muted">You do not have permission to edit website sections.</p>
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
          <h1>My websites</h1>
          <p className="muted">Choose a template, manage deployments, and edit website sections.</p>
        </div>
      </div>
      <div className="wc-app wc-surface">
        <AdvisorDashboard embedded />
      </div>
    </section>
  )
}
