import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function PowerAdminDashboard() {
  const { canPower } = useAuth()
  const { can } = useHub()

  const cards = [
    {
      to: '/power-admin/payment-methods',
      title: 'Payment methods',
      description: 'Enable or disable Stripe and bank transfer checkout for members.',
      capability: 'pa_manage_payment_methods',
    },
    {
      to: '/power-admin/hubs',
      title: 'White-label hubs',
      description: 'Create and configure white-labelled hubs (branding, private access).',
      capability: 'pa_manage_hubs',
    },
    {
      to: '/power-admin/checklist',
      title: 'Hub Functionalities',
      description: 'Per-hub Functionalities: access, credits, and content distribution.',
      capability: 'pa_manage_hub_checklists',
    },
    {
      to: '/power-admin/capabilities',
      title: 'User capabilities',
      description:
        'Role × capability matrix for members, hub admins, and Power Admin (per hub).',
      capability: 'pa_manage_power_capabilities',
    },
    {
      to: '/power-admin/advisors',
      title: 'Import advisors',
      description: 'Upload Excel/CSV advisors for the current hub (when enabled in Capabilities).',
      hubCapability: 'advisor_excel_import',
    },
  ].filter((card) => {
    if (card.hubCapability) return can(card.hubCapability)
    return canPower(card.capability)
  })

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Power Admin</p>
          <h1>Platform dashboard</h1>
          <p className="muted">
            Central control plane. Hub Functionalities control how each hub works; Capabilities
            control what each role can do.
          </p>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="empty-state">
          <h2>No tools enabled</h2>
          <p className="muted">Your Power Admin capability checklist has no tools turned on.</p>
        </div>
      ) : (
        <div className="admin-dashboard-grid">
          {cards.map((card) => (
            <Link key={card.to} to={card.to} className="admin-dashboard-card">
              <h2>{card.title}</h2>
              <p>{card.description}</p>
              <span className="admin-dashboard-link">Open →</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
