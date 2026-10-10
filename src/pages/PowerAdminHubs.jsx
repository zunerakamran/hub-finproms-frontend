import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'
import { codeUpdateBadge, formatReportedVersion } from '../utils/codeUpdate'

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

const emptyRelease = {
  version: '',
  backend_version: '',
  frontend_version: '',
  notes: '',
  backend_zip: null,
  frontend_zip: null,
}

function hubTypeLabel(type) {
  if (type === 'central') return 'Central'
  if (type === 'shared') return 'Shared'
  return 'White-labelled'
}

export default function PowerAdminHubs() {
  const { refreshHub } = useHub()
  const [hubs, setHubs] = useState([])
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [releaseForm, setReleaseForm] = useState(emptyRelease)
  const [publishing, setPublishing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [selectedHubIds, setSelectedHubIds] = useState([])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [hubsData, releasesData] = await Promise.all([
        api.powerAdminHubs(),
        api.powerAdminReleases().catch(() => null),
      ])
      setHubs(hubsData.hubs || [])
      if (releasesData) setOverview(releasesData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onPublishRelease = async (e) => {
    e.preventDefault()
    setPublishing(true)
    setError('')
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('version', releaseForm.version.trim())
      if (releaseForm.backend_version.trim()) {
        fd.append('backend_version', releaseForm.backend_version.trim())
      }
      if (releaseForm.frontend_version.trim()) {
        fd.append('frontend_version', releaseForm.frontend_version.trim())
      }
      if (releaseForm.notes.trim()) {
        fd.append('notes', releaseForm.notes.trim())
      }
      if (releaseForm.backend_zip) {
        fd.append('backend_zip', releaseForm.backend_zip)
      }
      if (releaseForm.frontend_zip) {
        fd.append('frontend_zip', releaseForm.frontend_zip)
      }
      const data = await api.publishPowerAdminRelease(fd)
      setMessage(data.message || 'Release published.')
      setOverview(data.overview || null)
      setReleaseForm(emptyRelease)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setPublishing(false)
    }
  }

  const onRefreshVersions = async () => {
    setRefreshing(true)
    setError('')
    setMessage('')
    try {
      const data = await api.refreshPowerAdminHubVersions()
      setMessage(data.message || 'Versions refreshed.')
      setOverview(data.overview || overview)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  const toggleHub = (id) => {
    setSelectedHubIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const selectAllHubs = () => {
    setSelectedHubIds(hubs.map((h) => h.id))
  }

  const clearHubSelection = () => setSelectedHubIds([])

  const onApplyRelease = async () => {
    if (selectedHubIds.length === 0) {
      setError('Select at least one hub to apply the release.')
      return
    }
    setApplying(true)
    setError('')
    setMessage('')
    try {
      const payload = { hub_ids: selectedHubIds }
      if (overview?.latest_release?.id) {
        payload.release_id = overview.latest_release.id
      }
      const data = await api.applyPowerAdminRelease(payload)
      setMessage(data.message || 'Apply finished.')
      setOverview(data.overview || overview)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setApplying(false)
    }
  }

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
      // Refresh hub context so the top Control hub switcher includes the new hub.
      try {
        await refreshHub({ silent: true })
      } catch {
        // Ignore — page list already refreshed.
      }
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
            slug). Open a hub for deploy wiring / DB credentials. Manage Functionalities, Modules,
            Capabilities, and credits by selecting the hub in the <strong>Control hub</strong>{' '}
            switcher — not from the hub detail page. After you ship a code update (Git / FTP),
            Publish a release with zip packages, select hubs, and apply — or refresh versions after
            a manual Git/FTP ship.
          </p>
        </div>
        <button type="button" className="btn primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'New hub'}
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="admin-card" style={{ marginBottom: '1.25rem' }}>
        <div className="page-head" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Code updates</h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Latest release:{' '}
              <strong>{overview?.latest_release?.version || 'not published yet'}</strong>
              {overview?.latest_release ? (
                <>
                  {' '}
                  · artifacts:{' '}
                  {overview.latest_release.backend_artifact ? 'backend' : 'no backend'}
                  {' / '}
                  {overview.latest_release.frontend_artifact ? 'frontend' : 'no frontend'}
                </>
              ) : null}
              {overview?.this_deploy?.version ? (
                <>
                  {' '}
                  · This Central deploy reports <code>{overview.this_deploy.version}</code>
                </>
              ) : null}
              {overview?.counts ? (
                <>
                  {' '}
                  · {overview.counts.up_to_date || 0} up to date · {overview.counts.behind || 0}{' '}
                  behind · {overview.counts.unknown || 0} unknown
                </>
              ) : null}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={onRefreshVersions}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing…' : 'Refresh all versions'}
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={onApplyRelease}
              disabled={applying || selectedHubIds.length === 0}
            >
              {applying
                ? 'Applying…'
                : `Apply to selected (${selectedHubIds.length})`}
            </button>
          </div>
        </div>
        <form className="admin-form" onSubmit={onPublishRelease}>
          <div className="form-row two">
            <label>
              New latest version
              <input
                required
                value={releaseForm.version}
                onChange={(e) => setReleaseForm({ ...releaseForm, version: e.target.value })}
                placeholder="1.2.0"
              />
            </label>
            <label>
              Notes (optional)
              <input
                value={releaseForm.notes}
                onChange={(e) => setReleaseForm({ ...releaseForm, notes: e.target.value })}
                placeholder="What changed in this release"
              />
            </label>
          </div>
          <div className="form-row two">
            <label>
              Backend zip (Laravel package)
              <input
                type="file"
                accept=".zip,application/zip"
                onChange={(e) =>
                  setReleaseForm({
                    ...releaseForm,
                    backend_zip: e.target.files?.[0] || null,
                  })
                }
              />
            </label>
            <label>
              Frontend zip (Vite dist)
              <input
                type="file"
                accept=".zip,application/zip"
                onChange={(e) =>
                  setReleaseForm({
                    ...releaseForm,
                    frontend_zip: e.target.files?.[0] || null,
                  })
                }
              />
            </label>
          </div>
          <p className="muted form-hint">
            Backend zip should include <code>vendor/</code> if the target cPanel has no Composer.
            Frontend zip = built <code>dist-*</code>. Set each hub&apos;s{' '}
            <strong>frontend extract path</strong> on the hub detail page before applying frontend.
          </p>
          <div className="actions">
            <button className="btn primary" disabled={publishing}>
              {publishing ? 'Publishing…' : 'Publish as latest'}
            </button>
            <button type="button" className="btn ghost" onClick={selectAllHubs}>
              Select all hubs
            </button>
            <button type="button" className="btn ghost" onClick={clearHubSelection}>
              Clear selection
            </button>
          </div>
        </form>
      </div>

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
            const versionBadge = codeUpdateBadge(hub.code_update)
            const checked = selectedHubIds.includes(hub.id)
            const applyLabel = hub.code_update?.apply_status_label
            return (
              <article key={hub.id} className="hub-card">
                <div className="hub-card-head">
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <label className="toggle-row" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleHub(hub.id)}
                        aria-label={`Select ${hub.name}`}
                      />
                    </label>
                    <div>
                      <h2>
                        <Link to={`/my-dashboard/hubs/${hub.id}`}>{hub.name}</Link>
                      </h2>
                      <p className="muted">
                        <code>{hub.slug}</code>
                        {' · code '}
                        <code>{formatReportedVersion(hub.code_update)}</code>
                        {applyLabel && applyLabel !== 'Idle' ? (
                          <>
                            {' · '}
                            {applyLabel}
                          </>
                        ) : null}
                      </p>
                    </div>
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
                    <span className={versionBadge.className}>{versionBadge.label}</span>
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
                  {hub.code_update?.apply_error ? (
                    <>
                      {' · '}
                      <span className="badge warn">Apply error</span>
                    </>
                  ) : null}
                </p>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
