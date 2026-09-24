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
          <p className="eyebrow">Website</p>
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
  const canRequest = can('wc_request_deployments')

  if (!hubLoading && !moduleOn) return <ModuleOff />

  if (!hubLoading && !canRequest) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website</p>
            <h1>Request a site</h1>
            <p className="muted">You do not have permission to request showcase site deployments.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Website</p>
          <h1>Request a site</h1>
          <p className="muted">Browse templates and submit a deployment request for a new showcase site.</p>
        </div>
      </div>
      <div className="wc-app">
        <AdvisorDashboard />
      </div>
    </section>
  )
}
