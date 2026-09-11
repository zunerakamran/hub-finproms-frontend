import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function AdminSubscriberCredits({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, hub: currentHub, refreshHub } = useHub()
  const [searchParams] = useSearchParams()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  // Power Admin page can manage any hub (capability checked per hub on API).
  const enabled = asPowerAdmin || can('dashboard_manage_subscriber_credits')
  const eyebrow = asPowerAdmin ? 'Power Admin' : 'Hub Admin'
  const apiOpts = { asPowerAdmin }

  const [hubs, setHubs] = useState([])
  const [hubId, setHubId] = useState('')
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
    if (data.hub?.id) setHubId(String(data.hub.id))
  }

  const loadHubs = async () => {
    if (!asPowerAdmin) return
    try {
      const data = await api.powerAdminHubs()
      setHubs(data.hubs || [])
    } catch {
      // ignore — still load current hub credits
    }
  }

  const load = async (selectedHubId = hubId) => {
    setLoading(true)
    setError('')
    try {
      const params = asPowerAdmin && selectedHubId ? { hub_id: Number(selectedHubId) } : {}
      const data = await api.subscriberCredits(params, apiOpts)
      applyConfig(data)
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
    ;(async () => {
      await loadHubs()
      const fromQuery = searchParams.get('hub')
      const initialId =
        (asPowerAdmin && fromQuery) ||
        (asPowerAdmin && currentHub?.id ? String(currentHub.id) : '') ||
        ''
      setHubId(initialId)
      await load(initialId)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, enabled, asPowerAdmin, currentHub?.id])

  const onHubChange = async (id) => {
    setHubId(id)
    setMessage('')
    await load(id)
  }

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
      if (asPowerAdmin && hubId) {
        payload.hub_id = Number(hubId)
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
              Enable &quot;Set subscriber credits (private hub)&quot; for your role under Power Admin →
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
            Set unlimited or a fixed credit allotment for private-hub Excel subscribers. New imports
            get the allotment immediately; existing subscribers get it on the next monthly
            autorenew.
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {asPowerAdmin && hubs.length > 0 && (
        <label className="hub-select-label">
          Hub
          <select value={hubId} onChange={(e) => onHubChange(e.target.value)} disabled={loading}>
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.type === 'shared' ? 'shared' : 'white-label'})
              </option>
            ))}
          </select>
        </label>
      )}

      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <form className="admin-form" onSubmit={onSubmit}>
          {hubMeta && (
            <p className="muted">
              Editing <strong>{hubMeta.name}</strong>
              {hubMeta.private_invite_only
                ? ' (private invite-only)'
                : ' (public mode — allotment applies when private)'}
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
      )}
    </section>
  )
}
