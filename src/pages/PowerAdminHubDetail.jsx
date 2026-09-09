import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import ChecklistGroupedForm from '../components/ChecklistGroupedForm'
import { checklistToMap } from '../utils/checklist'

export default function PowerAdminHubDetail() {
  const { hubId } = useParams()
  const [hub, setHub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingMeta, setSavingMeta] = useState(false)
  const [savingChecklist, setSavingChecklist] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [meta, setMeta] = useState({
    name: '',
    slug: '',
    primary_color: '',
    secondary_color: '',
    logo_url: '',
    is_active: true,
  })
  const [flags, setFlags] = useState({})

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.powerAdminHub(hubId)
      const next = data.hub
      setHub(next)
      setMeta({
        name: next.name || '',
        slug: next.slug || '',
        primary_color: next.branding?.primary_color || '',
        secondary_color: next.branding?.secondary_color || '',
        logo_url: next.branding?.logo_url || '',
        is_active: Boolean(next.is_active),
      })
      setFlags(checklistToMap(next.checklist))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [hubId])

  const checklistItems = hub?.checklist || []

  const onSaveMeta = async (e) => {
    e.preventDefault()
    setSavingMeta(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        name: meta.name.trim(),
        primary_color: meta.primary_color.trim() || null,
        secondary_color: meta.secondary_color.trim() || null,
        logo_url: meta.logo_url.trim() || null,
        is_active: meta.is_active,
      }
      if (hub?.type !== 'shared') {
        payload.slug = meta.slug.trim()
      }
      const data = await api.updatePowerAdminHub(hubId, payload)
      setHub(data.hub)
      setMessage(data.message || 'Hub updated.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingMeta(false)
    }
  }

  const onSaveChecklist = async (e) => {
    e.preventDefault()
    setSavingChecklist(true)
    setError('')
    setMessage('')
    try {
      const data = await api.updatePowerAdminHubChecklist(hubId, flags)
      setHub(data.hub)
      setFlags(checklistToMap(data.hub.checklist))
      setMessage(data.message || 'Checklist updated.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingChecklist(false)
    }
  }

  if (loading) {
    return <div className="state">Loading hub...</div>
  }

  if (!hub) {
    return (
      <section>
        <div className="alert">{error || 'Hub not found.'}</div>
        <Link to="/power-admin/hubs" className="btn ghost">
          ← Back to hubs
        </Link>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Power Admin</p>
          <h1>{hub.name}</h1>
          <p className="muted">
            Update branding and Functionalities for this{' '}
            {hub.type === 'shared' ? 'shared' : 'white-labelled'} hub.
          </p>
        </div>
        <Link to="/power-admin/hubs" className="btn ghost">
          ← All hubs
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <form className="admin-form hub-meta-form" onSubmit={onSaveMeta}>
        <h2>Hub details & branding</h2>
        <label>
          Name
          <input
            required
            value={meta.name}
            onChange={(e) => setMeta({ ...meta, name: e.target.value })}
          />
        </label>
        <label>
          Slug
          <input
            required
            disabled={hub.type === 'shared'}
            value={meta.slug}
            onChange={(e) => setMeta({ ...meta, slug: e.target.value })}
          />
        </label>
        <div className="form-row two">
          <label>
            Primary colour
            <input
              value={meta.primary_color}
              onChange={(e) => setMeta({ ...meta, primary_color: e.target.value })}
              placeholder="#1a5f4a"
            />
          </label>
          <label>
            Secondary colour
            <input
              value={meta.secondary_color}
              onChange={(e) => setMeta({ ...meta, secondary_color: e.target.value })}
              placeholder="#0f172a"
            />
          </label>
        </div>
        <label>
          Logo URL
          <input
            value={meta.logo_url}
            onChange={(e) => setMeta({ ...meta, logo_url: e.target.value })}
          />
        </label>
        {hub.type !== 'shared' && (
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={meta.is_active}
              onChange={(e) => setMeta({ ...meta, is_active: e.target.checked })}
            />
            <span>Hub is active</span>
          </label>
        )}
        <div className="actions">
          <button className="btn primary" disabled={savingMeta}>
            {savingMeta ? 'Saving...' : 'Save hub details'}
          </button>
        </div>
      </form>

      <div id="checklist">
        <div className="page-head" style={{ marginTop: '1.5rem' }}>
          <div>
            <h2>Functionalities</h2>
            <p className="muted">
              How this hub works (access, credits, distribution). Opposite options cannot both be
              on. User capabilities are under Capabilities.
            </p>
          </div>
        </div>
        <ChecklistGroupedForm
          items={checklistItems}
          flags={flags}
          setFlags={setFlags}
          onSubmit={onSaveChecklist}
          saving={savingChecklist}
          submitLabel="Save checklist"
        />
      </div>
    </section>
  )
}
