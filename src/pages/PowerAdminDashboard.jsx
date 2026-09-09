import { Link } from 'react-router-dom'

export default function PowerAdminDashboard() {
  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Power Admin</p>
          <h1>Platform dashboard</h1>
          <p className="muted">
            Manage white-labelled hubs and per-hub rights checklists. This area is separate from the
            member application and from Client Admin.
          </p>
        </div>
      </div>

      <div className="admin-dashboard-grid">
        <Link to="/power-admin/payment-methods" className="admin-dashboard-card">
          <h2>Payment methods</h2>
          <p>Enable or disable Stripe and bank transfer checkout for members.</p>
          <span className="admin-dashboard-link">Manage payments →</span>
        </Link>
        <Link to="/power-admin/hubs" className="admin-dashboard-card">
          <h2>White-label hubs</h2>
          <p>Create and configure white-labelled hubs (branding, private access, checklist).</p>
          <span className="admin-dashboard-link">Manage hubs →</span>
        </Link>
        <Link to="/power-admin/checklist" className="admin-dashboard-card">
          <h2>Rights checklist</h2>
          <p>Turn features on/off per hub so shared and white-label behave correctly from one codebase.</p>
          <span className="admin-dashboard-link">Edit checklist →</span>
        </Link>
      </div>
    </section>
  )
}
