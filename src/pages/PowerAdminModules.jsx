import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function PowerAdminModules() {
  const { isPowerAdmin } = useAuth()
  const { actingHubId, actingHub, hub, isActingOnWhiteLabel, refreshHub, can, loading: hubLoading } =
    useHub()

  const selectedId = actingHubId || hub?.id || ''
  const selectedName = actingHub?.name || hub?.name || 'this hub'
  const asPowerAdmin = isPowerAdmin
  const enabled = can('dashboard_manage_modules')

  const [modules, setModules] = useState([])
  const [flags, setFlags] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (hubLoading || !selectedId || !enabled) {
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      setMessage('')
      try {
        const data = await api.hubModules(
          { hub_id: selectedId },
          { asPowerAdmin }
        )
        if (cancelled) return
        const rows = data.modules || []
        setModules(rows)
        const next = {}
        for (const row of rows) next[row.key] = Boolean(row.enabled)
        setFlags(next)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedId, hubLoading, enabled, asPowerAdmin])

  const onSave = async (e) => {
    e.preventDefault()
    if (!selectedId) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.updateHubModules(
        { hub_id: selectedId, modules: flags },
        { asPowerAdmin }
      )
      const rows = data.modules || []
      setModules(rows)
      const next = {}
      for (const row of rows) next[row.key] = Boolean(row.enabled)
      setFlags(next)
      setMessage(data.message || 'Modules updated.')
      await refreshHub({ silent: true })
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
            <p className="eyebrow">Power Admin</p>
            <h1>Modules</h1>
            <p className="muted">
              Enable &quot;Manage hub modules&quot; for your role under Power Admin → Capabilities
              for this hub.
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
          <p className="eyebrow">Hub modules</p>
          <h1>Modules</h1>
          <p className="muted">
            Enable product modules for <strong>{selectedName}</strong>
            {isActingOnWhiteLabel ? ' (white-label)' : ' (shared)'}. Related Capabilities stay
            blurred until a module is on. Who can open this screen is controlled by{' '}
            <strong>Manage hub modules</strong> in the Capabilities matrix.
          </p>
        </div>
        <Link to="/my-dashboard/capabilities" className="btn ghost">
          Capabilities
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {!selectedId ? (
        <div className="state">Waiting for hub context…</div>
      ) : loading ? (
        <div className="state">Loading modules...</div>
      ) : modules.length === 0 ? (
        <div className="empty-state">
          <h2>No modules returned</h2>
          <p className="muted">Restart the Laravel backend and refresh this page.</p>
        </div>
      ) : (
        <form className="admin-form checklist-form" onSubmit={onSave}>
          <div className="checklist-section" id="modules">
            <h2>Modules</h2>
            <p className="muted checklist-section-hint">
              Social Media Compliance is available now. Website and General Compliance are coming
              soon.
            </p>
            <div className="checklist-grid">
              {modules.map((item) => (
                <label key={item.key} className="checklist-item">
                  <input
                    type="checkbox"
                    checked={Boolean(flags[item.key])}
                    disabled={!item.available}
                    onChange={(e) =>
                      setFlags((prev) => ({
                        ...prev,
                        [item.key]: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    <strong>
                      {item.label}
                      {!item.available ? ' (coming soon)' : ''}
                    </strong>
                    <small className="muted">{item.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save modules'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
