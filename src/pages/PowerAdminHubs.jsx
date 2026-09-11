import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

const emptyForm = {
  name: '',
  slug: '',
  primary_color: '',
  secondary_color: '',
  logo_url: '',
}

export default function PowerAdminHubs() {
  const [hubs, setHubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.powerAdminHubs()
      setHubs(data.hubs || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        primary_color: form.primary_color.trim() || null,
        secondary_color: form.secondary_color.trim() || null,
        logo_url: form.logo_url.trim() || null,
      }
      const data = await api.createPowerAdminHub(payload)
      setMessage(data.message || 'Hub created.')
      setForm(emptyForm)
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Power Admin</p>
          <h1>White-label hubs</h1>
          <p className="muted">
            Shared and white-labelled hubs share one codebase. Create hubs here, then configure
            each hub&apos;s Functionalities and user Capabilities.
          </p>
        </div>
        <button type="button" className="btn primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'New white-label hub'}
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {showForm && (
        <form className="admin-form hub-create-form" onSubmit={onCreate}>
          <h2>Create white-labelled hub</h2>
          <label>
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Acme Advisors"
            />
          </label>
          <label>
            Slug (optional)
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="acme-advisors"
            />
          </label>
          <div className="form-row two">
            <label>
              Primary colour
              <input
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                placeholder="#1a5f4a"
              />
            </label>
            <label>
              Secondary colour
              <input
                value={form.secondary_color}
                onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                placeholder="#0f172a"
              />
            </label>
          </div>
          <label>
            Logo URL
            <input
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              placeholder="https://..."
            />
          </label>
          <div className="actions">
            <button className="btn primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create hub'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="state">Loading hubs...</div>
      ) : hubs.length === 0 ? (
        <div className="empty-state">
          <h2>No hubs yet</h2>
          <p className="muted">Create a white-labelled hub or seed the shared hub on the backend.</p>
        </div>
      ) : (
        <div className="hub-list">
          {hubs.map((hub) => {
            const enabledCount = (hub.checklist || []).filter((item) => item.enabled).length
            return (
              <article key={hub.id} className="hub-card">
                <div className="hub-card-head">
                  <div>
                    <h2>{hub.name}</h2>
                    <p className="muted">
                      <code>{hub.slug}</code>
                    </p>
                  </div>
                  <div className="hub-card-badges">
                    <span className={`badge ${hub.type === 'shared' ? 'ok' : ''}`}>
                      {hub.type === 'shared' ? 'Shared' : 'White-label'}
                    </span>
                    <span className={`badge ${hub.is_active ? 'ok' : ''}`}>
                      {hub.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <p className="muted">
                  {enabledCount} of {(hub.checklist || []).length} Functionalities enabled
                </p>
                <div className="actions">
                  <Link className="btn primary" to={`/my-dashboard/hubs/${hub.id}`}>
                    Manage hub &amp; Functionalities
                  </Link>
                  <Link className="btn ghost" to={`/my-dashboard/checklist?hub=${hub.id}`}>
                    Functionalities only
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
