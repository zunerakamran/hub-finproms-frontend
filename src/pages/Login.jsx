import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import AuthFavicon from '../components/AuthFavicon'
import AuthScreen from '../components/AuthScreen'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

function roleHome() {
  return '/my-dashboard'
}

export default function Login() {
  const { login, verifyLoginOtp, isAuthenticated } = useAuth()
  const { hub, branding, registrationEnabled, inviteOnly } = useHub()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [otpCode, setOtpCode] = useState('')
  const [otpChallenge, setOtpChallenge] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'

  if (isAuthenticated) {
    const fallback = roleHome()
    const from = location.state?.from?.pathname
    const target =
      from && from !== '/login' && from !== '/register' ? from : fallback
    return <Navigate to={target} replace />
  }

  const finishLogin = () => {
    const home = roleHome()
    const from = location.state?.from?.pathname
    if (from && from !== '/login' && from !== '/register') {
      navigate(from, { replace: true })
      return
    }
    navigate(home, { replace: true })
  }

  const onResendVerification = async () => {
    setError('')
    setInfo('')
    setResending(true)
    try {
      const data = await api.resendVerification({ email: form.email })
      setInfo(data.message || 'If that email needs verification, a new link has been sent.')
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  const onResendOtp = async () => {
    setError('')
    setInfo('')
    setResending(true)
    try {
      const data = await api.resendLoginOtp({
        email: otpEmail,
        challenge: otpChallenge,
      })
      if (data.otp_challenge) setOtpChallenge(data.otp_challenge)
      setInfo(data.message || 'A new one-time passcode has been sent.')
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  const onSubmitPassword = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setNeedsVerification(false)
    setSubmitting(true)
    try {
      const data = await login(form)
      if (data?.otp_required) {
        setOtpEmail(data.email || form.email)
        setOtpChallenge(data.otp_challenge || '')
        setOtpCode('')
        setInfo(data.message || 'Enter the code we emailed you.')
        return
      }
      finishLogin()
    } catch (err) {
      if (err.data?.email_verification_required) {
        setNeedsVerification(true)
        setError(err.message)
      } else {
        setError(err.data?.errors?.email?.[0] || err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmitOtp = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      await verifyLoginOtp({
        email: otpEmail,
        challenge: otpChallenge,
        code: otpCode.trim(),
      })
      finishLogin()
    } catch (err) {
      setError(err.data?.errors?.code?.[0] || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (otpChallenge) {
    return (
      <AuthScreen>
        <div className="auth-screen__panel">
          <div className="auth-screen__brand">
            <AuthFavicon />
            <div>
              <p className="eyebrow">{brandName}</p>
              <h1>Enter sign-in code</h1>
            </div>
          </div>
          <p className="muted">
            We sent a 6-digit code to <strong>{otpEmail}</strong>. Enter it below to finish signing in.
          </p>
          {error && <div className="alert">{error}</div>}
          {info && <div className="alert success">{info}</div>}
          <form className="auth-screen__form" onSubmit={onSubmitOtp}>
            <label>
              One-time code
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </label>
            <button className="btn primary full" disabled={submitting || otpCode.length !== 6}>
              {submitting ? 'Verifying...' : 'Verify and sign in'}
            </button>
          </form>
          <button
            type="button"
            className="btn ghost full"
            style={{ marginTop: '0.75rem' }}
            disabled={resending}
            onClick={onResendOtp}
          >
            {resending ? 'Sending...' : 'Resend code'}
          </button>
          <p className="muted center">
            <button
              type="button"
              className="linkish"
              style={{ background: 'none', border: 0, padding: 0, color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => {
                setOtpChallenge('')
                setOtpCode('')
                setInfo('')
                setError('')
              }}
            >
              Back to sign in
            </button>
          </p>
        </div>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen>
      <div className="auth-screen__panel">
        <div className="auth-screen__brand">
          <AuthFavicon />
          <div>
            <p className="eyebrow">{brandName}</p>
            <h1>Sign in</h1>
          </div>
        </div>
        <p className="muted">
          {inviteOnly
            ? 'Invite-only hub — sign in with your invited advisor account, or as an admin.'
            : 'One login for members, Client Admin, and Power Admin.'}
        </p>
        {error && <div className="alert">{error}</div>}
        {info && <div className="alert success">{info}</div>}
        <form className="auth-screen__form" onSubmit={onSubmitPassword}>
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <button className="btn primary full" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        {needsVerification && (
          <button
            type="button"
            className="btn ghost full"
            style={{ marginTop: '0.75rem' }}
            disabled={resending || !form.email}
            onClick={onResendVerification}
          >
            {resending ? 'Sending...' : 'Resend verification email'}
          </button>
        )}
        <p className="muted center">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        {registrationEnabled && (
          <p className="muted center">
            No account? <Link to="/register">Sign up</Link>
          </p>
        )}
      </div>
    </AuthScreen>
  )
}
