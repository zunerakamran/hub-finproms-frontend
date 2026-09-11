import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import ChecklistGroupedForm from '../components/ChecklistGroupedForm'
import HubDeployChecklist from '../components/HubDeployChecklist'
import { checklistToMap } from '../utils/checklist'
import { buildDeployPreview } from '../utils/hubDeploy'

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
  const credits = hub?.subscriber_credits || {}

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
        frontend_url: meta.frontend_url.trim() || null,
        api_url: meta.api_url.trim() || null,
        deploy_notes: meta.deploy_notes.trim() || null,
        db_driver: meta.db_driver.trim() || 'mysql',
        db_host: meta.db_host.trim() || null,
        db_port: meta.db_port.trim() ? Number(meta.db_port.trim()) : null,
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
      if (hub?.type !== 'shared') {
        payload.slug = meta.slug.trim()
      }
      const data = await api.updatePowerAdminHub(hubId, payload)
      setHub(data.hub)
      setFlags(checklistToMap(data.hub.checklist))
      setMeta((prev) => ({
        ...prev,
        db_password: '',
        clear_db_password: false,
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
          <p className="eyebrow">Power Admin</p>
          <h1>{hub.name}</h1>
          <p className="muted">
            Update branding, deploy wiring, and Functionalities for this{' '}
            {hub.type === 'shared' ? 'shared' : 'white-labelled'} hub.
          </p>
          {hub.deploy?.status_label && (
            <p style={{ marginTop: '0.5rem' }}>
              <span className={`badge ${hub.deploy.ready ? 'ok' : 'warn'}`}>
                {hub.deploy.status_label}
              </span>
            </p>
          )}
        </div>
        <Link to="/my-dashboard/hubs" className="btn ghost">
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

      <form className="admin-form hub-meta-form" style={{ marginTop: '1.25rem' }} onSubmit={onSaveMeta}>
        <h2>Deploy wiring</h2>
        <p className="muted">
          Record where this hub is hosted and the credentials for its own database. Shared uses
          these credentials later to push content into that white-label DB.
        </p>
        <label>
          Frontend URL
          <input
            type="url"
            value={meta.frontend_url}
            onChange={(e) => setMeta({ ...meta, frontend_url: e.target.value })}
            placeholder="https://acme.example.com"
          />
        </label>
        <label>
          API URL (optional)
          <input
            type="url"
            value={meta.api_url}
            onChange={(e) => setMeta({ ...meta, api_url: e.target.value })}
            placeholder="https://api.acme.example.com"
          />
        </label>
        <label>
          Deploy notes
          <textarea
            rows={4}
            value={meta.deploy_notes}
            onChange={(e) => setMeta({ ...meta, deploy_notes: e.target.value })}
            placeholder="Hosting provider, env checklist, contact, etc."
          />
        </label>

        {hub.type !== 'shared' && (
          <>
            <h3 style={{ margin: '0.75rem 0 0' }}>White-label database (own DB)</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Password is stored encrypted and never shown again. Leave password blank to keep the
              current value.
              {hub.deploy?.database?.password_set ? ' Password is currently set.' : ' No password set yet.'}
            </p>
            <div className="form-row two">
              <label>
                Driver
                <select
                  value={meta.db_driver}
                  onChange={(e) => setMeta({ ...meta, db_driver: e.target.value })}
                >
                  <option value="mysql">mysql</option>
                  <option value="pgsql">pgsql</option>
                  <option value="sqlsrv">sqlsrv</option>
                </select>
              </label>
              <label>
                Port
                <input
                  value={meta.db_port}
                  onChange={(e) => setMeta({ ...meta, db_port: e.target.value })}
                  placeholder="3306"
                />
              </label>
            </div>
            <label>
              Host
              <input
                value={meta.db_host}
                onChange={(e) => setMeta({ ...meta, db_host: e.target.value })}
                placeholder="db.acme.example.com"
                autoComplete="off"
              />
            </label>
            <label>
              Database name
              <input
                value={meta.db_database}
                onChange={(e) => setMeta({ ...meta, db_database: e.target.value })}
                placeholder="hub_acme"
                autoComplete="off"
              />
            </label>
            <div className="form-row two">
              <label>
                Username
                <input
                  value={meta.db_username}
                  onChange={(e) => setMeta({ ...meta, db_username: e.target.value })}
                  placeholder="hub_user"
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
                  placeholder={hub.deploy?.database?.password_set ? '•••••••• (unchanged)' : '••••••••'}
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
          </>
        )}

        <div className="actions">
          <button className="btn primary" disabled={savingMeta}>
            {savingMeta ? 'Saving...' : 'Save deploy wiring'}
          </button>
        </div>
        <HubDeployChecklist deploy={buildDeployPreview(hub, meta)} slug={hub.slug} />
      </form>

      <div className="admin-form" style={{ marginTop: '1.25rem' }}>
        <h2>Subscriber credits</h2>
        <p className="muted">
          Current allotment:{' '}
          <strong>
            {credits.unlimited !== false
              ? 'Unlimited'
              : `${credits.credits ?? 0} credits / subscriber / period`}
          </strong>
          . Set this from the Power Admin dashboard (gated by Capabilities).
        </p>
        <div className="actions">
          <Link className="btn primary" to={`/my-dashboard/subscriber-credits?hub=${hub.id}`}>
            Manage subscriber credits
          </Link>
        </div>
      </div>

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
