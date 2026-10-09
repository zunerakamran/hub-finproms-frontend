import { useState } from 'react'
import { api } from '../api/client'
import RichTextDisplay from './RichTextDisplay'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

/**
 * Blocks the authenticated app until the user acknowledges the hub's current Privacy Policy.
 * Shown after TermsGate when both are required.
 */
export default function PrivacyGate({ children }) {
  const { user, isAuthenticated, setUser, logout } = useAuth()
  const { hub } = useHub()
  const [agree, setAgree] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const privacy = hub?.auth?.privacy
  const required = Boolean(isAuthenticated && privacy?.required && user && user.privacy_accepted !== true)

  if (!required) {
    return children
  }

  const onAccept = async () => {
    if (!agree) return
    setError('')
    setSubmitting(true)
    try {
      const data = await api.acceptPrivacy()
      if (data?.user) {
        setUser(data.user)
      } else {
        setUser((prev) => (prev ? { ...prev, privacy_accepted: true } : prev))
      }
    } catch (err) {
      setError(err.message || 'Could not save your acknowledgement.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="terms-gate" role="dialog" aria-modal="true" aria-labelledby="privacy-gate-title">
      <div className="terms-gate__panel">
        <h1 id="privacy-gate-title">Privacy Policy</h1>
        <p className="muted">
          Please review and acknowledge the Privacy Policy to continue using{' '}
          {hub?.branding?.application_name || hub?.name || 'this hub'}.
        </p>
        <div className="terms-gate__body">
          <RichTextDisplay html={privacy?.content || ''} empty="No privacy policy is configured yet." />
        </div>
        {error && <div className="alert">{error}</div>}
        <label className="terms-gate__agree">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          <span>I have read and acknowledge this Privacy Policy.</span>
        </label>
        <div className="terms-gate__actions">
          <button
            type="button"
            className="btn primary"
            disabled={!agree || submitting}
            onClick={onAccept}
          >
            {submitting ? 'Saving…' : 'Acknowledge and continue'}
          </button>
          <button type="button" className="btn ghost" disabled={submitting} onClick={() => logout()}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
