import { NavLink } from 'react-router-dom'
import { useHub } from '../context/HubContext'

const links = [
  { to: '/client-admin', label: 'Dashboard', end: true },
  { to: '/client-admin/posts', label: 'Posts', capability: 'dashboard_manage_posts' },
  { to: '/client-admin/types', label: 'Types', capability: 'dashboard_manage_types' },
  { to: '/client-admin/categories', label: 'Categories', capability: 'dashboard_manage_categories' },
  { to: '/client-admin/tags', label: 'Tags', capability: 'dashboard_manage_tags' },
  { to: '/client-admin/plans', label: 'Plans', capability: 'dashboard_manage_plans' },
  { to: '/client-admin/advisors', label: 'Advisors', capability: 'advisor_excel_import' },
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
    to: '/client-admin/advisor-invoices',
    label: 'Advisor invoices',
    capability: 'dashboard_view_advisor_invoices',
  },
  { to: '/client-admin/settings', label: 'Settings', capability: 'dashboard_manage_settings' },
  { to: '/client-admin/bank-transfers', label: 'Bank transfers', capability: 'dashboard_bank_transfers' },
]

export default function AdminSubnav() {
  const { can, advisorBillingEnabled } = useHub()
  const visible = links.filter((link) => {
    if (link.billingOnly) return advisorBillingEnabled
    return !link.capability || can(link.capability)
  })

  return (
    <nav className="admin-subnav admin-sidebar-nav" aria-label="Client admin sections">
      {visible.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.end}>
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
