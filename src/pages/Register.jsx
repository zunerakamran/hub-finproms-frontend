import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../api/client'
import AuthFavicon from '../components/AuthFavicon'
import AuthScreen from '../components/AuthScreen'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function Register() {
  const { register, isAuthenticated } = useAuth()
  const { hub, branding, loading: hubLoading, registrationEnabled } = useHub()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [resendMessage, setResendMessage] = useState('')
  const [resending, setResending] = useState(false)
  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'

  if (isAuthenticated) return <Navigate to="/my-dashboard" replace />

  if (!hubLoading && !registrationEnabled) {
    return (
      <AuthScreen>
        <div className="auth-screen__panel">
          <div className="auth-screen__brand">
            <AuthFavicon />
            <div>
              <p className="eyebrow">{brandName}</p>
              <h1>Invite only</h1>
            </div>
          </div>
          <p className="muted">
            Public registration is disabled for this hub. Access is for invited advisors only —
            please sign in with the account from your invite list.
          </p>
          <p className="muted center">
            Already invited? <Link to="/login">Login</Link>
          </p>
        </div>
      </AuthScreen>
    )
  }

  const onResend = async () => {
    if (!pendingEmail) return
    setResendMessage('')
    setError('')
    setResending(true)
    try {
      const data = await api.resendVerification({ email: pendingEmail })
      setResendMessage(data.message || 'If that email needs verification, a new link has been sent.')
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResendMessage('')
    setSubmitting(true)
    try {
      const data = await register(form)
      if (data?.email_verification_required) {
        setPendingEmail(data.email || form.email)
        return
      }
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

  if (pendingEmail) {
    return (
      <AuthScreen>
        <div className="auth-screen__panel">
          <div className="auth-screen__brand">
            <AuthFavicon />
            <div>
              <p className="eyebrow">{brandName}</p>
              <h1>Check your email</h1>
            </div>
          </div>
          <p className="muted">
            We sent a verification link to <strong>{pendingEmail}</strong>. Open it to activate
            your account, then you can sign in.
          </p>
          {error && <div className="alert">{error}</div>}
          {resendMessage && <div className="alert success">{resendMessage}</div>}
          <button type="button" className="btn primary full" disabled={resending} onClick={onResend}>
            {resending ? 'Sending...' : 'Resend verification email'}
          </button>
          <p className="muted center">
            Already verified? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen>
      <form className="auth-screen__panel auth-screen__form" onSubmit={onSubmit}>
        <div className="auth-screen__brand">
          <AuthFavicon />
          <div>
            <p className="eyebrow">{brandName}</p>
            <h1>Create your account</h1>
          </div>
        </div>
        <p className="muted">Buy credits and unlock social media posts. We’ll email you a verification link.</p>
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
    </AuthScreen>
  )
}
