import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'

export default function ForgotPassword() {
  const { hub, branding } = useHub()
  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const data = await api.forgotPassword({ email })
      setMessage(data.message || 'If that email is registered, a reset link has been sent.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap admin-auth-wrap power-auth">
      <form className="auth-panel" onSubmit={onSubmit}>
        <p className="eyebrow">{brandName}</p>
        <h1>Forgot password</h1>
        <p className="muted">Enter your account email and we’ll send a reset link if it exists.</p>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button className="btn primary full" disabled={submitting}>
          {submitting ? 'Sending...' : 'Send reset link'}
        </button>
        <p className="muted center">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  )
}
