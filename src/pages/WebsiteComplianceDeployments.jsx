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

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>Deployments</h1>
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
          <h1>Deployments</h1>
          <p className="muted">Request sites, assign advisors, and deploy to cPanel.</p>
        </div>
      </div>
      <div className="wc-app wc-surface space-y-8">
        {canRequestOrView && <DeploymentRequestPanel />}
        {canAdmin && <WebsiteComplianceTemplatesPanel />}
        {!hubLoading && !canRequestOrView && !canAdmin && (
          <p className="muted text-sm">You do not have deployment capabilities for Website Compliance.</p>
        )}
      </div>
    </section>
  )
}
