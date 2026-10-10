import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import HubBackupPanel from '../components/HubBackupPanel'
import HubDeployChecklist from '../components/HubDeployChecklist'
import { codeUpdateBadge, formatReportedVersion } from '../utils/codeUpdate'
import { buildDeployPreview } from '../utils/hubDeploy'

/**
 * Hub registry detail: name / slug / deploy wiring only.
 * Functionalities, Modules, Capabilities, and Subscriber credits are managed
 * after selecting the hub in the Control hub switcher — not from this page.
 */
export default function PowerAdminHubDetail() {
  const { hubId } = useParams()
  const [hub, setHub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingMeta, setSavingMeta] = useState(false)
  const [refreshingVersion, setRefreshingVersion] = useState(false)
  const [markingVersion, setMarkingVersion] = useState(false)
  const [manualVersion, setManualVersion] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [meta, setMeta] = useState({
    name: '',
    slug: '',
    frontend_url: '',
    api_url: '',
    deploy_notes: '',
    db_driver: 'mysql',
    db_host: '',
    db_port: '3306',
    db_database: '',
    db_username: '',
    db_password: '',
    clear_db_password: false,
    db_ssl_mode: 'disabled',
    db_ssl_ca: '',
    clear_db_ssl_ca: false,
    is_active: true,
  })

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
        frontend_url: next.deploy?.frontend_url || '',
        api_url: next.deploy?.api_url || '',
        deploy_notes: next.deploy?.deploy_notes || '',
        db_driver: next.deploy?.database?.driver || 'mysql',
        db_host: next.deploy?.database?.host || '',
        db_port: next.deploy?.database?.port != null ? String(next.deploy.database.port) : '3306',
        db_database: next.deploy?.database?.database || '',
        db_username: next.deploy?.database?.username || '',
        db_password: '',
        clear_db_password: false,
        db_ssl_mode: next.deploy?.database?.ssl_mode || 'disabled',
        db_ssl_ca: '',
        clear_db_ssl_ca: false,
        is_active: Boolean(next.is_active),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [hubId])

  const onRefreshVersion = async () => {
    setRefreshingVersion(true)
    setError('')
    setMessage('')
    try {
      const data = await api.refreshPowerAdminHubVersion(hubId)
      setHub(data.hub)
      setMessage(data.message || 'Version refreshed.')
    } catch (err) {
      setError(err.message)
    } finally {
      setRefreshingVersion(false)
    }
  }

  const onMarkVersion = async (e) => {
    e.preventDefault()
    setMarkingVersion(true)
    setError('')
    setMessage('')
    try {
      const data = await api.markPowerAdminHubVersion(hubId, {
        version: manualVersion.trim(),
      })
      setHub(data.hub)
      setMessage(data.message || 'Version recorded.')
      setManualVersion('')
    } catch (err) {
      setError(err.message)
    } finally {
      setMarkingVersion(false)
    }
  }

  const onSaveMeta = async (e) => {
    e.preventDefault()
    setSavingMeta(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        name: meta.name.trim(),
        frontend_url: meta.frontend_url.trim() || null,
        api_url: meta.api_url.trim() || null,
        deploy_notes: meta.deploy_notes.trim() || null,
        db_driver: 'mysql',
        db_host: meta.db_host.trim() || null,
        db_port: 3306,
        db_database: meta.db_database.trim() || null,
        db_username: meta.db_username.trim() || null,
        is_active: meta.is_active,
      }
      if (meta.db_password.trim()) {
        payload.db_password = meta.db_password
      }
      if (meta.clear_db_password) {
        payload.clear_db_password = true
      }
      payload.db_ssl_mode = meta.db_ssl_mode || 'disabled'
      if (meta.db_ssl_ca.trim()) {
        payload.db_ssl_ca = meta.db_ssl_ca.trim()
      }
      if (meta.clear_db_ssl_ca) {
        payload.clear_db_ssl_ca = true
      }
      if (hub?.type !== 'shared') {
        payload.slug = meta.slug.trim()
      }
      const data = await api.updatePowerAdminHub(hubId, payload)
      setHub(data.hub)
      setMeta((prev) => ({
        ...prev,
        db_password: '',
        clear_db_password: false,
        db_ssl_ca: '',
        clear_db_ssl_ca: false,
        db_ssl_mode: data.hub.deploy?.database?.ssl_mode || prev.db_ssl_mode,
        db_driver: data.hub.deploy?.database?.driver || prev.db_driver,
        db_host: data.hub.deploy?.database?.host || '',
        db_port:
          data.hub.deploy?.database?.port != null
            ? String(data.hub.deploy.database.port)
            : prev.db_port,
        db_database: data.hub.deploy?.database?.database || '',
        db_username: data.hub.deploy?.database?.username || '',
      }))
      setMessage(data.message || 'Hub updated.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingMeta(false)
    }
  }

  if (loading) {
    return <div className="state">Loading hub...</div>
  }

  if (!hub) {
    return (
      <section>
        <div className="alert">{error || 'Hub not found.'}</div>
        <Link to="/my-dashboard/hubs" className="btn ghost">
          ← Back to hubs
        </Link>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Platform</p>
          <h1>{hub.name}</h1>
          <p className="muted">
            Registry and deploy wiring for this{' '}
            {hub.type === 'central'
              ? 'Central Hub Controller'
              : hub.type === 'shared'
                ? 'Shared'
                : 'White-labelled'}{' '}
            hub. To manage Functionalities, Modules, Capabilities, or Subscriber credits, select
            the hub in the <strong>Control hub</strong> switcher in the top bar.
          </p>
          {hub.deploy?.status_label && (
            <p style={{ marginTop: '0.5rem' }}>
              <span className={`badge ${hub.deploy.ready ? 'ok' : 'warn'}`}>
                {hub.deploy.status_label}
              </span>
              {hub.code_update ? (
                <>
                  {' '}
                  <span className={codeUpdateBadge(hub.code_update).className}>
                    {codeUpdateBadge(hub.code_update).label}
                  </span>
                </>
              ) : null}
            </p>
          )}
        </div>
        <Link to="/my-dashboard/hubs" className="btn ghost">
          ← All hubs
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="admin-form hub-meta-form" style={{ marginBottom: '1.25rem' }}>
        <h2>Code version</h2>
        <p className="muted">
          Reported: <code>{formatReportedVersion(hub.code_update)}</code>
          {hub.code_update?.source ? (
            <>
              {' '}
              · source <code>{hub.code_update.source}</code>
            </>
          ) : null}
          {hub.code_update?.checked_at ? (
            <>
              {' '}
              · checked {new Date(hub.code_update.checked_at).toLocaleString()}
            </>
          ) : null}
        </p>
        {hub.code_update?.error ? (
          <div className="alert">{hub.code_update.error}</div>
        ) : null}
        <p className="muted">
          After Git/FTP deploy on this hub, set <code>APP_VERSION</code> /{' '}
          <code>FRONTEND_VERSION</code> (or bump the backend <code>VERSION</code> file), then
          refresh. Requires <code>api_url</code> for remote hubs.
        </p>
        <div className="actions">
          <button
            type="button"
            className="btn primary"
            onClick={onRefreshVersion}
            disabled={refreshingVersion}
          >
            {refreshingVersion ? 'Refreshing…' : 'Refresh version'}
          </button>
        </div>
        <form onSubmit={onMarkVersion} style={{ marginTop: '0.75rem' }}>
          <label>
            Mark version manually (if API check unavailable)
            <input
              value={manualVersion}
              onChange={(e) => setManualVersion(e.target.value)}
              placeholder="1.2.0"
              required
            />
          </label>
          <div className="actions">
            <button className="btn" disabled={markingVersion}>
              {markingVersion ? 'Saving…' : 'Record version'}
            </button>
          </div>
        </form>
      </div>

      <form className="admin-form hub-meta-form" onSubmit={onSaveMeta}>
        <h2>Hub details</h2>
        <label>
          Name
          <input
            required
            value={meta.name}
            onChange={(e) => setMeta({ ...meta, name: e.target.value })}
            placeholder="My Hub"
          />
        </label>
        <label>
          Slug
          <input
            required
            disabled={hub.type === 'shared' || hub.type === 'central'}
            value={meta.slug}
            onChange={(e) => setMeta({ ...meta, slug: e.target.value })}
            placeholder="my-hub"
          />
        </label>
        <div className="info-callout">
          <strong>Branding</strong>
          <p className="muted">
            Logo, application name, and primary / secondary colours are configured in{' '}
            <em>My Dashboard → Settings</em> on this hub — they are not edited here.
          </p>
        </div>
        {hub.type !== 'shared' && hub.type !== 'central' && (
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

      <form className="admin-form hub-meta-form" style={{ marginTop: '1.25rem' }} onSubmit={onSaveMeta}>
        <h2>Deploy wiring</h2>
        <p className="muted">
          Record where this hub is hosted and the credentials for its own database. Central Hub
          uses these credentials to control Shared and White-labelled hubs remotely.
        </p>
        <label>
          Frontend URL
          <input
            type="url"
            value={meta.frontend_url}
            onChange={(e) => setMeta({ ...meta, frontend_url: e.target.value })}
            placeholder="https://my-hub.com"
          />
        </label>
        <label>
          API URL (optional)
          <input
            type="url"
            value={meta.api_url}
            onChange={(e) => setMeta({ ...meta, api_url: e.target.value })}
            placeholder="https://api.my-hub.com"
          />
        </label>
        <label>
          Deploy notes
          <textarea
            rows={4}
            value={meta.deploy_notes}
            onChange={(e) => setMeta({ ...meta, deploy_notes: e.target.value })}
            placeholder="Enter hosting notes, env checklist, contact, etc."
          />
        </label>

        {hub.type !== 'central' && (
          <>
            <h3 style={{ margin: '0.75rem 0 0' }}>Remote database (own DB)</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Password is stored encrypted and never shown again. Leave password blank to keep the
              current value.
              {hub.deploy?.database?.password_set ? ' Password is currently set.' : ' No password set yet.'}
              {hub.type === 'shared'
                ? ' Shared content hubs need remote DB wiring so Central can control them.'
                : ''}
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
                value={meta.db_host}
                onChange={(e) => setMeta({ ...meta, db_host: e.target.value })}
                placeholder="db.my-hub.com"
                autoComplete="off"
              />
            </label>
            <label>
              Database name
              <input
                value={meta.db_database}
                onChange={(e) => setMeta({ ...meta, db_database: e.target.value })}
                placeholder="db_my_hub"
                autoComplete="off"
              />
            </label>
            <div className="form-row two">
              <label>
                Username
                <input
                  value={meta.db_username}
                  onChange={(e) => setMeta({ ...meta, db_username: e.target.value })}
                  placeholder="my_hub_user"
                  autoComplete="off"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={meta.db_password}
                  onChange={(e) =>
                    setMeta({ ...meta, db_password: e.target.value, clear_db_password: false })
                  }
                  placeholder={
                    hub.deploy?.database?.password_set
                      ? 'Leave blank to keep current password'
                      : 'Enter database password'
                  }
                  autoComplete="new-password"
                />
              </label>
            </div>
            {hub.deploy?.database?.password_set && (
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={meta.clear_db_password}
                  onChange={(e) =>
                    setMeta({
                      ...meta,
                      clear_db_password: e.target.checked,
                      db_password: e.target.checked ? '' : meta.db_password,
                    })
                  }
                />
                <span>Clear stored database password</span>
              </label>
            )}
            <h3 style={{ margin: '0.75rem 0 0' }}>Remote DB TLS</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Prefer TLS for Central → hub database traffic. Use{' '}
              <code>required</code> when the remote MySQL/MariaDB host supports SSL.
              {hub.deploy?.database?.ssl_ca_set
                ? ' A CA path is currently stored.'
                : ' No CA path stored yet.'}
            </p>
            <label>
              SSL mode
              <select
                value={meta.db_ssl_mode}
                onChange={(e) => setMeta({ ...meta, db_ssl_mode: e.target.value })}
              >
                <option value="disabled">Disabled</option>
                <option value="preferred">Preferred</option>
                <option value="required">Required</option>
                <option value="verify_ca">Verify CA</option>
              </select>
            </label>
            {meta.db_ssl_mode !== 'disabled' && (
              <>
                <label>
                  SSL CA file path (on Central server)
                  <input
                    value={meta.db_ssl_ca}
                    onChange={(e) =>
                      setMeta({ ...meta, db_ssl_ca: e.target.value, clear_db_ssl_ca: false })
                    }
                    placeholder={
                      hub.deploy?.database?.ssl_ca_set
                        ? 'Leave blank to keep current CA path'
                        : '/path/to/ca.pem'
                    }
                    autoComplete="off"
                  />
                </label>
                {hub.deploy?.database?.ssl_ca_set && (
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={meta.clear_db_ssl_ca}
                      onChange={(e) =>
                        setMeta({
                          ...meta,
                          clear_db_ssl_ca: e.target.checked,
                          db_ssl_ca: e.target.checked ? '' : meta.db_ssl_ca,
                        })
                      }
                    />
                    <span>Clear stored SSL CA path</span>
                  </label>
                )}
              </>
            )}
          </>
        )}

        <div className="actions">
          <button className="btn primary" disabled={savingMeta}>
            {savingMeta ? 'Saving...' : 'Save deploy wiring'}
          </button>
        </div>
        <HubDeployChecklist deploy={buildDeployPreview(hub, meta)} slug={hub.slug} />
      </form>

      <HubBackupPanel hubId={hubId} hubName={hub.name} />
    </section>
  )
}
