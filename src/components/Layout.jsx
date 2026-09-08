import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout, isAuthenticated, isClientAdmin, isPowerAdmin } = useAuth()

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          Hub Finproms
        </NavLink>
        <nav className="nav">
          <NavLink to="/">Posts</NavLink>
          <NavLink to="/subscriptions">Plans</NavLink>
          {isAuthenticated && <NavLink to="/my-purchases">My Purchases</NavLink>}
          {isAuthenticated && <NavLink to="/my-invoices">Invoices</NavLink>}
          {isClientAdmin && <NavLink to="/client-admin">Client Admin</NavLink>}
          {isPowerAdmin && <NavLink to="/power-admin">Power Admin</NavLink>}
        </nav>
        <div className="topbar-right">
          {isAuthenticated ? (
            <>
              <span className="credits-pill">{user.credits} credits</span>
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
              <NavLink to="/register" className="btn primary">
                Sign up
              </NavLink>
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
