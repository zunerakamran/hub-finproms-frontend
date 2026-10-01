import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import AuthFavicon from '../components/AuthFavicon'
import AuthScreen from '../components/AuthScreen'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function VerifyEmail() {
  const { completeEmailVerification, isAuthenticated } = useAuth()
  const { hub, branding } = useHub()
  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const email = useMemo(() => params.get('email') || '', [params])
  const token = useMemo(() => params.get('token') || '', [params])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [verifying, setVerifying] = useState(Boolean(email && token))
  const [resending, setResending] = useState(false)
  const [resendEmail, setResendEmail] = useState(email)

  useEffect(() => {
    if (!email || !token || isAuthenticated) return

    let cancelled = false
    ;(async () => {
      setVerifying(true)
      setError('')
      try {
        await completeEmailVerification({ email, token })
        if (cancelled) return
        setMessage('Email verified. Taking you to your dashboard…')
        setTimeout(() => navigate('/subscriptions', { replace: true }), 800)
      } catch (err) {
        if (cancelled) return
        setError(err.data?.errors?.email?.[0] || err.message)
        setVerifying(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [email, token, completeEmailVerification, navigate, isAuthenticated])

  if (isAuthenticated && !message) {
    return <Navigate to="/my-dashboard" replace />
  }

  const onResend = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setResending(true)
    try {
      const data = await api.resendVerification({ email: resendEmail })
      setMessage(data.message || 'If that email needs verification, a new link has been sent.')
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthScreen>
      <div className="auth-screen__panel">
        <div className="auth-screen__brand">
          <AuthFavicon />
          <div>
            <p className="eyebrow">{brandName}</p>
            <h1>Verify email</h1>
          </div>
        </div>
        {verifying && <p className="muted">Confirming your email…</p>}
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        {!verifying && (
          <>
            <p className="muted">
              {token
                ? 'This verification link is invalid or expired. Request a new one below.'
                : 'Missing verification link. Enter your email to resend a new link.'}
            </p>
            <form className="auth-screen__form" onSubmit={onResend}>
              <label>
                Email
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                />
              </label>
              <button className="btn primary full" disabled={resending}>
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
            </form>
          </>
        )}
        <p className="muted center">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </AuthScreen>
  )
}
