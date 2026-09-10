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
      to: '/power-admin/users',
      title: 'Users & roles',
      description: 'Create users, update accounts, and assign roles across the platform.',
      capability: 'pa_manage_users_roles',
    },
    {
      to: '/power-admin/advisor-pricing',
      title: 'Advisor billing rates',
      description: 'Set rate-per-advisor tiers / quotas for private hub billing (rate × advisors).',
      hubCapability: 'dashboard_manage_advisor_pricing',
    },
    {
      to: '/power-admin/advisor-renewal',
      title: 'Advisor auto-renew day',
      description: 'Set the monthly day the client admin card is charged for advisor seats.',
      hubCapability: 'dashboard_manage_advisor_renewal',
    },
    {
      to: '/power-admin/plans',
      title: 'Subscription plans',
      description: 'Create and edit credit packages for public hub self-serve subscriptions.',
      hubCapability: 'dashboard_manage_plans',
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
      title: 'Advisors',
      description: 'Import and/or discontinue advisors for the current hub (when enabled in Capabilities).',
      hubAnyOf: ['advisor_excel_import', 'advisor_discontinue'],
    },
    {
      to: '/power-admin/advisor-invoices',
      title: 'Advisor invoices',
      description: 'View invoices for advisor subscriber billing on this hub.',
      hubCapability: 'dashboard_view_advisor_invoices',
    },
    {
      to: '/power-admin/activity-logs',
      title: 'Activity logs & report',
      description: 'Audit trail and activity report for the current hub (who can view is per Capabilities).',
      hubCapability: 'dashboard_view_activity_logs',
    },
  ].filter((card) => {
    if (Array.isArray(card.hubAnyOf) && card.hubAnyOf.length > 0) {
      return card.hubAnyOf.some((flag) => can(flag))
    }
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
