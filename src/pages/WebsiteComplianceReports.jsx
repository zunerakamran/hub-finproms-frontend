import { useHub } from '../context/HubContext'
import PlatformSummaryReport from '../websiteCompliance/components/PlatformSummaryReport'

export default function WebsiteComplianceReports() {
  const { can, loading: hubLoading } = useHub()
  const moduleOn = can('module_website_compliance')
  const canView = can('wc_view_platform_report')

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>Reports</h1>
            <p className="muted">
              Website Compliance is not enabled for this hub. Ask Power Admin to enable Website Compliance
              under Modules.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (!hubLoading && !canView) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>Reports</h1>
            <p className="muted">You do not have permission to view the website compliance platform report.</p>
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
          <h1>Reports</h1>
          <p className="muted">Summary of templates, site deployments, and content change requests.</p>
        </div>
      </div>
      <div className="wc-app wc-surface">
        <PlatformSummaryReport />
      </div>
    </section>
  )
}
