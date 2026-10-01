import { useState } from 'react'
import { api } from '../api/client'
import RichTextDisplay from './RichTextDisplay'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

/**
 * Blocks the authenticated app until the user accepts the hub's current Terms & Conditions.
 */
export default function TermsGate({ children }) {
  const { user, isAuthenticated, setUser, logout } = useAuth()
  const { hub } = useHub()
  const [agree, setAgree] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const terms = hub?.auth?.terms
  const required = Boolean(isAuthenticated && terms?.required && user && user.terms_accepted !== true)

  if (!required) {
    return children
  }

  const onAccept = async () => {
    if (!agree) return
    setError('')
    setSubmitting(true)
    try {
      const data = await api.acceptTerms()
      if (data?.user) {
        setUser(data.user)
      } else {
        setUser((prev) => (prev ? { ...prev, terms_accepted: true } : prev))
      }
    } catch (err) {
      setError(err.message || 'Could not save your acceptance.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="terms-gate" role="dialog" aria-modal="true" aria-labelledby="terms-gate-title">
      <div className="terms-gate__panel">
        <h1 id="terms-gate-title">Terms & Conditions</h1>
        <p className="muted">
          Please review and accept the Terms & Conditions to continue using{' '}
          {hub?.branding?.application_name || hub?.name || 'this hub'}.
        </p>
        <div className="terms-gate__body">
          <RichTextDisplay html={terms?.content || ''} empty="No terms are configured yet." />
        </div>
        {error && <div className="alert">{error}</div>}
        <label className="terms-gate__agree">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          <span>I have read and agree to these Terms & Conditions.</span>
        </label>
        <div className="terms-gate__actions">
          <button
            type="button"
            className="btn primary"
            disabled={!agree || submitting}
            onClick={onAccept}
          >
            {submitting ? 'Saving…' : 'Accept and continue'}
          </button>
          <button type="button" className="btn ghost" disabled={submitting} onClick={() => logout()}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
