import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function Layout() {
  const { user, logout, isAuthenticated, isClientAdmin, isPowerAdmin, isFinpromsAdmin, isAdvisor } =
    useAuth()
  const { can, hub } = useHub()
  const allowPublicSignup = can('public_subscribe')
  const brandName = hub?.name || 'Hub Finproms'
  const showPlans =
    can('member_view_plans') && (can('public_subscribe') || can('paid_credits'))
  const hubAdminLabel = isFinpromsAdmin ? 'FinProms Admin' : 'Client Admin'

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          {brandName}
        </NavLink>
        <nav className="nav">
          {can('member_browse_catalog') && <NavLink to="/">Posts</NavLink>}
          {showPlans && <NavLink to="/subscriptions">Plans</NavLink>}
          {isAuthenticated && can('member_view_purchases') && (
            <NavLink to="/my-purchases">My Purchases</NavLink>
          )}
          {isAuthenticated && can('member_view_invoices') && (
            <NavLink to="/my-invoices">Invoices</NavLink>
          )}
          {isClientAdmin && <NavLink to="/client-admin">{hubAdminLabel}</NavLink>}
          {isPowerAdmin && <NavLink to="/power-admin">Power Admin</NavLink>}
        </nav>
        <div className="topbar-right">
          {isAuthenticated ? (
            <>
              <span className="credits-pill">
                {user?.has_unlimited_credits ||
                (can('unlimited_credits') && isAdvisor)
                  ? 'Unlimited credits'
                  : `${user.credits} credits`}
              </span>
              <span className="user-name">{user.name}</span>
              <button type="button" className="btn ghost" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn ghost">
                Login
              </NavLink>
              {allowPublicSignup && (
                <NavLink to="/register" className="btn primary">
                  Sign up
                </NavLink>
              )}
            </>
          )}
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}
