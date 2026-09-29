import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

const emptyForm = {
  name: '',
  slug: '',
  type: 'white_label',
  frontend_url: '',
  api_url: '',
  deploy_notes: '',
  db_driver: 'mysql',
  db_host: '',
  db_port: '3306',
  db_database: '',
  db_username: '',
  db_password: '',
}

function hubTypeLabel(type) {
  if (type === 'central') return 'Central'
  if (type === 'shared') return 'Shared'
  return 'White-labelled'
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
        type: form.type === 'shared' ? 'shared' : 'white_label',
        frontend_url: form.frontend_url.trim() || null,
        api_url: form.api_url.trim() || null,
        deploy_notes: form.deploy_notes.trim() || null,
        db_driver: 'mysql',
        db_host: form.db_host.trim() || null,
        db_port: 3306,
        db_database: form.db_database.trim() || null,
        db_username: form.db_username.trim() || null,
        db_password: form.db_password || null,
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
          <p className="eyebrow">Platform</p>
          <h1>Hubs</h1>
          <p className="muted">
            Central Hub Controller registry. You can create <strong>many Shared</strong> hubs and{' '}
            <strong>many White-labelled</strong> hubs (same codebase, each with its own database and
            slug). Record frontend URL + DB credentials so Central can control them remotely. Shared
            hubs no longer host the control plane — that lives only here.
          </p>
        </div>
        <button type="button" className="btn primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'New hub'}
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {showForm && (
        <form className="admin-form hub-create-form" onSubmit={onCreate}>
          <h2>Create hub</h2>
          <label>
            Hub type
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="white_label">White-labelled</option>
              <option value="shared">Shared</option>
            </select>
          </label>
          <label>
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={form.type === 'shared' ? 'Shared Hub' : 'My Hub'}
            />
          </label>
          <label>
            Slug (optional)
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder={form.type === 'shared' ? 'shared-uk' : 'my-hub'}
            />
          </label>
          <p className="muted form-hint">
            Each Shared / White-label hub needs a <strong>unique slug</strong> (HUB_SLUG on that
            deploy). Examples: <code>shared</code>, <code>shared-uk</code>, <code>acme-advisors</code>.
            For Shared content hubs whose slug is not <code>shared</code>, set{' '}
            <code>HUB_TYPE=shared</code> in that hub&apos;s <code>.env</code>.
          </p>
          <label>
            Frontend URL
            <input
              type="url"
              value={form.frontend_url}
              onChange={(e) => setForm({ ...form, frontend_url: e.target.value })}
              placeholder="https://my-hub.com"
            />
          </label>
          <label>
            API URL (optional)
            <input
              type="url"
              value={form.api_url}
              onChange={(e) => setForm({ ...form, api_url: e.target.value })}
              placeholder="https://api.my-hub.com"
            />
          </label>
          <label>
            Deploy notes (optional)
            <textarea
              rows={3}
              value={form.deploy_notes}
              onChange={(e) => setForm({ ...form, deploy_notes: e.target.value })}
              placeholder="Enter hosting notes, env checklist, etc."
            />
          </label>
          <h3 style={{ margin: '0.5rem 0 0' }}>Remote database (own DB)</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Stored encrypted on Central Hub so content can be managed in this hub&apos;s database.
            The content hub server also uses these values in its own <code>.env</code>. Set{' '}
            <code>HUB_IS_CONTROL_PLANE=false</code> on Shared content deploys.
          </p>
          <div className="form-row two">
            <label>
              Driver
              <input value="mysql" readOnly disabled />
            </label>
            <label>
              Port
              <input value="3306" readOnly disabled />
            </label>
          </div>
          <label>
            Host
            <input
              value={form.db_host}
              onChange={(e) => setForm({ ...form, db_host: e.target.value })}
              placeholder="db.my-hub.com"
            />
          </label>
          <label>
            Database name
            <input
              value={form.db_database}
              onChange={(e) => setForm({ ...form, db_database: e.target.value })}
              placeholder="db_my_hub"
            />
          </label>
          <div className="form-row two">
            <label>
              Username
              <input
                value={form.db_username}
                onChange={(e) => setForm({ ...form, db_username: e.target.value })}
                placeholder="my_hub_user"
                autoComplete="off"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.db_password}
                onChange={(e) => setForm({ ...form, db_password: e.target.value })}
                placeholder="Enter database password"
                autoComplete="new-password"
              />
            </label>
          </div>
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
          <p className="muted">Create a Shared or White-labelled hub, or seed Central on the backend.</p>
        </div>
      ) : (
        <div className="hub-list">
          {hubs.map((hub) => {
            const enabledCount = (hub.checklist || []).filter((item) => item.enabled).length
            const typeLabel = hubTypeLabel(hub.type)
            return (
              <article key={hub.id} className="hub-card">
                <div className="hub-card-head">
                  <div>
                    <h2>
                      <Link to={`/my-dashboard/hubs/${hub.id}`}>{hub.name}</Link>
                    </h2>
                    <p className="muted">
                      <code>{hub.slug}</code>
                    </p>
                  </div>
                  <div className="hub-card-badges">
                    <span
                      className={`badge ${
                        hub.type === 'central' || hub.type === 'shared' ? 'ok' : ''
                      }`}
                    >
                      {typeLabel}
                    </span>
                    <span className={`badge ${hub.is_active ? 'ok' : ''}`}>
                      {hub.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {hub.type !== 'central' ? (
                      <span className={`badge ${hub.deploy?.ready ? 'ok' : 'warn'}`}>
                        {hub.deploy?.ready ? 'Wiring ready' : 'Needs wiring'}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="muted">
                  {enabledCount} of {(hub.checklist || []).length} Functionalities enabled
                  {hub.deploy?.frontend_url ? (
                    <>
                      {' · '}
                      <a href={hub.deploy.frontend_url} target="_blank" rel="noreferrer">
                        {hub.deploy.frontend_url}
                      </a>
                    </>
                  ) : (
                    ' · No frontend URL set'
                  )}
                </p>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
