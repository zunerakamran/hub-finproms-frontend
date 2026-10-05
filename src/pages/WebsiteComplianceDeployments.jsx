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
  const canAssign = can('wc_assign_website_templates')
  const canRequest = can('wc_request_deployments') || canAssign
  const canViewAll = can('wc_view_all_deployments')
  const canManageTemplates = can('wc_manage_templates')
  const canDeployWebsites = can('wc_deploy_websites')
  const canViewDeployHub =
    canDeployWebsites ||
    canViewAll ||
    can('wc_publish_live_content')
  const canAdmin = canManageTemplates || canDeployWebsites
  // Managers who assign/request always get the request panel (browse templates + assign advisor).
  // Deploy-hub DataGrid still shows when they also have view/deploy rights.
  const showRequestPanel = canRequest || (canViewAll && !canViewDeployHub)
  const canAccessPage =
    canViewAll ||
    canDeployWebsites ||
    canManageTemplates ||
    canAssign ||
    can('wc_request_deployments')

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
            {canAssign
              ? 'Browse showcase templates, request a deployment on behalf of an advisor, and track requests.'
              : 'Manage templates, review deployment requests, and manually deploy to the respective cPanel.'}{' '}
            Advisors requesting their own site should use{' '}
            <Link to="/my-dashboard/website-compliance/request-site">Request a site</Link>.
          </p>
        </div>
      </div>

      {/* DataGrid / filters-row must stay OUTSIDE .wc-app — WC resets break .btn and icon actions. */}
      <div className="space-y-8">
        {showRequestPanel ? <DeploymentRequestPanel /> : null}
        {(canAdmin || canViewDeployHub) ? (
          <WebsiteComplianceTemplatesPanel
            includeRequestActions={canRequest && !showRequestPanel}
          />
        ) : null}
        {!hubLoading && !showRequestPanel && !canAdmin && !canViewDeployHub ? (
          <p className="muted text-sm">
            You do not have site operations capabilities for Website Template Library.
          </p>
        ) : null}
      </div>
    </section>
  )
}
