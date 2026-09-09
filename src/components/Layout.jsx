import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function Layout() {
  const { user, logout, isAuthenticated, isClientAdmin, isPowerAdmin } = useAuth()
  const { can, hub } = useHub()
  const allowPublicSignup = can('public_subscribe')
  const brandName = hub?.name || 'Hub Finproms'

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          {brandName}
        </NavLink>
        <nav className="nav">
          <NavLink to="/">Posts</NavLink>
          {(can('public_subscribe') || can('paid_credits')) && (
            <NavLink to="/subscriptions">Plans</NavLink>
          )}
          {isAuthenticated && <NavLink to="/my-purchases">My Purchases</NavLink>}
          {isAuthenticated && <NavLink to="/my-invoices">Invoices</NavLink>}
          {isClientAdmin && <NavLink to="/client-admin">Client Admin</NavLink>}
          {isPowerAdmin && <NavLink to="/power-admin">Power Admin</NavLink>}
        </nav>
        <div className="topbar-right">
          {isAuthenticated ? (
            <>
              <span className="credits-pill">
                {user?.has_unlimited_credits || (can('unlimited_credits') && user?.is_advisor)
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
