import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatDateTime } from '../utils/dateFormat'

export default function AdminAdvisorRenewal({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub } = useHub()
  const [renewDay, setRenewDay] = useState(1)
  const [graceDay, setGraceDay] = useState(4)
  const [nextRenewal, setNextRenewal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_manage_advisor_renewal')
  const eyebrow = 'Advisors & billing'
  const apiOpts = { asPowerAdmin }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.advisorBillingRenewal(apiOpts)
      setRenewDay(data.renew_day || 1)
      setGraceDay(data.grace_day || Math.min(28, (data.renew_day || 1) + 3))
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
  }, [hubLoading, enabled, asPowerAdmin, actingHub?.id])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.updateAdvisorBillingRenewal(
        { renew_day: Number(renewDay), grace_day: Number(graceDay) },
        apiOpts
      )
      setRenewDay(data.renew_day)
      setGraceDay(data.grace_day)
      setNextRenewal(data.next_renewal_at || '')
      setMessage(data.message || 'Billing renew and grace days saved.')
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
            <h1>Billing renew + grace</h1>
            <p className="muted">
              Enable &quot;Set billing renew + grace dates&quot; for your role under Capabilities.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const billingDisabled =
    error &&
    /white-labelled invite-only|private invite-only|advisor billing|auto-renew settings apply/i.test(error)

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>Billing renew + grace</h1>
          <p className="muted">
            On the renew day, the hub payment card is charged for all unpaid invoices that are due
            (one-time module + recurring module + legacy). After the grace day, unpaid recurring
            seat invoices suspend those users; unpaid one-time module invoices disable those modules.
          </p>
        </div>
      </div>

      {error && !billingDisabled && <div className="alert">{error}</div>}
      {billingDisabled && (
        <p className="muted">
          Select a white-labelled hub with billing enabled in Control hub to set renew / grace days.
        </p>
      )}
      {message && <div className="alert success">{message}</div>}

      {loading ? (
        <div className="state">Loading...</div>
      ) : billingDisabled ? null : (
        <form className="admin-form" onSubmit={onSubmit}>
          <label>
            Renew day (1–28)
            <input
              type="number"
              min="1"
              max="28"
              required
              value={renewDay}
              onChange={(e) => setRenewDay(e.target.value)}
            />
          </label>
          <label>
            Grace day (1–28, on or after renew day)
            <input
              type="number"
              min="1"
              max="28"
              required
              value={graceDay}
              onChange={(e) => setGraceDay(e.target.value)}
            />
          </label>
          {nextRenewal && (
            <p className="muted">Next renew (local): {formatDateTime(nextRenewal)}</p>
          )}
          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save renew + grace'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
