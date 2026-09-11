import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

const emptyForm = {
  name: '',
  slug: '',
  primary_color: '',
  secondary_color: '',
  logo_url: '',
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
        frontend_url: form.frontend_url.trim() || null,
        api_url: form.api_url.trim() || null,
        deploy_notes: form.deploy_notes.trim() || null,
        db_driver: form.db_driver.trim() || 'mysql',
        db_host: form.db_host.trim() || null,
        db_port: form.db_port.trim() ? Number(form.db_port.trim()) : null,
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
          <p className="eyebrow">Power Admin</p>
          <h1>White-label hubs</h1>
          <p className="muted">
            Shared and white-labelled hubs share one codebase but each has its own database. Create a
            hub record here with that hub&apos;s frontend URL and DB credentials so shared can push
            content later. Deploy the white-label copy with its own <code>.env</code> (
            <code>HUB_SLUG</code> + its own <code>DB_*</code>).
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
          <label>
            Frontend URL (white-label site)
            <input
              type="url"
              value={form.frontend_url}
              onChange={(e) => setForm({ ...form, frontend_url: e.target.value })}
              placeholder="https://acme.example.com"
            />
          </label>
          <label>
            API URL (optional)
            <input
              type="url"
              value={form.api_url}
              onChange={(e) => setForm({ ...form, api_url: e.target.value })}
              placeholder="https://api.acme.example.com"
            />
          </label>
          <label>
            Deploy notes (optional)
            <textarea
              rows={3}
              value={form.deploy_notes}
              onChange={(e) => setForm({ ...form, deploy_notes: e.target.value })}
              placeholder="Hosting notes, env checklist, etc."
            />
          </label>
          <h3 style={{ margin: '0.5rem 0 0' }}>White-label database (own DB)</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Stored encrypted on the shared hub so content can be pushed into this hub&apos;s database.
            The white-label server also uses these values in its own <code>.env</code>.
          </p>
          <div className="form-row two">
            <label>
              Driver
              <select
                value={form.db_driver}
                onChange={(e) => setForm({ ...form, db_driver: e.target.value })}
              >
                <option value="mysql">mysql</option>
                <option value="pgsql">pgsql</option>
                <option value="sqlsrv">sqlsrv</option>
              </select>
            </label>
            <label>
              Port
              <input
                value={form.db_port}
                onChange={(e) => setForm({ ...form, db_port: e.target.value })}
                placeholder="3306"
              />
            </label>
          </div>
          <label>
            Host
            <input
              value={form.db_host}
              onChange={(e) => setForm({ ...form, db_host: e.target.value })}
              placeholder="db.acme.example.com"
            />
          </label>
          <label>
            Database name
            <input
              value={form.db_database}
              onChange={(e) => setForm({ ...form, db_database: e.target.value })}
              placeholder="hub_acme"
            />
          </label>
          <div className="form-row two">
            <label>
              Username
              <input
                value={form.db_username}
                onChange={(e) => setForm({ ...form, db_username: e.target.value })}
                placeholder="hub_user"
                autoComplete="off"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.db_password}
                onChange={(e) => setForm({ ...form, db_password: e.target.value })}
                placeholder="••••••••"
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
                    <span className={`badge ${hub.deploy?.ready ? 'ok' : 'warn'}`}>
                      {hub.deploy?.ready ? 'Wiring ready' : 'Needs wiring'}
                    </span>
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
