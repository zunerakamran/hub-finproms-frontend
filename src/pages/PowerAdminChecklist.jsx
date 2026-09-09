import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { checklistToMap, toggleChecklistFlag } from '../utils/checklist'

export default function PowerAdminChecklist() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('hub') || ''

  const [hubs, setHubs] = useState([])
  const [hub, setHub] = useState(null)
  const [flags, setFlags] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadHubs = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.powerAdminHubs()
      const list = data.hubs || []
      setHubs(list)
      if (!selectedId && list[0]) {
        setSearchParams({ hub: String(list[0].id) }, { replace: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHubs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setHub(null)
      setFlags({})
      return
    }
    let cancelled = false
    ;(async () => {
      setError('')
      try {
        const data = await api.powerAdminHub(selectedId)
        if (cancelled) return
        setHub(data.hub)
        setFlags(checklistToMap(data.hub.checklist))
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const items = useMemo(() => hub?.checklist || [], [hub])

  const onSave = async (e) => {
    e.preventDefault()
    if (!selectedId) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.updatePowerAdminHubChecklist(selectedId, flags)
      setHub(data.hub)
      setFlags(checklistToMap(data.hub.checklist))
      setMessage(data.message || 'Checklist updated.')
      await loadHubs()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Power Admin</p>
          <h1>Rights checklist</h1>
          <p className="muted">
            Pick a hub and toggle which functionalities are available. Opposite options cannot both
            be on — checking one automatically unchecks the other.
          </p>
        </div>
        <Link to="/power-admin/hubs" className="btn ghost">
          Manage hubs
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {loading ? (
        <div className="state">Loading hubs...</div>
      ) : hubs.length === 0 ? (
        <div className="empty-state">
          <h2>No hubs found</h2>
          <p className="muted">Create a hub first, then configure its checklist.</p>
          <Link to="/power-admin/hubs" className="btn primary">
            Go to hubs
          </Link>
        </div>
      ) : (
        <>
          <label className="hub-select-label">
            Hub
            <select
              value={selectedId}
              onChange={(e) => setSearchParams({ hub: e.target.value })}
            >
              {hubs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.type === 'shared' ? 'shared' : 'white-label'})
                </option>
              ))}
            </select>
          </label>

          {hub && (
            <form className="admin-form checklist-form" onSubmit={onSave}>
              <div className="checklist-hub-summary">
                <div>
                  <h2>{hub.name}</h2>
                  <p className="muted">
                    Slug <code>{hub.slug}</code>
                  </p>
                </div>
                <Link className="btn ghost" to={`/power-admin/hubs/${hub.id}`}>
                  Open full hub settings
                </Link>
              </div>

              <div className="checklist-grid">
                {items.map((item) => (
                  <label key={item.key} className="checklist-item">
                    <input
                      type="checkbox"
                      checked={Boolean(flags[item.key])}
                      onChange={(e) =>
                        setFlags((prev) =>
                          toggleChecklistFlag(prev, item.key, e.target.checked, item.exclusive_with)
                        )
                      }
                    />
                    <span>
                      <strong>{item.label}</strong>
                      <small className="muted">{item.description}</small>
                      {item.exclusive_with && (
                        <small className="muted exclusive-hint">
                          Opposite of <code>{item.exclusive_with}</code>
                        </small>
                      )}
                    </span>
                  </label>
                ))}
              </div>

              <div className="actions">
                <button className="btn primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save checklist'}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  )
}
