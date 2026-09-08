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
        <div className="admin-dashboard-card">
          <h2>White-label hubs</h2>
          <p>Create and configure white-labelled hubs (branding, private access, pricing tiers).</p>
          <span className="admin-dashboard-link">Coming next →</span>
        </div>
        <div className="admin-dashboard-card">
          <h2>Rights checklist</h2>
          <p>Turn features on/off per hub so shared and white-label behave correctly from one codebase.</p>
          <span className="admin-dashboard-link">Coming next →</span>
        </div>
      </div>
    </section>
  )
}
