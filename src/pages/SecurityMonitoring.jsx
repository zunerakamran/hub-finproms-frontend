/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaExclamationTriangle, FaFilter, FaSearch, FaShieldAlt } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate } from '../components/DataGrid'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatDateTime } from '../utils/dateFormat'

const TABS = [
  { id: 'events', label: 'Events', cap: 'secmon_view_events' },
  { id: 'incidents', label: 'Incidents', cap: 'secmon_view_events' },
  { id: 'report', label: 'Report', cap: 'secmon_view_report' },
  { id: 'settings', label: 'Alert settings', cap: 'secmon_manage_alerts' },
]

function severityClass(severity) {
  const s = String(severity || '').toLowerCase()
  if (s === 'critical' || s === 'high') return 'gc-status gc-status--reject'
  if (s === 'medium') return 'gc-status gc-status--awf'
  if (s === 'low') return 'gc-status gc-status--pending'
  return 'gc-status'
}

function statusClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'resolved' || s === 'closed' || s === 'false_positive') return 'gc-status gc-status--ok'
  if (s === 'investigating' || s === 'acknowledged') return 'gc-status gc-status--awf'
  return 'gc-status gc-status--pending'
}

function Badge({ children, className }) {
  return <span className={className}>{children}</span>
}

export default function SecurityMonitoring() {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHubId } = useHub()
  const asPowerAdmin = isPowerAdmin
  const moduleOn = can('security_monitoring')
  const canViewEvents = can('secmon_view_events')
  const canViewReport = can('secmon_view_report')
  const canManageIncidents = can('secmon_manage_incidents')
  const canManageAlerts = can('secmon_manage_alerts')
  const enabled = moduleOn && (canViewEvents || canViewReport || canManageAlerts)

  const availableTabs = useMemo(
    () =>
      TABS.filter((tab) => {
        if (!moduleOn) return false
        if (tab.id === 'events' || tab.id === 'incidents') return canViewEvents
        if (tab.id === 'report') return canViewReport
        if (tab.id === 'settings') return canManageAlerts
        return false
      }),
    [moduleOn, canViewEvents, canViewReport, canManageAlerts]
  )

  const [tab, setTab] = useState('events')
  const [options, setOptions] = useState(null)
  const [events, setEvents] = useState([])
  const [incidents, setIncidents] = useState([])
  const [report, setReport] = useState(null)
  const [settings, setSettings] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    q: '',
    severity: '',
    category: '',
    status: '',
    from: '',
    to: '',
  })
  const [declareForm, setDeclareForm] = useState({
    title: '',
    description: '',
    severity: 'medium',
    category: 'manual',
  })
  const [incidentNote, setIncidentNote] = useState('')
  const [incidentStatus, setIncidentStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanMessage, setScanMessage] = useState('')

  useEffect(() => {
    if (availableTabs.length && !availableTabs.some((t) => t.id === tab)) {
      setTab(availableTabs[0].id)
    }
  }, [availableTabs, tab])

  const load = useCallback(async () => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const opts = await api.securityMonitoringOptions({ asPowerAdmin })
      setOptions(opts)

      if (tab === 'events' && canViewEvents) {
        const data = await api.securityMonitoringEvents(
          {
            per_page: 50,
            q: filters.q || undefined,
            severity: filters.severity || undefined,
            category: filters.category || undefined,
            status: filters.status || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
          },
          { asPowerAdmin }
        )
        setEvents(data.data || [])
      }

      if (tab === 'incidents' && canViewEvents) {
        const data = await api.securityMonitoringIncidents(
          {
            per_page: 50,
            q: filters.q || undefined,
            severity: filters.severity || undefined,
            category: filters.category || undefined,
            status: filters.status || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
          },
          { asPowerAdmin }
        )
        setIncidents(data.data || [])
      }

      if (tab === 'report' && canViewReport) {
        const data = await api.securityMonitoringReport(
          { from: filters.from || undefined, to: filters.to || undefined },
          { asPowerAdmin }
        )
        setReport(data.report || null)
      }

      if (tab === 'settings' && canManageAlerts) {
        const data = await api.securityMonitoringAlertSettings({ asPowerAdmin })
        setSettings(data.data || null)
      }
    } catch (err) {
      setError(err.message || 'Failed to load security monitoring.')
    } finally {
      setLoading(false)
    }
  }, [
    hubLoading,
    enabled,
    tab,
    filters,
    asPowerAdmin,
    canViewEvents,
    canViewReport,
    canManageAlerts,
    actingHubId,
  ])

  useEffect(() => {
    load()
  }, [load])

  const openEvent = async (id) => {
    try {
      const data = await api.securityMonitoringEvent(id, { asPowerAdmin })
      setSelectedEvent(data.data)
      setSelectedIncident(null)
    } catch (err) {
      setError(err.message || 'Failed to load event.')
    }
  }

  const openIncident = async (id) => {
    try {
      const data = await api.securityMonitoringIncident(id, { asPowerAdmin })
      setSelectedIncident(data.data)
      setIncidentStatus(data.data?.status || '')
      setIncidentNote('')
      setSelectedEvent(null)
    } catch (err) {
      setError(err.message || 'Failed to load incident.')
    }
  }

  const declareIncident = async (e) => {
    e.preventDefault()
    if (!canManageIncidents) return
    setSaving(true)
    setError('')
    try {
      const data = await api.securityMonitoringDeclareIncident(declareForm, { asPowerAdmin })
      setDeclareForm({ title: '', description: '', severity: 'medium', category: 'manual' })
      setTab('incidents')
      await openIncident(data.data.id)
      await load()
    } catch (err) {
      setError(err.message || 'Failed to declare incident.')
    } finally {
      setSaving(false)
    }
  }

  const updateIncident = async (e) => {
    e.preventDefault()
    if (!canManageIncidents || !selectedIncident) return
    setSaving(true)
    setError('')
    try {
      const data = await api.securityMonitoringUpdateIncident(
        selectedIncident.id,
        {
          status: incidentStatus || undefined,
          note: incidentNote || undefined,
        },
        { asPowerAdmin }
      )
      setSelectedIncident(data.data)
      setIncidentNote('')
      await load()
    } catch (err) {
      setError(err.message || 'Failed to update incident.')
    } finally {
      setSaving(false)
    }
  }

  const monitorNow = async () => {
    if (!canViewReport && !canManageAlerts) return
    setScanning(true)
    setScanMessage('')
    setError('')
    try {
      const data = await api.securityMonitoringScanNow({ asPowerAdmin })
      if (data.report) setReport(data.report)
      setScanMessage(
        data.data?.summary ||
          `Scan finished: ${data.data?.status || 'done'} at ${formatDateTime(data.data?.scanned_at)}`
      )
      if (tab !== 'report') setTab('report')
    } catch (err) {
      setError(err.message || 'Failed to run security check now.')
    } finally {
      setScanning(false)
    }
  }

  const saveSettings = async (e) => {
    e.preventDefault()
    if (!canManageAlerts || !settings) return
    setSaving(true)
    setError('')
    try {
      const data = await api.securityMonitoringUpdateAlertSettings(
        {
          alert_min_severity: settings.alert_min_severity,
          alert_email_enabled: !!settings.alert_email_enabled,
          alert_emails: Array.isArray(settings.alert_emails)
            ? settings.alert_emails
            : String(settings.alert_emails || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
          failed_login_threshold: Number(settings.failed_login_threshold) || 5,
          failed_login_window_minutes: Number(settings.failed_login_window_minutes) || 15,
        },
        { asPowerAdmin }
      )
      setSettings(data.data)
    } catch (err) {
      setError(err.message || 'Failed to save alert settings.')
    } finally {
      setSaving(false)
    }
  }

  if (hubLoading) {
    return <p className="muted">Loading…</p>
  }

  if (!enabled) {
    return (
      <div className="panel">
        <h1>
          <FaShieldAlt /> Security monitoring
        </h1>
        <p className="muted">
          Security Monitoring is not enabled for this hub, or your role does not have access.
          Power Admin can turn on Functionalities → Security Monitoring and grant `secmon_*`
          capabilities.
        </p>
      </div>
    )
  }

  const eventColumns = [
    {
      key: 'occurred',
      label: 'When',
      date: true,
      render: (row) => <DataGridDate value={row.occurred_at} />,
      filterValue: (row) => formatDateTime(row.occurred_at, ''),
      sortValue: (row) => (row.occurred_at ? new Date(row.occurred_at).getTime() : 0),
    },
    {
      key: 'severity',
      label: 'Severity',
      fit: true,
      render: (row) => <Badge className={severityClass(row.severity)}>{row.severity}</Badge>,
      filterValue: (row) => row.severity || '',
    },
    {
      key: 'title',
      label: 'What happened',
      render: (row) => (
        <button type="button" className="linkish" onClick={() => openEvent(row.id)}>
          {row.title}
        </button>
      ),
      filterValue: (row) => row.title || '',
    },
    {
      key: 'category',
      label: 'Category',
      fit: true,
      render: (row) => row.category_label || row.category,
      filterValue: (row) => row.category_label || row.category || '',
    },
    {
      key: 'ip',
      label: 'Source IP',
      fit: true,
      render: (row) => row.source_ip || '—',
      filterValue: (row) => row.source_ip || '',
    },
    {
      key: 'status',
      label: 'Status',
      fit: true,
      render: (row) => <Badge className={statusClass(row.status)}>{row.status}</Badge>,
      filterValue: (row) => row.status || '',
    },
  ]

  const incidentColumns = [
    {
      key: 'created',
      label: 'Opened',
      date: true,
      render: (row) => <DataGridDate value={row.created_at} />,
      filterValue: (row) => formatDateTime(row.created_at, ''),
      sortValue: (row) => (row.created_at ? new Date(row.created_at).getTime() : 0),
    },
    {
      key: 'severity',
      label: 'Severity',
      fit: true,
      render: (row) => <Badge className={severityClass(row.severity)}>{row.severity}</Badge>,
      filterValue: (row) => row.severity || '',
    },
    {
      key: 'title',
      label: 'Incident',
      render: (row) => (
        <button type="button" className="linkish" onClick={() => openIncident(row.id)}>
          {row.title}
        </button>
      ),
      filterValue: (row) => row.title || '',
    },
    {
      key: 'status',
      label: 'Status',
      fit: true,
      render: (row) => <Badge className={statusClass(row.status)}>{row.status}</Badge>,
      filterValue: (row) => row.status || '',
    },
    {
      key: 'events',
      label: 'Events',
      narrow: true,
      render: (row) => row.events_count ?? '—',
      filterValue: (row) => String(row.events_count ?? ''),
    },
  ]

  return (
    <div className="panel">
      <div className="panel-header">
        <h1>
          <FaShieldAlt /> Security monitoring
        </h1>
        <p className="muted">
          Security events are recorded continuously. Open this page anytime to review when something
          happened, what happened, and its status. Use <strong>Monitor now</strong> for an on-demand
          dependency check (no daily schedule).
        </p>
        {(canViewReport || canManageAlerts) && (
          <button type="button" className="btn primary" onClick={monitorNow} disabled={scanning}>
            <FaShieldAlt /> {scanning ? 'Monitoring…' : 'Monitor now'}
          </button>
        )}
        {scanMessage ? <p className="muted">{scanMessage}</p> : null}
      </div>

      <div className="tabs" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {availableTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'btn primary' : 'btn ghost'}
            onClick={() => {
              setTab(t.id)
              setSelectedEvent(null)
              setSelectedIncident(null)
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'events' || tab === 'incidents' || tab === 'report') && (
        <div className="filters-bar" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <label>
            <FaSearch />{' '}
            <input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Search"
            />
          </label>
          <label>
            Severity{' '}
            <select
              value={filters.severity}
              onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}
            >
              <option value="">All</option>
              {(options?.severities || []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category{' '}
            <select
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="">All</option>
              {(options?.categories || []).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            From{' '}
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </label>
          <label>
            To{' '}
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </label>
          <button type="button" className="btn ghost" onClick={load}>
            <FaFilter /> Apply
          </button>
        </div>
      )}

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="muted">Loading…</p> : null}

      {!loading && tab === 'events' && (
        <>
          {events.length === 0 ? (
            <p className="muted">No open high/critical issues in this filter — no security events yet.</p>
          ) : (
            <DataGrid columns={eventColumns} rows={events} rowKey={(r) => r.id} />
          )}
        </>
      )}

      {!loading && tab === 'incidents' && (
        <>
          {canManageIncidents && (
            <form className="stack" onSubmit={declareIncident} style={{ marginBottom: '1.5rem' }}>
              <h2>Declare incident</h2>
              <input
                required
                placeholder="Title"
                value={declareForm.title}
                onChange={(e) => setDeclareForm((f) => ({ ...f, title: e.target.value }))}
              />
              <textarea
                placeholder="What happened?"
                rows={3}
                value={declareForm.description}
                onChange={(e) => setDeclareForm((f) => ({ ...f, description: e.target.value }))}
              />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select
                  value={declareForm.severity}
                  onChange={(e) => setDeclareForm((f) => ({ ...f, severity: e.target.value }))}
                >
                  {(options?.severities || ['medium']).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={declareForm.category}
                  onChange={(e) => setDeclareForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {(options?.categories || []).map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn primary" disabled={saving}>
                  Declare
                </button>
              </div>
            </form>
          )}
          {incidents.length === 0 ? (
            <p className="muted">No security incidents yet.</p>
          ) : (
            <DataGrid columns={incidentColumns} rows={incidents} rowKey={(r) => r.id} />
          )}
        </>
      )}

      {!loading && tab === 'report' && report && (
        <div className="stack">
          <div className="stat-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="card">
              <strong>{report.totals?.events ?? 0}</strong>
              <div className="muted">Events</div>
            </div>
            <div className="card">
              <strong>{report.totals?.open_high_critical_incidents ?? 0}</strong>
              <div className="muted">Open high/critical incidents</div>
            </div>
            <div className="card">
              <strong>{report.dependency_scan?.status || 'unknown'}</strong>
              <div className="muted">
                Last dependency scan
                {report.dependency_scan?.overdue ? ' (overdue)' : ''}
              </div>
              <div className="muted small">{report.dependency_scan?.last_at ? formatDateTime(report.dependency_scan.last_at) : 'Never'}</div>
            </div>
          </div>
          {report.dependency_scan?.summary ? (
            <p>
              <FaExclamationTriangle /> {report.dependency_scan.summary}
            </p>
          ) : null}
          <h3>By severity</h3>
          <ul>
            {Object.entries(report.by_severity || {}).map(([k, v]) => (
              <li key={k}>
                <Badge className={severityClass(k)}>{k}</Badge> — {v}
              </li>
            ))}
          </ul>
          <h3>By category</h3>
          <ul>
            {Object.entries(report.by_category || {}).map(([k, v]) => (
              <li key={k}>
                {k}: {v}
              </li>
            ))}
          </ul>
          <h3>Top source IPs</h3>
          <ul>
            {(report.top_source_ips || []).map((row) => (
              <li key={row.source_ip}>
                {row.source_ip}: {row.total}
              </li>
            ))}
          </ul>
          <p className="muted small">Generated {formatDateTime(report.generated_at)}</p>
        </div>
      )}

      {!loading && tab === 'settings' && settings && (
        <form className="stack" onSubmit={saveSettings}>
          <label>
            Alert minimum severity
            <select
              value={settings.alert_min_severity || 'high'}
              onChange={(e) => setSettings((s) => ({ ...s, alert_min_severity: e.target.value }))}
            >
              {(options?.severities || []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={!!settings.alert_email_enabled}
              onChange={(e) => setSettings((s) => ({ ...s, alert_email_enabled: e.target.checked }))}
            />{' '}
            Email alerts enabled
          </label>
          <label>
            Alert emails (comma-separated)
            <input
              value={Array.isArray(settings.alert_emails) ? settings.alert_emails.join(', ') : settings.alert_emails || ''}
              onChange={(e) => setSettings((s) => ({ ...s, alert_emails: e.target.value }))}
            />
          </label>
          <label>
            Failed login threshold
            <input
              type="number"
              min={2}
              max={100}
              value={settings.failed_login_threshold ?? 5}
              onChange={(e) => setSettings((s) => ({ ...s, failed_login_threshold: e.target.value }))}
            />
          </label>
          <label>
            Failed login window (minutes)
            <input
              type="number"
              min={1}
              max={1440}
              value={settings.failed_login_window_minutes ?? 15}
              onChange={(e) =>
                setSettings((s) => ({ ...s, failed_login_window_minutes: e.target.value }))
              }
            />
          </label>
          <button type="submit" className="btn primary" disabled={saving}>
            Save settings
          </button>
        </form>
      )}

      {selectedEvent && (
        <div className="panel" style={{ marginTop: '1.5rem' }}>
          <h2>Event detail</h2>
          <p>
            <Badge className={severityClass(selectedEvent.severity)}>{selectedEvent.severity}</Badge>{' '}
            <Badge className={statusClass(selectedEvent.status)}>{selectedEvent.status}</Badge>
          </p>
          <p>
            <strong>When:</strong> {formatDateTime(selectedEvent.occurred_at)}
          </p>
          <p>
            <strong>What:</strong> {selectedEvent.description}
          </p>
          <p>
            <strong>Type:</strong> {selectedEvent.event_type}
          </p>
          <p>
            <strong>Source IP:</strong> {selectedEvent.source_ip || '—'}
          </p>
          <p>
            <strong>Actor:</strong>{' '}
            {selectedEvent.actor?.email || selectedEvent.actor?.name || 'anonymous / unknown'}
          </p>
          <button type="button" className="btn ghost" onClick={() => setSelectedEvent(null)}>
            Close
          </button>
        </div>
      )}

      {selectedIncident && (
        <div className="panel" style={{ marginTop: '1.5rem' }}>
          <h2>Incident #{selectedIncident.id}</h2>
          <p>
            <Badge className={severityClass(selectedIncident.severity)}>{selectedIncident.severity}</Badge>{' '}
            <Badge className={statusClass(selectedIncident.status)}>{selectedIncident.status}</Badge>
          </p>
          <p>
            <strong>Opened:</strong> {formatDateTime(selectedIncident.created_at)}
          </p>
          <p>
            <strong>What:</strong> {selectedIncident.description || selectedIncident.title}
          </p>
          {(selectedIncident.investigation_notes || []).length > 0 && (
            <>
              <h3>Investigation notes</h3>
              <ul>
                {selectedIncident.investigation_notes.map((n) => (
                  <li key={n.id}>
                    <strong>{n.author_name || 'User'}</strong> ({formatDateTime(n.created_at)}):{' '}
                    {n.body}
                  </li>
                ))}
              </ul>
            </>
          )}
          {canManageIncidents && (
            <form className="stack" onSubmit={updateIncident}>
              <label>
                Status
                <select value={incidentStatus} onChange={(e) => setIncidentStatus(e.target.value)}>
                  {(options?.statuses || []).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <textarea
                rows={3}
                placeholder="Add investigation note"
                value={incidentNote}
                onChange={(e) => setIncidentNote(e.target.value)}
              />
              <button type="submit" className="btn primary" disabled={saving}>
                Update incident
              </button>
            </form>
          )}
          <button type="button" className="btn ghost" onClick={() => setSelectedIncident(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  )
}
