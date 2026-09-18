import { Link } from 'react-router-dom'
import { useHub } from '../context/HubContext'
import DeploymentRequestPanel from '../websiteCompliance/components/DeploymentRequestPanel'
import WebsiteComplianceTemplatesPanel from '../websiteCompliance/components/WebsiteComplianceTemplatesPanel'

export default function WebsiteComplianceDeployments() {
  const { can, loading: hubLoading } = useHub()
  const moduleOn = can('module_website_compliance')
  const canRequestOrView =
    can('wc_request_deployments') || can('wc_view_all_deployments') || can('wc_assign_change_requests')
  const canAdmin =
    can('wc_manage_templates') || can('wc_deploy_websites') || can('wc_manage_deployment_sections')
  const canAccessPage =
    can('wc_view_all_deployments') ||
    can('wc_deploy_websites') ||
    can('wc_manage_templates') ||
    can('wc_manage_deployment_sections') ||
    can('wc_assign_change_requests')

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>Site operations</h1>
            <p className="muted">
              Website Compliance is not enabled for this hub. Ask Power Admin to enable Website Compliance
              under Modules.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (!hubLoading && !canAccessPage) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>Site operations</h1>
            <p className="muted">
              This page is for staff who manage deployments across the hub. To request your own site, go to{' '}
              <Link to="/my-dashboard/website-compliance/request-site">Request a site</Link>.
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
          <h1>Site operations</h1>
          <p className="muted">
            Staff tools: request sites for advisors, assign editors, manage templates, and deploy to cPanel.
            Advisors requesting their own site should use{' '}
            <Link to="/my-dashboard/website-compliance/request-site">Request a site</Link>.
          </p>
        </div>
      </div>
      <div className="wc-app wc-surface space-y-8">
        {canRequestOrView && <DeploymentRequestPanel />}
        {canAdmin && <WebsiteComplianceTemplatesPanel />}
        {!hubLoading && !canRequestOrView && !canAdmin && (
          <p className="muted text-sm">You do not have site operations capabilities for Website Compliance.</p>
        )}
      </div>
    </section>
  )
}
