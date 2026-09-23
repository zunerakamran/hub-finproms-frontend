import { Link, useNavigate, useParams } from 'react-router-dom'
import { useHub } from '../context/HubContext'
import AdvisorDashboard from '../websiteCompliance/AdvisorDashboard'

export default function WebsiteCompliancePublish() {
  const { deploymentId } = useParams()
  const navigate = useNavigate()
  const { can, loading: hubLoading } = useHub()
  const moduleOn = can('module_website_compliance')
  const canPublish =
    can('wc_publish_live_content') || can('wc_manage_deployment_sections') || can('wc_edit_sections')

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>Publish content</h1>
            <p className="muted">
              Website Compliance is not enabled for this hub. Ask Power Admin to enable Website Compliance
              under Modules.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (!hubLoading && !canPublish) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>Publish content</h1>
            <p className="muted">
              You do not have permission to publish live content.{' '}
              <Link to="/my-dashboard/website-compliance/deployments">Back to deployments</Link>
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
          <p className="eyebrow">Website Compliance · Direct publish</p>
          <h1>Edit &amp; publish</h1>
          <p className="muted">
            Changes publish to the live site immediately — no approver review. Deployment #{deploymentId}.
          </p>
        </div>
        <Link className="btn ghost" to="/my-dashboard/website-compliance/publish-live">
          ← All live sites
        </Link>
      </div>
      <div className="wc-app wc-surface">
        <AdvisorDashboard
          embedded
          powerAdminDeploymentId={Number(deploymentId) || deploymentId}
          onExitPowerAdmin={() => navigate('/my-dashboard/website-compliance/publish-live')}
        />
      </div>
    </section>
  )
}
