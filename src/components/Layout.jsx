import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function Layout() {
  const { user, logout, isAdvisor } = useAuth()
  const { can, hub, hasDashboardAccess } = useHub()
  const brandName = hub?.name || 'Hub Finproms'
  const showPlans =
    can('member_view_plans') && (can('public_subscribe') || can('paid_credits'))

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          {brandName}
        </NavLink>
        <nav className="nav">
          {can('member_browse_catalog') && <NavLink to="/">Posts</NavLink>}
          {can('member_browse_catalog') && <NavLink to="/bundles">Bundles</NavLink>}
          {showPlans && <NavLink to="/subscriptions">Plans</NavLink>}
          {hasDashboardAccess && <NavLink to="/my-dashboard">Dashboard</NavLink>}
        </nav>
        <div className="topbar-right">
          <span className="credits-pill">
            {user?.has_unlimited_credits ||
            (can('unlimited_credits') && isAdvisor)
              ? 'Unlimited credits'
              : `${user?.credits ?? 0} credits`}
          </span>
          <span className="user-name">{user?.name}</span>
          <button type="button" className="btn ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}
