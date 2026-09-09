import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function AdminAdvisorRenewal({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const [renewDay, setRenewDay] = useState(1)
  const [nextRenewal, setNextRenewal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_manage_advisor_renewal')
  const eyebrow = asPowerAdmin ? 'Power Admin' : 'FinProms / Client Admin'
  const apiOpts = { asPowerAdmin }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.advisorBillingRenewal(apiOpts)
      setRenewDay(data.renew_day || 1)
      setNextRenewal(data.next_renewal_at || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading) return
    if (!enabled) {
      setLoading(false)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, enabled, asPowerAdmin])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.updateAdvisorBillingRenewal({ renew_day: Number(renewDay) }, apiOpts)
      setRenewDay(data.renew_day)
      setNextRenewal(data.next_renewal_at || '')
      setMessage(data.message || 'Auto-renew day saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>Advisor billing auto-renew</h1>
            <p className="muted">
              Enable &quot;Set advisor billing auto-renew date&quot; for Power Admin / FinProms
              admin under Capabilities.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>Advisor billing auto-renew</h1>
          <p className="muted">
            Choose the day of each month when the client admin card is charged for advisor seats
            (rate × advisors).
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <form className="admin-form" onSubmit={onSubmit}>
          <label>
            Auto-renew day (1–28)
            <input
              type="number"
              min="1"
              max="28"
              required
              value={renewDay}
              onChange={(e) => setRenewDay(e.target.value)}
            />
          </label>
          {nextRenewal && (
            <p className="muted">
              Next renewal (local): {new Date(nextRenewal).toLocaleString()}
            </p>
          )}
          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save renew day'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
