import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import ChecklistGroupedForm from '../components/ChecklistGroupedForm'
import { useHub } from '../context/HubContext'
import { checklistToMap } from '../utils/checklist'

export default function PowerAdminChecklist() {
  const { actingHubId, actingHub, hub, isActingOnWhiteLabel } = useHub()
  const selectedId = actingHubId || hub?.id || ''
  const selectedName = actingHub?.name || hub?.name || 'this hub'

  const [hubDetail, setHubDetail] = useState(null)
  const [flags, setFlags] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!selectedId) {
      setHubDetail(null)
      setFlags({})
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      setMessage('')
      try {
        const data = await api.powerAdminHub(selectedId)
        if (cancelled) return
        setHubDetail(data.hub)
        setFlags(checklistToMap(data.hub.checklist))
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedId])

  const items = hubDetail?.checklist || []

  const onSave = async (e) => {
    e.preventDefault()
    if (!selectedId) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.updatePowerAdminHubChecklist(selectedId, flags)
      setHubDetail(data.hub)
      setFlags(checklistToMap(data.hub.checklist))
      setMessage(data.message || 'Checklist updated.')
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
          <p className="eyebrow">Platform</p>
          <h1>Hub Functionalities</h1>
          <p className="muted">
            Editing Functionalities for <strong>{selectedName}</strong>
            {isActingOnWhiteLabel ? ' (white-labelled)' : ' (shared)'}. Use{' '}
            <strong>Control hub</strong> in the top bar to switch hubs. Enable product modules
            under <Link to="/my-dashboard/modules">Modules</Link>. User capabilities by role are
            managed under Capabilities.
          </p>
        </div>
        <div className="actions">
          <Link to="/my-dashboard/modules" className="btn ghost">
            Modules
          </Link>
          <Link to="/my-dashboard/hubs" className="btn ghost">
            Manage hubs
          </Link>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {!selectedId ? (
        <div className="state">Waiting for hub context…</div>
      ) : loading ? (
        <div className="state">Loading functionalities...</div>
      ) : !hubDetail ? (
        <div className="empty-state">
          <h2>Hub not found</h2>
          <p className="muted">Create a hub first, then configure its checklist.</p>
          <Link to="/my-dashboard/hubs" className="btn primary">
            Go to hubs
          </Link>
        </div>
      ) : (
        <>
          <div className="checklist-hub-summary">
            <div>
              <h2>{hubDetail.name}</h2>
              <p className="muted">
                Slug <code>{hubDetail.slug}</code>
              </p>
            </div>
            <Link className="btn ghost" to={`/my-dashboard/hubs/${hubDetail.id}`}>
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
    </section>
  )
}
