import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaDownload, FaSearch, FaUserSlash } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
import { useHub } from '../context/HubContext'

function formatRetention(policy) {
  if (!policy) return []
  const rows = [
    ['Activity logs', policy.activity_logs_days, 'days'],
    ['Login OTP tokens', policy.login_otp_hours, 'hours'],
    ['Email verification tokens', policy.email_verification_days, 'days'],
    ['Password reset tokens', policy.password_reset_days, 'days'],
    ['Sessions', policy.sessions_days, 'days'],
    ['Advisor import files', policy.advisor_import_files_days, 'days'],
    ['Closed support tickets', policy.closed_support_tickets_days, 'days'],
  ]
  return rows.map(([label, value, unit]) => ({
    label,
    text: !value ? 'Disabled' : `${value} ${unit}`,
  }))
}

const EMPTY_INCIDENT = {
  title: '',
  summary: '',
  severity: 'medium',
  status: 'investigating',
  ico_notified: false,
  individuals_notified: false,
  actions_taken: '',
}

export default function AdminGdpr() {
  const { can, loading: hubLoading, actingHub, isActingRemotely, roleLabel } = useHub()
  const enabled = can('dashboard_manage_gdpr')

  const [q, setQ] = useState('')
  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState({ total: 0 })
  const [hubMeta, setHubMeta] = useState(null)
  const [retention, setRetention] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [runbook, setRunbook] = useState(null)
  const [incidentForm, setIncidentForm] = useState(EMPTY_INCIDENT)
  const [loading, setLoading] = useState(true)
  const [savingIncident, setSavingIncident] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [exportingId, setExportingId] = useState(null)
  const [erasingId, setErasingId] = useState(null)

  const targetName = isActingRemotely
    ? actingHub?.name || hubMeta?.name || 'selected hub'
    : hubMeta?.name || 'this hub'

  const retentionRows = useMemo(() => formatRetention(retention?.policy), [retention])

  const load = useCallback(async (search = q) => {
    setLoading(true)
    setError('')
    try {
      const [data, ret, inc] = await Promise.all([
        api.gdprUsers({
          q: search || undefined,
          per_page: 50,
          page: 1,
        }),
        api.gdprRetention().catch(() => null),
        api.gdprIncidents({ per_page: 20 }).catch(() => null),
      ])
      setUsers(data.users || [])
      setMeta(data.meta || { total: 0 })
      setHubMeta(data.hub || null)
      if (ret) setRetention(ret)
      if (inc) {
        setIncidents(inc.incidents || [])
        setRunbook(inc.runbook || null)
      }
    } catch (err) {
      setError(err.message || 'Failed to load GDPR tools.')
      setUsers([])
      setMeta({ total: 0 })
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    if (hubLoading) return
    if (!enabled) {
      setLoading(false)
      return
    }
    load('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, enabled, actingHub?.id, isActingRemotely])

  const onSearch = (e) => {
    e.preventDefault()
    load(q)
  }

  const onExport = async (user) => {
    if (!user?.id) return
    setExportingId(user.id)
    setError('')
    setMessage('')
    try {
      await api.gdprExportUser(user.id)
      setMessage(`Downloaded subject-access export for ${user.email || user.name}.`)
    } catch (err) {
      setError(err.message || 'Export failed.')
    } finally {
      setExportingId(null)
    }
  }

  const onErase = async (user) => {
    if (!user?.id || user.gdpr_erased_at) return
    const typed = window.prompt(
      `UK GDPR erasure anonymises ${user.name} (${user.email}).\n\n` +
        'Audit events are kept with anonymised identity. Historical backups may still contain personal data until pruned.\n\n' +
        'Type ERASE to confirm.'
    )
    if (typed !== 'ERASE') {
      setMessage('Erasure cancelled.')
      return
    }
    setErasingId(user.id)
    setError('')
    setMessage('')
    try {
      const data = await api.gdprEraseUser(user.id)
      setMessage(data.message || 'User anonymised.')
      await load(q)
    } catch (err) {
      setError(err.message || 'Erasure failed.')
    } finally {
      setErasingId(null)
    }
  }

  const onCreateIncident = async (e) => {
    e.preventDefault()
    setSavingIncident(true)
    setError('')
    setMessage('')
    try {
      const data = await api.createGdprIncident(incidentForm)
      setMessage(data.message || 'Incident logged.')
      setIncidentForm(EMPTY_INCIDENT)
      await load(q)
    } catch (err) {
      setError(err.message || 'Could not log incident.')
    } finally {
      setSavingIncident(false)
    }
  }

  const onMarkIco = async (incident) => {
    try {
      await api.updateGdprIncident(incident.id, {
        ico_notified: true,
        status: incident.status === 'open' ? 'investigating' : incident.status,
      })
      setMessage('Marked ICO notified.')
      await load(q)
    } catch (err) {
      setError(err.message || 'Update failed.')
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        filterValue: (row) => row.name || '',
        render: (row) => (
          <span>
            {row.name || '—'}
            {row.gdpr_erased_at ? (
              <span className="muted" style={{ marginLeft: 8 }}>
                (erased)
              </span>
            ) : null}
          </span>
        ),
      },
      {
        key: 'email',
        label: 'Email',
        filterValue: (row) => row.email || '',
        render: (row) => row.email || '—',
      },
      {
        key: 'role',
        label: 'Role',
        filterValue: (row) => roleLabel?.(row.role) || row.role || '',
        render: (row) => roleLabel?.(row.role) || row.role || '—',
      },
      {
        key: 'firm',
        label: 'Firm',
        filterValue: (row) => row.firm?.name || '',
        render: (row) => row.firm?.name || '—',
      },
    ],
    [roleLabel]
  )

  if (hubLoading) {
    return (
      <div className="admin-page">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  if (!enabled) {
    return (
      <div className="admin-page">
        <p className="muted">You do not have permission to manage GDPR data requests.</p>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>GDPR / data requests</h1>
          <p className="muted">
            Search users on <strong>{targetName}</strong>. Export or erase personal data, review
            retention, and log personal-data incidents. Aim to fulfil SARs within 30 days.
          </p>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {retentionRows.length > 0 && (
        <div className="panel" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Retention policy</h2>
          <p className="muted" style={{ marginBottom: '0.75rem' }}>
            Automatic daily prune at {retention?.schedule?.time || '02:30'} via{' '}
            <code>gdpr:prune-retention</code>. Compliance audit trails and hub backups are not
            pruned by this job.
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {retentionRows.map((row) => (
              <li key={row.label}>
                {row.label}: <strong>{row.text}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 style={{ fontSize: '1.1rem' }}>Subject access / erasure</h2>
      <form onSubmit={onSearch} className="stack-form" style={{ marginBottom: '1rem', maxWidth: 480 }}>
        <label className="admin-field">
          <span className="field-label-text">Search name or email</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. jane@firm.com"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn primary" disabled={loading}>
              <FaSearch style={{ marginRight: 6 }} />
              Search
            </button>
          </div>
        </label>
      </form>

      <DataGrid
        columns={columns}
        rows={users}
        loading={loading}
        getRowKey={(row) => row.id}
        emptyMessage="No users found."
        actions={(user) => (
          <>
            <DataGridIconBtn
              icon={FaDownload}
              label={exportingId === user.id ? 'Exporting…' : 'Download GDPR JSON export'}
              disabled={exportingId === user.id || erasingId === user.id}
              onClick={() => onExport(user)}
            />
            <DataGridIconBtn
              icon={FaUserSlash}
              label={
                user.gdpr_erased_at
                  ? 'Already erased'
                  : erasingId === user.id
                    ? 'Erasing…'
                    : 'Erase / anonymise (UK GDPR)'
              }
              variant="danger"
              disabled={Boolean(user.gdpr_erased_at) || erasingId === user.id || exportingId === user.id}
              onClick={() => onErase(user)}
            />
          </>
        )}
      />

      <p className="muted" style={{ marginTop: '0.75rem', marginBottom: '2rem' }}>
        Showing {users.length} of {meta.total || 0} user(s).
      </p>

      <h2 style={{ fontSize: '1.1rem' }}>Breach / incident log</h2>
      {runbook && (
        <div className="panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <p className="muted" style={{ marginTop: 0 }}>
            Quick runbook (ICO ≤72h when notification is required):
          </p>
          <ol style={{ margin: '0 0 0.75rem', paddingLeft: '1.25rem' }}>
            {(runbook.steps || []).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="muted" style={{ marginBottom: 0 }}>
            {runbook.sar_owners}{' '}
            {runbook.ico_url ? (
              <a href={runbook.ico_url} target="_blank" rel="noopener noreferrer">
                ICO breach reporting
              </a>
            ) : null}
          </p>
        </div>
      )}

      <form onSubmit={onCreateIncident} className="stack-form panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Log a new incident</h3>
        <label className="admin-field">
          <span className="field-label-text">Title</span>
          <input
            required
            value={incidentForm.title}
            onChange={(e) => setIncidentForm((f) => ({ ...f, title: e.target.value }))}
          />
        </label>
        <label className="admin-field">
          <span className="field-label-text">Summary</span>
          <textarea
            required
            rows={3}
            value={incidentForm.summary}
            onChange={(e) => setIncidentForm((f) => ({ ...f, summary: e.target.value }))}
          />
        </label>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label className="admin-field">
            <span className="field-label-text">Severity</span>
            <select
              value={incidentForm.severity}
              onChange={(e) => setIncidentForm((f) => ({ ...f, severity: e.target.value }))}
            >
              <option value="unknown">Unknown</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <label className="admin-field">
            <span className="field-label-text">Status</span>
            <select
              value={incidentForm.status}
              onChange={(e) => setIncidentForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="contained">Contained</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>
        <label className="admin-field">
          <span className="field-label-text">Actions taken</span>
          <textarea
            rows={2}
            value={incidentForm.actions_taken}
            onChange={(e) => setIncidentForm((f) => ({ ...f, actions_taken: e.target.value }))}
          />
        </label>
        <button className="btn primary" disabled={savingIncident}>
          {savingIncident ? 'Saving…' : 'Log incident'}
        </button>
      </form>

      {incidents.length === 0 ? (
        <p className="muted">No incidents logged yet.</p>
      ) : (
        <div className="panel" style={{ padding: '1rem' }}>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {incidents.map((inc) => (
              <li key={inc.id} style={{ marginBottom: '0.85rem' }}>
                <strong>{inc.title}</strong>{' '}
                <span className="muted">
                  ({inc.severity} · {inc.status}
                  {inc.ico_notified ? ' · ICO notified' : ''})
                </span>
                <div className="muted">{inc.summary}</div>
                {!inc.ico_notified && (
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ marginTop: 6 }}
                    onClick={() => onMarkIco(inc)}
                  >
                    Mark ICO notified
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
