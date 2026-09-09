import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

function roleHome(user) {
  if (user?.role === 'power_admin') return '/power-admin'
  if (['finproms_admin', 'client_admin', 'manager', 'admin'].includes(user?.role)) {
    return '/client-admin'
  }
  return '/'
}

export default function Login() {
  const { login, isAuthenticated, user } = useAuth()
  const { hub, registrationEnabled, inviteOnly } = useHub()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    const fallback = roleHome(user)
    const from = location.state?.from?.pathname
    // Don't bounce staff back into a portal they can't access
    const target =
      from && from !== '/login' && from !== '/register' ? from : fallback
    return <Navigate to={target} replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const loggedIn = await login(form)
      const home = roleHome(loggedIn)
      const from = location.state?.from?.pathname
      if (from && from !== '/login' && from !== '/register') {
        navigate(from, { replace: true })
        return
      }
      navigate(home, { replace: true })
    } catch (err) {
      setError(err.data?.errors?.email?.[0] || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap admin-auth-wrap power-auth">
      <form className="auth-panel" onSubmit={onSubmit}>
        <p className="eyebrow">{hub?.name || 'Hub Finproms'}</p>
        <h1>Sign in</h1>
        <p className="muted">
          {inviteOnly
            ? 'Invite-only hub — sign in with your invited advisor account, or as an admin.'
            : 'One login for members, Client Admin, and Power Admin.'}
        </p>
        {error && <div className="alert">{error}</div>}
        <label>
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>
        <button className="btn primary full" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Login'}
        </button>
        {registrationEnabled && (
          <p className="muted center">
            No account? <Link to="/register">Sign up</Link>
          </p>
        )}
        <p className="muted center">
          <Link to="/">← Back to hub</Link>
        </p>
      </form>
    </div>
  )
}
