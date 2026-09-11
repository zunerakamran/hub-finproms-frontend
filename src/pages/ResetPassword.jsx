import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'

export default function ResetPassword() {
  const { hub, branding } = useHub()
  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const initial = useMemo(
    () => ({
      email: params.get('email') || '',
      token: params.get('token') || '',
      password: '',
      password_confirmation: '',
    }),
    [params]
  )
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const data = await api.resetPassword(form)
      setMessage(data.message || 'Password reset successfully.')
      setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (err) {
      setError(err.data?.errors?.email?.[0] || err.data?.errors?.password?.[0] || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap admin-auth-wrap power-auth">
      <form className="auth-panel" onSubmit={onSubmit}>
        <p className="eyebrow">{brandName}</p>
        <h1>Reset password</h1>
        <p className="muted">Choose a new password for your account.</p>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}
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
          New password
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
        <button className="btn primary full" disabled={submitting || !form.token}>
          {submitting ? 'Saving...' : 'Reset password'}
        </button>
        {!form.token && (
          <p className="muted center">Missing reset token. Use the link from your email.</p>
        )}
        <p className="muted center">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  )
}
