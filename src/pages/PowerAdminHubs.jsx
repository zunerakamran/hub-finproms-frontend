import { useEffect, useMemo, useState } from 'react'
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
  notes: '',
  backend_zip: null,
  frontend_zip: null,
}

function hubTypeLabel(type) {
  if (type === 'central') return 'Central'
  if (type === 'shared') return 'Shared'
  return 'White-labelled'
}

function fileLabel(file) {
  if (!file) return 'No file chosen'
  const mb = file.size / (1024 * 1024)
  return `${file.name} (${mb < 0.1 ? `${Math.round(file.size / 1024)} KB` : `${mb.toFixed(1)} MB`})`
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
  const [applyResults, setApplyResults] = useState(null)

  const latest = overview?.latest_release
  const readyToApply = Boolean(latest?.ready_to_apply)
  const counts = overview?.counts || {}

  const selectedHubs = useMemo(
    () => hubs.filter((h) => selectedHubIds.includes(h.id)),
    [hubs, selectedHubIds],
  )

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
    if (!releaseForm.backend_zip && !releaseForm.frontend_zip) {
      setError('Attach at least one zip (backend and/or frontend) so you can apply this release.')
      return
    }
    setPublishing(true)
    setError('')
    setMessage('')
    setApplyResults(null)
    try {
      const fd = new FormData()
      fd.append('version', releaseForm.version.trim())
      if (releaseForm.notes.trim()) fd.append('notes', releaseForm.notes.trim())
      if (releaseForm.backend_zip) fd.append('backend_zip', releaseForm.backend_zip)
      if (releaseForm.frontend_zip) fd.append('frontend_zip', releaseForm.frontend_zip)
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

  const selectAllHubs = () => setSelectedHubIds(hubs.map((h) => h.id))
  const selectBehindHubs = () =>
    setSelectedHubIds(
      hubs.filter((h) => h.code_update?.status === 'behind').map((h) => h.id),
    )
  const clearHubSelection = () => setSelectedHubIds([])

  const onApplyRelease = async () => {
    if (selectedHubIds.length === 0) {
      setError('Select at least one hub (include Central if you want Central updated too).')
      return
    }
    if (!readyToApply) {
      setError('Publish a release with at least one zip before applying.')
      return
    }
    setApplying(true)
    setError('')
    setMessage('')
    setApplyResults(null)
    try {
      const payload = { hub_ids: selectedHubIds }
      if (latest?.id) payload.release_id = latest.id
      const data = await api.applyPowerAdminRelease(payload)
      setMessage(data.message || 'Apply finished.')
      setOverview(data.overview || overview)
      setApplyResults(data.results || [])
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
      try {
        await refreshHub({ silent: true })
      } catch {
        // Ignore
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <section className="hubs-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Platform</p>
          <h1>Hubs</h1>
          <p className="muted hubs-page__lede">
            Register Shared / White-labelled hubs, then push code updates from here — without
            opening each cPanel.
          </p>
        </div>
        <button type="button" className="btn primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'New hub'}
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="hubs-howto">
        <h2>How code updates work</h2>
        <ol className="hubs-howto__steps">
          <li>
            <strong>Update code on your computer</strong>
            <span>Edit backend/frontend locally (Git). You do not hand-edit each live hub.</span>
          </li>
          <li>
            <strong>Make zip packages</strong>
            <span>
              Backend = Laravel project zip (include <code>vendor/</code> if needed). Frontend =
              built <code>dist-*</code> zip after npm build.
            </span>
          </li>
          <li>
            <strong>Publish here, then select hubs &amp; Apply</strong>
            <span>
              Include <em>Central</em> in the selection if you want Central updated too. Selected
              hubs receive the new code automatically.
            </span>
          </li>
        </ol>
        <p className="muted hubs-howto__note">
          You still need this dashboard running on Central to upload/apply. After that, choose
          Central + other hubs in step 3 — no manual FTP/git per hub for that release.
        </p>
      </div>

      <div className="hubs-stats">
        <div className="hubs-stat">
          <span className="hubs-stat__label">Latest release</span>
          <strong>{latest?.version || '—'}</strong>
          <span className="muted">
            {latest
              ? [
                  latest.backend_artifact ? 'Backend zip' : null,
                  latest.frontend_artifact ? 'Frontend zip' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'No zips yet'
              : 'Publish a release below'}
          </span>
        </div>
        <div className="hubs-stat">
          <span className="hubs-stat__label">This Central</span>
          <strong>
            <code>{overview?.this_deploy?.version || '—'}</code>
          </strong>
          <span className="muted">Version this server reports now</span>
        </div>
        <div className="hubs-stat">
          <span className="hubs-stat__label">Fleet status</span>
          <strong>
            {counts.up_to_date || 0} up to date
          </strong>
          <span className="muted">
            {counts.behind || 0} behind · {counts.unknown || 0} unknown
            {(counts.error || 0) > 0 ? ` · ${counts.error} check failed` : ''}
          </span>
        </div>
      </div>

      <div className="hubs-update-panel">
        <div className="hubs-update-panel__head">
          <div>
            <p className="eyebrow">Step 1</p>
            <h2>Publish release package</h2>
          </div>
          <button type="button" className="btn" onClick={onRefreshVersions} disabled={refreshing}>
            {refreshing ? 'Checking…' : 'Check all versions'}
          </button>
        </div>

        <form className="admin-form hubs-release-form" onSubmit={onPublishRelease}>
          <div className="form-row two">
            <label>
              Version number
              <input
                required
                value={releaseForm.version}
                onChange={(e) => setReleaseForm({ ...releaseForm, version: e.target.value })}
                placeholder="e.g. 1.2.0"
              />
            </label>
            <label>
              What changed? (optional)
              <input
                value={releaseForm.notes}
                onChange={(e) => setReleaseForm({ ...releaseForm, notes: e.target.value })}
                placeholder="Short release note"
              />
            </label>
          </div>

          <div className="hubs-zip-row">
            <label className={`hubs-zip ${releaseForm.backend_zip ? 'is-filled' : ''}`}>
              <span className="hubs-zip__title">Backend zip</span>
              <span className="hubs-zip__hint">Laravel app package</span>
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
              <span className="hubs-zip__file">{fileLabel(releaseForm.backend_zip)}</span>
            </label>
            <label className={`hubs-zip ${releaseForm.frontend_zip ? 'is-filled' : ''}`}>
              <span className="hubs-zip__title">Frontend zip</span>
              <span className="hubs-zip__hint">Built Vite dist folder</span>
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
              <span className="hubs-zip__file">{fileLabel(releaseForm.frontend_zip)}</span>
            </label>
          </div>

          <p className="muted form-hint">
            Before applying a frontend zip, open each hub and set its{' '}
            <strong>frontend extract path</strong> (server folder). Content hubs also need{' '}
            <strong>API URL</strong> in deploy wiring.
          </p>

          <div className="actions">
            <button className="btn primary" disabled={publishing}>
              {publishing ? 'Publishing…' : 'Publish as latest'}
            </button>
          </div>
        </form>
      </div>

      <div className="hubs-update-panel hubs-update-panel--apply">
        <div className="hubs-update-panel__head">
          <div>
            <p className="eyebrow">Step 2 &amp; 3</p>
            <h2>Select hubs, then apply</h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              {selectedHubIds.length === 0
                ? 'No hubs selected yet.'
                : `${selectedHubIds.length} selected: ${selectedHubs.map((h) => h.name).join(', ')}`}
            </p>
          </div>
          <div className="hubs-apply-actions">
            <button type="button" className="btn ghost" onClick={selectAllHubs} disabled={!hubs.length}>
              Select all
            </button>
            <button type="button" className="btn ghost" onClick={selectBehindHubs}>
              Select behind
            </button>
            <button type="button" className="btn ghost" onClick={clearHubSelection}>
              Clear
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={onApplyRelease}
              disabled={applying || selectedHubIds.length === 0 || !readyToApply}
            >
              {applying
                ? 'Applying…'
                : `Apply ${latest?.version || 'release'} (${selectedHubIds.length})`}
            </button>
          </div>
        </div>
        {!readyToApply && (
          <p className="hubs-apply-banner">
            Publish a release with at least one zip in Step 1 before you can apply.
          </p>
        )}
        {applyResults?.length ? (
          <ul className="hubs-apply-results">
            {applyResults.map((row) => (
              <li key={row.hub_id} className={row.ok ? 'ok' : 'fail'}>
                <strong>{row.slug}</strong> — {row.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {showForm && (
        <form className="admin-form hub-create-form" onSubmit={onCreate}>
          <h2>Register a new hub</h2>
          <p className="muted">
            This only adds the hub to the Central registry. You still copy the codebase once onto
            that hub&apos;s cPanel for the first install.
          </p>
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
            API URL (needed for remote updates)
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
              placeholder="Hosting notes, env checklist, etc."
            />
          </label>
          <h3 style={{ margin: '0.5rem 0 0' }}>Remote database (own DB)</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Stored on Central so you can control this hub remotely. Also set these in that hub&apos;s{' '}
            <code>.env</code>.
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
                placeholder="Database password"
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

      <div className="hubs-list-head">
        <h2>All hubs</h2>
        <p className="muted">Tick hubs to include them in Apply. Open a hub for wiring &amp; paths.</p>
      </div>

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
            const typeLabel = hubTypeLabel(hub.type)
            const versionBadge = codeUpdateBadge(hub.code_update)
            const checked = selectedHubIds.includes(hub.id)
            const applyLabel = hub.code_update?.apply_status_label
            const canApplyRemote = hub.type === 'central' || Boolean(hub.deploy?.api_url)
            return (
              <article
                key={hub.id}
                className={`hub-card hub-card--selectable ${checked ? 'is-selected' : ''}`}
              >
                <div className="hub-card-head">
                  <div className="hub-card__identity">
                    <label className="hub-card__check">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleHub(hub.id)}
                        aria-label={`Select ${hub.name}`}
                      />
                      <span />
                    </label>
                    <div>
                      <h2>
                        <Link to={`/my-dashboard/hubs/${hub.id}`}>{hub.name}</Link>
                      </h2>
                      <p className="muted hub-card__meta">
                        <code>{hub.slug}</code>
                        <span>Code {formatReportedVersion(hub.code_update)}</span>
                        {applyLabel && applyLabel !== 'Idle' ? <span>{applyLabel}</span> : null}
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
                    {!canApplyRemote ? (
                      <span className="badge warn">No API URL</span>
                    ) : null}
                  </div>
                </div>
                <div className="hub-card__foot">
                  {hub.deploy?.frontend_url ? (
                    <a href={hub.deploy.frontend_url} target="_blank" rel="noreferrer">
                      {hub.deploy.frontend_url}
                    </a>
                  ) : (
                    <span className="muted">No frontend URL</span>
                  )}
                  <Link to={`/my-dashboard/hubs/${hub.id}`} className="btn ghost hub-card__open">
                    Open wiring
                  </Link>
                </div>
                {hub.code_update?.apply_error ? (
                  <p className="hub-card__error">{hub.code_update.apply_error}</p>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
