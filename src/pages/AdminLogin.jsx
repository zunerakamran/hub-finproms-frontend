import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function roleHome(user) {
  if (user?.role === 'power_admin') return '/power-admin'
  if (user?.role === 'client_admin' || user?.role === 'admin') return '/client-admin'
  return '/'
}

export default function AdminLogin({ portal = 'client' }) {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isPower = portal === 'power'
  const expectedRole = isPower ? 'power_admin' : 'client_admin'
  const title = isPower ? 'Power Admin' : 'Client Admin'
  const home = isPower ? '/power-admin' : '/client-admin'

  if (isAuthenticated) {
    const ok =
      user?.role === expectedRole ||
      (!isPower && (user?.role === 'client_admin' || user?.role === 'admin'))
    return <Navigate to={ok ? home : roleHome(user)} replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const loggedIn = await login(form)
      const ok =
        loggedIn?.role === expectedRole ||
        (!isPower && (loggedIn?.role === 'client_admin' || loggedIn?.role === 'admin'))
      if (!ok) {
        setError(`This login is for ${title} accounts only.`)
        // Keep session but send them to their correct portal
        navigate(roleHome(loggedIn), { replace: true })
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
    <div className={`auth-wrap admin-auth-wrap ${isPower ? 'power-auth' : 'client-auth'}`}>
      <form className="auth-panel" onSubmit={onSubmit}>
        <p className="eyebrow">{title}</p>
        <h1>Sign in</h1>
        <p className="muted">
          {isPower
            ? 'Platform dashboard — separate from the member hub.'
            : 'Hub management dashboard — separate from the member hub.'}
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
          {submitting ? 'Signing in...' : `Login to ${title}`}
        </button>
        <p className="muted center">
          Member login? <Link to="/login">Go to hub login</Link>
        </p>
      </form>
    </div>
  )
}
