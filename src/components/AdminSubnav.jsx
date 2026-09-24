import { NavLink } from 'react-router-dom'
import { useHub } from '../context/HubContext'

const links = [
  { to: '/client-admin', label: 'Dashboard', end: true },
  { to: '/client-admin/posts', label: 'Posts', capability: 'dashboard_manage_posts' },
  { to: '/client-admin/bundles', label: 'Bundles', capability: 'dashboard_manage_bundles' },
  { to: '/client-admin/types', label: 'Types', capability: 'dashboard_manage_types' },
  { to: '/client-admin/categories', label: 'Categories', capability: 'dashboard_manage_categories' },
  { to: '/client-admin/tags', label: 'Tags', capability: 'dashboard_manage_tags' },
  { to: '/client-admin/firms', label: 'Firms', capability: 'dashboard_manage_firms' },
  { to: '/client-admin/plans', label: 'Subscriptions', capability: 'dashboard_manage_plans' },
  { to: '/client-admin/advisors', label: 'Advisors', anyOf: ['advisor_excel_import', 'advisor_discontinue'] },
  {
    to: '/client-admin/payment-card',
    label: 'Payment card',
    billingOnly: true,
  },
  {
    to: '/client-admin/advisor-pricing',
    label: 'Advisor rates',
    capability: 'dashboard_manage_advisor_pricing',
  },
  {
    to: '/client-admin/advisor-renewal',
    label: 'Advisor renew day',
    capability: 'dashboard_manage_advisor_renewal',
  },
  {
    to: '/client-admin/subscriber-credits',
    label: 'Subscriber credits',
    capability: 'dashboard_manage_subscriber_credits',
  },
  {
    to: '/client-admin/advisor-invoices',
    label: 'Advisor invoices',
    capability: 'dashboard_view_advisor_invoices',
  },
  {
    to: '/client-admin/activity-logs',
    label: 'Activity logs',
    capability: 'dashboard_view_activity_logs',
  },
  { to: '/client-admin/settings', label: 'Settings', capability: 'dashboard_manage_settings' },
  {
    to: '/client-admin/role-display-names',
    label: 'User role title',
    capability: 'dashboard_manage_role_display_names',
  },
  {
    to: '/client-admin/compliance-status-display-names',
    label: 'Workflows status title',
    capability: 'dashboard_manage_compliance_status_display_names',
  },
  {
    to: '/client-admin/email-templates',
    label: 'Email templates',
    capability: 'dashboard_manage_email_templates',
  },
  { to: '/client-admin/bank-transfers', label: 'Bank transfers', capability: 'dashboard_bank_transfers' },
]

export default function AdminSubnav() {
  const { can, canManagePaymentCard } = useHub()
  const visible = links.filter((link) => {
    if (link.billingOnly) return canManagePaymentCard
    if (Array.isArray(link.anyOf) && link.anyOf.length > 0) {
      return link.anyOf.some((flag) => can(flag))
    }
    return !link.capability || can(link.capability)
  })

  return (
    <nav className="dash-nav" aria-label="Client admin sections">
      {visible.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => (isActive ? 'is-active' : undefined)}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
