import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function AdminSubscriberCredits({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const {
    can,
    loading: hubLoading,
    actingHub,
    isActingOnWhiteLabel,
    inviteOnly,
    refreshHub,
  } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = asPowerAdmin || can('dashboard_manage_subscriber_credits')
  const eyebrow = 'Advisors & billing'
  const apiOpts = { asPowerAdmin }
  const privateTarget = isActingOnWhiteLabel ? true : inviteOnly
  const targetName = isActingOnWhiteLabel
    ? actingHub?.name || 'selected white-labelled hub'
    : 'this hub'

  const [unlimited, setUnlimited] = useState(true)
  const [credits, setCredits] = useState('')
  const [hubMeta, setHubMeta] = useState(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const applyConfig = (data) => {
    const sc = data.subscriber_credits || {}
    setUnlimited(sc.unlimited !== false)
    setCredits(sc.unlimited ? '' : String(sc.credits ?? 0))
    setHubMeta(data.hub || null)
    setNote(data.note || '')
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.subscriberCredits({}, apiOpts)
      applyConfig(data)
    } catch (err) {
      setError(err.message)
      setHubMeta(null)
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
  }, [hubLoading, enabled, asPowerAdmin, actingHub?.id, isActingOnWhiteLabel])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        subscriber_credits_unlimited: unlimited,
        subscriber_credits: unlimited ? null : Number.parseInt(String(credits), 10),
      }
      if (!unlimited && Number.isNaN(payload.subscriber_credits)) {
        setError('Enter a valid number of credits per subscriber.')
        setSaving(false)
        return
      }
      const data = await api.updateSubscriberCredits(payload, apiOpts)
      applyConfig(data)
      setMessage(data.message || 'Subscriber credits saved.')
      await refreshHub()
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
            <h1>Subscriber credits</h1>
            <p className="muted">
              Enable &quot;Set subscriber credits (white-labelled hub)&quot; for your role under Power Admin →
              Capabilities.
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
          <h1>Subscriber credits</h1>
          <p className="muted">
            Set unlimited or a fixed credit allotment for white-labelled hub Excel subscribers on{' '}
            <strong>{targetName}</strong>. Use <strong>Control hub</strong> to switch white-labelled
            hubs. New imports get the allotment immediately; existing subscribers get it on the next
            monthly autorenew.
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {!privateTarget && !loading && (
        <div className="empty-state">
          <h2>White-labelled hubs only</h2>
          <p className="muted">
            Subscriber credits are not set on the shared hub. Select a white-labelled
            hub in the Control hub switcher.
          </p>
        </div>
      )}

      {loading ? (
        <div className="state">Loading...</div>
      ) : privateTarget ? (
        <form className="admin-form" onSubmit={onSubmit}>
          {hubMeta && (
            <p className="muted">
              Editing <strong>{hubMeta.name}</strong>
              {hubMeta.private_invite_only ? ' (white-labelled invite-only)' : ''}
            </p>
          )}
          {note && <p className="muted">{note}</p>}

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={unlimited}
              onChange={(e) => setUnlimited(e.target.checked)}
            />
            <span>Unlimited credits</span>
          </label>

          {!unlimited && (
            <label>
              Credits per subscriber (per billing period)
              <input
                type="number"
                min="0"
                max="1000000"
                required
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                placeholder="e.g. 100"
              />
            </label>
          )}

          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save subscriber credits'}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
