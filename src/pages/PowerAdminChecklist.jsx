import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import ChecklistGroupedForm from '../components/ChecklistGroupedForm'
import { checklistToMap } from '../utils/checklist'

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

  const items = hub?.checklist || []

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
          <h1>Hub Functionalities</h1>
          <p className="muted">
            Per-hub Functionalities (access, credits, distribution). User capabilities by role are
            managed under Capabilities.
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
            <>
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
              <ChecklistGroupedForm
                items={items}
                flags={flags}
                setFlags={setFlags}
                onSubmit={onSave}
                saving={saving}
              />
            </>
          )}
        </>
      )}
    </section>
  )
}
