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

export default function WebsiteComplianceRequestSite() {
  const { can, loading: hubLoading } = useHub()
  const moduleOn = websiteTemplateLibraryOn(can)
  const canRequest =
    can('wc_request_deployments') || can('wc_assign_website_templates')

  if (!hubLoading && !moduleOn) return <ModuleOff />

  if (!hubLoading && !canRequest) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Template Library</p>
            <h1>Request a site</h1>
            <p className="muted">You do not have permission to request website template deployments.</p>
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
            {can('wc_assign_website_templates')
              ? 'Browse templates and submit a deployment request for an advisor. A capable admin will manually deploy it on cPanel.'
              : 'Browse templates and submit a deployment request. A capable admin will manually deploy it on cPanel.'}
          </p>
        </div>
      </div>
      <div className="wc-app">
        <AdvisorDashboard forcedTab="templates" />
      </div>
    </section>
  )
}
