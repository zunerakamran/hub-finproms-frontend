import { Link } from 'react-router-dom'
import { useHub } from '../context/HubContext'
import DeploymentRequestPanel from '../websiteCompliance/components/DeploymentRequestPanel'
import WebsiteComplianceTemplatesPanel from '../websiteCompliance/components/WebsiteComplianceTemplatesPanel'
import {
  websiteModuleOffMessage,
  websiteTemplateLibraryOn,
} from '../utils/websiteCompliance'

export default function WebsiteComplianceDeployments() {
  const { can, loading: hubLoading } = useHub()
  const templateModuleOn = websiteTemplateLibraryOn(can)
  const canRequestOrView =
    can('wc_request_deployments') ||
    can('wc_assign_website_templates') ||
    can('wc_view_all_deployments')
  const canAdmin = can('wc_manage_templates') || can('wc_deploy_websites')
  const canViewDeployHub =
    can('wc_deploy_websites') ||
    can('wc_view_all_deployments') ||
    can('wc_publish_live_content')
  // Avoid two request tables: Deploy hub (admin panel) owns the list when available.
  const showRequestPanel = canRequestOrView && !canViewDeployHub
  const canAccessPage =
    can('wc_view_all_deployments') ||
    can('wc_deploy_websites') ||
    can('wc_manage_templates') ||
    can('wc_assign_website_templates')

  if (!hubLoading && !templateModuleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Template Library</p>
            <h1>Site operations</h1>
            <p className="muted">{websiteModuleOffMessage({ templateLibrary: true })}</p>
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
            <p className="eyebrow">Website Template Library</p>
            <h1>Site operations</h1>
            <p className="muted">
              This page is for staff who manage templates and deployments. To request your own site, go
              to <Link to="/my-dashboard/website-compliance/request-site">Request a site</Link>.
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
          <h1>Site operations</h1>
          <p className="muted">
            Manage templates, review deployment requests, and manually deploy to the respective cPanel.
            Advisors requesting their own site should use{' '}
            <Link to="/my-dashboard/website-compliance/request-site">Request a site</Link>.
          </p>
        </div>
      </div>
      <div className="space-y-8">
        {showRequestPanel && <DeploymentRequestPanel />}
        {(canAdmin || canViewDeployHub) && (
          <WebsiteComplianceTemplatesPanel includeRequestActions={canViewDeployHub} />
        )}
        {!hubLoading && !showRequestPanel && !canAdmin && !canViewDeployHub && (
          <p className="muted text-sm">
            You do not have site operations capabilities for Website Template Library.
          </p>
        )}
      </div>
    </section>
  )
}
