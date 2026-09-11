import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function Register() {
  const { register, isAuthenticated } = useAuth()
  const { hub, loading: hubLoading, registrationEnabled } = useHub()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to="/my-dashboard" replace />

  if (!hubLoading && !registrationEnabled) {
    return (
      <div className="auth-wrap admin-auth-wrap power-auth">
        <div className="auth-panel">
          <p className="eyebrow">{hub?.name || 'Hub Finproms'}</p>
          <h1>Invite only</h1>
          <p className="muted">
            Public registration is disabled for this hub. Access is for invited advisors only —
            please sign in with the account from your invite list.
          </p>
          <p className="muted center">
            Already invited? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    )
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(form)
      navigate('/subscriptions')
    } catch (err) {
      const first =
        err.data?.errors?.email?.[0] ||
        err.data?.errors?.password?.[0] ||
        err.data?.errors?.name?.[0] ||
        err.message
      setError(first)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap admin-auth-wrap power-auth">
      <form className="auth-panel" onSubmit={onSubmit}>
        <p className="eyebrow">{hub?.name || 'Hub Finproms'}</p>
        <h1>Create your account</h1>
        <p className="muted">Buy credits and unlock social media posts.</p>
        {error && <div className="alert">{error}</div>}
        <label>
          Name
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
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
        <label>
          Confirm password
          <input
            type="password"
            required
            value={form.password_confirmation}
            onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
          />
        </label>
        <button className="btn primary full" disabled={submitting || hubLoading}>
          {submitting ? 'Creating...' : 'Sign up'}
        </button>
        <p className="muted center">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  )
}
