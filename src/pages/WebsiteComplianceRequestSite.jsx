import { Link, Navigate } from 'react-router-dom'
import { useHub } from '../context/HubContext'
import AdvisorDashboard from '../websiteCompliance/AdvisorDashboard'
import {
  websiteModuleOffMessage,
  websiteTemplateLibraryOn,
} from '../utils/websiteCompliance'

function ModuleOff() {
  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Website Template Library</p>
          <h1>Request a site</h1>
          <p className="muted">{websiteModuleOffMessage({ templateLibrary: true })}</p>
        </div>
      </div>
    </section>
  )
}

/**
 * Advisor self-serve template catalog + request.
 * Managers who assign websites to advisors use Site operations instead.
 */
export default function WebsiteComplianceRequestSite() {
  const { can, loading: hubLoading } = useHub()
  const moduleOn = websiteTemplateLibraryOn(can)
  const canAssign = can('wc_assign_website_templates')
  const canSelfRequest = can('wc_request_deployments')

  if (!hubLoading && !moduleOn) return <ModuleOff />

  // Assigners belong on Site operations (not the advisor console).
  if (!hubLoading && canAssign) {
    return <Navigate to="/my-dashboard/website-compliance/deployments" replace />
  }

  if (!hubLoading && !canSelfRequest) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Template Library</p>
            <h1>Request a site</h1>
            <p className="muted">
              You do not have permission to request a site for yourself.{' '}
              {can('wc_view_all_deployments') || canAssign ? (
                <>
                  Staff should use{' '}
                  <Link to="/my-dashboard/website-compliance/deployments">Site operations</Link>.
                </>
              ) : null}
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
          <h1>Request a site</h1>
          <p className="muted">
            Browse templates and submit a deployment request for your own site. A capable admin will
            manually deploy it on cPanel.
          </p>
        </div>
      </div>
      <div className="wc-app">
        <AdvisorDashboard forcedTab="templates" embedded />
      </div>
    </section>
  )
}
