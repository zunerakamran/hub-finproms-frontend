/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FaBolt,
  FaExclamationTriangle,
  FaShieldAlt,
  FaSync,
  FaTimes,
} from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
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
  if (s === 'critical' || s === 'high') return 'gc-status gc-status--bad'
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

function scanAlertClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'pass' || s === 'ok' || s === 'success') return 'alert success secmon-alert'
  if (s === 'fail' || s === 'error') return 'alert secmon-alert'
  // unavailable / unknown / overdue → amber (not red)
  return 'alert secmon-alert secmon-alert--warn'
}

function scanSummaryCardClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'pass' || s === 'ok' || s === 'success') return 'secmon-card secmon-card--ok'
  if (s === 'fail' || s === 'error') return 'secmon-card secmon-card--danger'
  return 'secmon-card secmon-card--warn'
}

function Badge({ children, className }) {
  return <span className={className}>{children}</span>
}

function StatCard({ label, value, hint }) {
  return (
    <article className="secmon-stat">
      <p className="secmon-stat__value">{value ?? 0}</p>
      <p className="secmon-stat__label">{label}</p>
      {hint ? <p className="secmon-stat__hint">{hint}</p> : null}
    </article>
  )
}

function DetailDrawer({ title, onClose, children }) {
  return (
    <aside className="secmon-drawer" role="dialog" aria-label={title}>
      <div className="secmon-drawer__head">
        <h2>{title}</h2>
        <DataGridIconBtn icon={FaTimes} label="Close" onClick={onClose} />
      </div>
      <div className="secmon-drawer__body">{children}</div>
    </aside>
  )
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
  const canManageDisasterRecovery = can('secmon_manage_disaster_recovery')
  const enabled =
    moduleOn &&
    (canViewEvents || canViewReport || canManageAlerts || canManageDisasterRecovery)

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
  const [disasterSnapshots, setDisasterSnapshots] = useState([])
  const [rollbackSnapshotId, setRollbackSnapshotId] = useState('')
  const [recognizeModule, setRecognizeModule] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drMessage, setDrMessage] = useState('')
  const [filters, setFilters] = useState({
    q: '',
    severity: '',
    category: '',
    status: '',
    from: '',
    to: '',
  })
  const [applied, setApplied] = useState({
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
    affected_module: '',
    recognize_disaster: false,
  })
  const [incidentNote, setIncidentNote] = useState('')
  const [incidentStatus, setIncidentStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanMessage, setScanMessage] = useState('')
  const [scanStatus, setScanStatus] = useState('')

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
      // Options require secmon_view_events — skip when the user only has manage caps.
      if (canViewEvents || canViewReport) {
        try {
          const opts = await api.securityMonitoringOptions({ asPowerAdmin })
          setOptions(opts)
        } catch {
          // Access-only users may still use the access tab without options.
        }
      }

      const filterParams = {
        per_page: 50,
        q: applied.q || undefined,
        severity: applied.severity || undefined,
        category: applied.category || undefined,
        status: applied.status || undefined,
        from: applied.from || undefined,
        to: applied.to || undefined,
      }

      if (tab === 'events' && canViewEvents) {
        const data = await api.securityMonitoringEvents(filterParams, { asPowerAdmin })
        setEvents(data.data || [])
      }

      if (tab === 'incidents' && canViewEvents) {
        const data = await api.securityMonitoringIncidents(filterParams, { asPowerAdmin })
        setIncidents(data.data || [])
      }

      if (tab === 'report' && canViewReport) {
        const data = await api.securityMonitoringReport(
          { from: applied.from || undefined, to: applied.to || undefined },
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
    applied,
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

  const loadDisasterSnapshots = async (moduleKey) => {
    if (!canManageDisasterRecovery || !moduleKey) {
      setDisasterSnapshots([])
      return
    }
    try {
      const data = await api.securityMonitoringDisasterSnapshots(
        { module: moduleKey, limit: 40 },
        { asPowerAdmin }
      )
      const rows = Array.isArray(data.data) ? data.data : []
      setDisasterSnapshots(rows)
      const preferred = rows.find((s) => s.trigger !== 'pre_rollback') || rows[0]
      setRollbackSnapshotId(preferred ? String(preferred.id) : '')
    } catch {
      setDisasterSnapshots([])
    }
  }

  const openIncident = async (id) => {
    try {
      const data = await api.securityMonitoringIncident(id, { asPowerAdmin })
      setSelectedIncident(data.data)
      setIncidentStatus(data.data?.status || '')
      setIncidentNote('')
      setRecognizeModule(data.data?.affected_module || '')
      setDrMessage('')
      setSelectedEvent(null)
      await loadDisasterSnapshots(data.data?.affected_module)
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
      const payload = {
        title: declareForm.title,
        description: declareForm.description || undefined,
        severity: declareForm.severity,
        category: declareForm.category,
      }
      if (declareForm.affected_module) {
        payload.affected_module = declareForm.affected_module
        payload.recognize_disaster = !!declareForm.recognize_disaster
      }
      const data = await api.securityMonitoringDeclareIncident(payload, { asPowerAdmin })
      setDeclareForm({
        title: '',
        description: '',
        severity: 'medium',
        category: 'manual',
        affected_module: '',
        recognize_disaster: false,
      })
      setTab('incidents')
      await openIncident(data.data.id)
      await load()
    } catch (err) {
      setError(err.message || 'Failed to declare incident.')
    } finally {
      setSaving(false)
    }
  }

  const recognizeDisaster = async () => {
    if (!canManageDisasterRecovery || !selectedIncident || !recognizeModule) return
    setSaving(true)
    setError('')
    setDrMessage('')
    try {
      const data = await api.securityMonitoringRecognizeDisaster(
        selectedIncident.id,
        { affected_module: recognizeModule },
        { asPowerAdmin }
      )
      setSelectedIncident(data.data)
      setDisasterSnapshots(Array.isArray(data.snapshots) ? data.snapshots : [])
      setDrMessage(data.message || 'Disaster recognized.')
      await load()
    } catch (err) {
      setError(err.message || 'Failed to recognize disaster.')
    } finally {
      setSaving(false)
    }
  }

  const createModuleSnapshot = async () => {
    if (!canManageDisasterRecovery || !selectedIncident?.affected_module) return
    setSaving(true)
    setError('')
    setDrMessage('')
    try {
      const data = await api.securityMonitoringCreateDisasterSnapshot(
        {
          module_key: selectedIncident.affected_module,
          security_incident_id: selectedIncident.id,
          label: `Manual snapshot for incident #${selectedIncident.id}`,
        },
        { asPowerAdmin }
      )
      if (data.incident) setSelectedIncident(data.incident)
      setDrMessage(data.message || 'Snapshot created.')
      await loadDisasterSnapshots(selectedIncident.affected_module)
    } catch (err) {
      setError(err.message || 'Failed to create snapshot.')
    } finally {
      setSaving(false)
    }
  }

  const rollbackDisaster = async () => {
    if (!canManageDisasterRecovery || !selectedIncident || !rollbackSnapshotId) return
    const ok = window.confirm(
      `Roll back only ${selectedIncident.affected_module_label || selectedIncident.affected_module} ` +
        `to snapshot #${rollbackSnapshotId}?\n\n` +
        "This overwrites that module's data only — not the whole hub. A safety snapshot of the current module state is taken first."
    )
    if (!ok) return
    setSaving(true)
    setError('')
    setDrMessage('')
    try {
      const data = await api.securityMonitoringRollbackDisaster(
        selectedIncident.id,
        { snapshot_id: Number(rollbackSnapshotId) },
        { asPowerAdmin }
      )
      setSelectedIncident(data.data)
      setDrMessage(data.message || 'Module rolled back.')
      await loadDisasterSnapshots(data.data?.affected_module)
      await load()
    } catch (err) {
      setError(err.message || 'Rollback failed.')
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
    setScanStatus('')
    setError('')
    try {
      const data = await api.securityMonitoringScanNow({ asPowerAdmin })
      if (data.report) setReport(data.report)
      const status = data.data?.status || 'done'
      setScanStatus(status)
      setScanMessage(data.data?.summary || `Scan finished: ${status}`)
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
      setScanStatus('pass')
      setScanMessage('Alert settings saved.')
    } catch (err) {
      setError(err.message || 'Failed to save alert settings.')
    } finally {
      setSaving(false)
    }
  }


  const applyFilters = (e) => {
    e.preventDefault()
    setApplied({ ...filters, q: filters.q.trim() })
  }

  const clearFilters = () => {
    const empty = { q: '', severity: '', category: '', status: '', from: '', to: '' }
    setFilters(empty)
    setApplied(empty)
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
        <button type="button" className="secmon-link" onClick={() => openEvent(row.id)}>
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
        <button type="button" className="secmon-link" onClick={() => openIncident(row.id)}>
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
      key: 'module',
      label: 'Module',
      render: (row) =>
        row.disaster_recognized ? (
          <span>
            <Badge className="gc-status gc-status--bad">Disaster</Badge>{' '}
            {row.affected_module_label || row.affected_module || '—'}
          </span>
        ) : (
          row.affected_module_label || row.affected_module || '—'
        ),
      filterValue: (row) => row.affected_module_label || row.affected_module || '',
    },
    {
      key: 'events',
      label: 'Events',
      narrow: true,
      render: (row) => row.events_count ?? '—',
      filterValue: (row) => String(row.events_count ?? ''),
    },
  ]

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Hub</p>
            <h1>Security monitoring</h1>
            <p className="muted">
              {!moduleOn
                ? 'Security Monitoring is off for this hub. Enable it under Functionalities.'
                : 'You do not have permission to view Security Monitoring.'}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="secmon-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Security monitoring</h1>
          <p className="muted">
            Review security events as they happen — when, what, severity, and status. Use Monitor
            now for an on-demand dependency check.
          </p>
        </div>
        <div className="actions">
          <DataGridIconBtn icon={FaSync} label="Refresh" onClick={load} disabled={loading || scanning} />
          {(canViewReport || canManageAlerts) && (
            <button type="button" className="btn primary" onClick={monitorNow} disabled={scanning}>
              <FaShieldAlt aria-hidden /> {scanning ? 'Monitoring…' : 'Monitor now'}
            </button>
          )}
        </div>
      </div>

      {scanMessage ? <div className={scanAlertClass(scanStatus)}>{scanMessage}</div> : null}
      {error ? <div className="alert">{error}</div> : null}

      <div className="tab-row" role="tablist" aria-label="Security monitoring views">
        {availableTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn ghost ${tab === t.id ? 'active' : ''}`}
            onClick={() => {
              setTab(t.id)
              setSelectedEvent(null)
              setSelectedIncident(null)
              setScanMessage('')
              setScanStatus('')
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'events' || tab === 'incidents' || tab === 'report') && (
        <form className="filters-row st-queue-filters" onSubmit={applyFilters}>
          <label className="filters-row__field">
            <span className="filters-row__label">Search</span>
            <input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Title, IP, email…"
            />
          </label>
          <label className="filters-row__field">
            <span className="filters-row__label">Severity</span>
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
          <label className="filters-row__field">
            <span className="filters-row__label">Category</span>
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
          {(tab === 'events' || tab === 'incidents') && (
            <label className="filters-row__field">
              <span className="filters-row__label">Status</span>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">All</option>
                {(tab === 'incidents' ? options?.statuses : options?.event_statuses || options?.statuses || []).map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </select>
            </label>
          )}
          <label className="filters-row__field">
            <span className="filters-row__label">From</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </label>
          <label className="filters-row__field">
            <span className="filters-row__label">To</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </label>
          <div className="filters-row__actions">
            <button type="submit" className="btn primary" disabled={loading}>
              Apply
            </button>
            <button type="button" className="btn" onClick={clearFilters} disabled={loading}>
              Clear
            </button>
          </div>
        </form>
      )}

      {tab === 'events' && (
        <DataGrid
          columns={eventColumns}
          rows={events}
          loading={loading || hubLoading}
          emptyMessage="No security events yet for this filter."
          pageSize={15}
          actions={(row) => (
            <DataGridIconBtn icon={FaBolt} label="Open" onClick={() => openEvent(row.id)} />
          )}
        />
      )}

      {tab === 'incidents' && (
        <div className="secmon-incidents">
          {canManageIncidents && (
            <form className="secmon-card" onSubmit={declareIncident}>
              <h2>Declare incident</h2>
              <p className="muted">Manually record something found outside automated detectors.</p>
              <div className="secmon-form-grid">
                <label className="filters-row__field secmon-span-2">
                  <span className="filters-row__label">Title</span>
                  <input
                    required
                    value={declareForm.title}
                    onChange={(e) => setDeclareForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Short summary"
                  />
                </label>
                <label className="filters-row__field">
                  <span className="filters-row__label">Severity</span>
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
                </label>
                <label className="filters-row__field">
                  <span className="filters-row__label">Category</span>
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
                </label>
                <label className="filters-row__field secmon-span-2">
                  <span className="filters-row__label">What happened</span>
                  <textarea
                    rows={3}
                    value={declareForm.description}
                    onChange={(e) => setDeclareForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the security issue…"
                  />
                </label>
                <label className="filters-row__field secmon-span-2">
                  <span className="filters-row__label">Affected module (for disaster recovery)</span>
                  <select
                    value={declareForm.affected_module}
                    onChange={(e) =>
                      setDeclareForm((f) => ({ ...f, affected_module: e.target.value }))
                    }
                  >
                    <option value="">None / unknown</option>
                    {(options?.recoverable_modules || []).map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                {declareForm.affected_module ? (
                  <label className="filters-row__field secmon-span-2 secmon-check">
                    <input
                      type="checkbox"
                      checked={!!declareForm.recognize_disaster}
                      onChange={(e) =>
                        setDeclareForm((f) => ({ ...f, recognize_disaster: e.target.checked }))
                      }
                    />
                    <span>
                      Recognize as module disaster now (enables snapshot / rollback for this module
                      only)
                    </span>
                  </label>
                ) : null}
              </div>
              <div className="filters-row__actions">
                <button type="submit" className="btn primary" disabled={saving}>
                  Declare incident
                </button>
              </div>
            </form>
          )}

          <DataGrid
            columns={incidentColumns}
            rows={incidents}
            loading={loading || hubLoading}
            emptyMessage="No security incidents yet."
            pageSize={15}
            actions={(row) => (
              <DataGridIconBtn icon={FaBolt} label="Open" onClick={() => openIncident(row.id)} />
            )}
          />
        </div>
      )}

      {tab === 'report' && (
        <div className="secmon-report">
          {loading ? (
            <p className="muted">Loading report…</p>
          ) : report ? (
            <>
              <div className="secmon-stat-grid">
                <StatCard label="Events" value={report.totals?.events ?? 0} />
                <StatCard
                  label="Open high / critical"
                  value={report.totals?.open_high_critical_incidents ?? 0}
                />
                <StatCard
                  label="Dependency scan"
                  value={report.dependency_scan?.status || 'unknown'}
                  hint={
                    report.dependency_scan?.last_at
                      ? formatDateTime(report.dependency_scan.last_at)
                      : 'Never run — use Monitor now'
                  }
                />
              </div>

              {report.dependency_scan?.summary ? (
                <div className={scanSummaryCardClass(report.dependency_scan?.status)}>
                  {String(report.dependency_scan?.status || '').toLowerCase() === 'pass' ? (
                    <FaShieldAlt aria-hidden />
                  ) : (
                    <FaExclamationTriangle aria-hidden />
                  )}
                  <p>{report.dependency_scan.summary}</p>
                </div>
              ) : null}

              <div className="secmon-report-grid">
                <div className="secmon-card">
                  <h3>By severity</h3>
                  {(Object.keys(report.by_severity || {}).length === 0) ? (
                    <p className="muted">No data.</p>
                  ) : (
                    <ul className="secmon-list">
                      {Object.entries(report.by_severity || {}).map(([k, v]) => (
                        <li key={k}>
                          <Badge className={severityClass(k)}>{k}</Badge>
                          <strong>{v}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="secmon-card">
                  <h3>By category</h3>
                  {(Object.keys(report.by_category || {}).length === 0) ? (
                    <p className="muted">No data.</p>
                  ) : (
                    <ul className="secmon-list">
                      {Object.entries(report.by_category || {}).map(([k, v]) => (
                        <li key={k}>
                          <span>{k}</span>
                          <strong>{v}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="secmon-card">
                  <h3>Top source IPs</h3>
                  {(report.top_source_ips || []).length === 0 ? (
                    <p className="muted">No data.</p>
                  ) : (
                    <ul className="secmon-list">
                      {(report.top_source_ips || []).map((row) => (
                        <li key={row.source_ip}>
                          <code>{row.source_ip}</code>
                          <strong>{row.total}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <p className="muted">Generated {formatDateTime(report.generated_at)}</p>
            </>
          ) : (
            <p className="muted">No report data yet.</p>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="secmon-settings">
          {loading || !settings ? (
            <p className="muted">Loading settings…</p>
          ) : (
            <form className="secmon-card" onSubmit={saveSettings}>
              <h2>Alert settings</h2>
              <p className="muted">Configure thresholds used by real-time detectors.</p>
              <div className="secmon-form-grid">
                <label className="filters-row__field">
                  <span className="filters-row__label">Alert minimum severity</span>
                  <select
                    value={settings.alert_min_severity || 'high'}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, alert_min_severity: e.target.value }))
                    }
                  >
                    {(options?.severities || []).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="filters-row__field">
                  <span className="filters-row__label">Failed login threshold</span>
                  <input
                    type="number"
                    min={2}
                    max={100}
                    value={settings.failed_login_threshold ?? 5}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, failed_login_threshold: e.target.value }))
                    }
                  />
                </label>
                <label className="filters-row__field">
                  <span className="filters-row__label">Failed login window (minutes)</span>
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
                <label className="filters-row__field secmon-span-2 secmon-check">
                  <input
                    type="checkbox"
                    checked={!!settings.alert_email_enabled}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, alert_email_enabled: e.target.checked }))
                    }
                  />
                  <span>Email alerts enabled</span>
                </label>
                <label className="filters-row__field secmon-span-2">
                  <span className="filters-row__label">Alert emails (comma-separated)</span>
                  <input
                    value={
                      Array.isArray(settings.alert_emails)
                        ? settings.alert_emails.join(', ')
                        : settings.alert_emails || ''
                    }
                    onChange={(e) => setSettings((s) => ({ ...s, alert_emails: e.target.value }))}
                    placeholder="ops@example.com, security@example.com"
                  />
                </label>
              </div>
              <div className="filters-row__actions">
                <button type="submit" className="btn primary" disabled={saving}>
                  Save settings
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {selectedEvent && (
        <DetailDrawer title="Event detail" onClose={() => setSelectedEvent(null)}>
          <div className="secmon-badges">
            <Badge className={severityClass(selectedEvent.severity)}>{selectedEvent.severity}</Badge>
            <Badge className={statusClass(selectedEvent.status)}>{selectedEvent.status}</Badge>
          </div>
          <dl className="secmon-dl">
            <div>
              <dt>When</dt>
              <dd>{formatDateTime(selectedEvent.occurred_at)}</dd>
            </div>
            <div>
              <dt>What happened</dt>
              <dd>{selectedEvent.description}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>
                <code>{selectedEvent.event_type}</code>
              </dd>
            </div>
            <div>
              <dt>Source IP</dt>
              <dd>{selectedEvent.source_ip || '—'}</dd>
            </div>
            <div>
              <dt>Actor</dt>
              <dd>
                {selectedEvent.actor?.email ||
                  selectedEvent.actor?.name ||
                  'anonymous / unknown'}
              </dd>
            </div>
          </dl>
        </DetailDrawer>
      )}

      {selectedIncident && (
        <DetailDrawer
          title={`Incident #${selectedIncident.id}`}
          onClose={() => setSelectedIncident(null)}
        >
          <div className="secmon-badges">
            <Badge className={severityClass(selectedIncident.severity)}>
              {selectedIncident.severity}
            </Badge>
            <Badge className={statusClass(selectedIncident.status)}>{selectedIncident.status}</Badge>
          </div>
          <dl className="secmon-dl">
            <div>
              <dt>Opened</dt>
              <dd>{formatDateTime(selectedIncident.created_at)}</dd>
            </div>
            <div>
              <dt>What happened</dt>
              <dd>{selectedIncident.description || selectedIncident.title}</dd>
            </div>
            <div>
              <dt>Affected module</dt>
              <dd>
                {selectedIncident.affected_module_label || selectedIncident.affected_module || '—'}
                {selectedIncident.disaster_recognized ? (
                  <>
                    {' '}
                    <Badge className="gc-status gc-status--bad">Disaster recognized</Badge>
                  </>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Recovery</dt>
              <dd>{selectedIncident.recovery_status || 'none'}</dd>
            </div>
          </dl>

          {canManageDisasterRecovery && (
            <div className="secmon-card secmon-dr-panel">
              <h3>Module disaster recovery</h3>
              <p className="muted">
                Monitoring recognizes the incident; recovery rolls back{' '}
                <strong>only the affected module</strong> — not the whole hub or all code.
              </p>
              {drMessage ? <div className="alert success">{drMessage}</div> : null}

              {!selectedIncident.disaster_recognized ? (
                <div className="secmon-dr-actions">
                  <label className="filters-row__field">
                    <span className="filters-row__label">Module where disaster happened</span>
                    <select
                      value={recognizeModule}
                      onChange={(e) => setRecognizeModule(e.target.value)}
                    >
                      <option value="">Select module…</option>
                      {(options?.recoverable_modules || []).map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={saving || !recognizeModule}
                    onClick={recognizeDisaster}
                  >
                    Recognize disaster
                  </button>
                </div>
              ) : (
                <div className="secmon-dr-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={saving}
                    onClick={createModuleSnapshot}
                  >
                    Create module snapshot now
                  </button>
                  <label className="filters-row__field">
                    <span className="filters-row__label">Roll back to snapshot</span>
                    <select
                      value={rollbackSnapshotId}
                      onChange={(e) => setRollbackSnapshotId(e.target.value)}
                    >
                      {disasterSnapshots.length === 0 ? (
                        <option value="">No snapshots yet</option>
                      ) : (
                        disasterSnapshots.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            #{s.id} | {s.label || s.trigger} |{' '}
                            {formatDateTime(s.created_at)}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={saving || !rollbackSnapshotId}
                    onClick={rollbackDisaster}
                  >
                    Roll back module
                  </button>
                </div>
              )}
            </div>
          )}

          {(selectedIncident.investigation_notes || []).length > 0 && (
            <div className="secmon-notes">
              <h3>Investigation notes</h3>
              <ul>
                {selectedIncident.investigation_notes.map((n) => (
                  <li key={n.id}>
                    <strong>{n.author_name || 'User'}</strong>
                    <span className="muted"> | {formatDateTime(n.created_at)}</span>
                    <p>{n.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canManageIncidents && (
            <form className="secmon-update" onSubmit={updateIncident}>
              <label className="filters-row__field">
                <span className="filters-row__label">Status</span>
                <select value={incidentStatus} onChange={(e) => setIncidentStatus(e.target.value)}>
                  {(options?.statuses || []).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filters-row__field">
                <span className="filters-row__label">Add note</span>
                <textarea
                  rows={3}
                  placeholder="Investigation note"
                  value={incidentNote}
                  onChange={(e) => setIncidentNote(e.target.value)}
                />
              </label>
              <button type="submit" className="btn primary" disabled={saving}>
                Update incident
              </button>
            </form>
          )}
        </DetailDrawer>
      )}

      <style>{`
        .secmon-page .page-head .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }
        .secmon-alert {
          margin-bottom: 1rem;
        }
        .secmon-alert--warn {
          background: #fff7ed;
          border-color: #fdba74;
          color: #9a3412;
        }
        .secmon-link {
          background: none;
          border: 0;
          padding: 0;
          color: var(--brand, #1d4ed8);
          font: inherit;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .secmon-incidents,
        .secmon-report,
        .secmon-settings {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .secmon-card {
          border: 1px solid var(--line, rgba(15, 23, 42, 0.12));
          border-radius: 12px;
          background: var(--panel, #fff);
          padding: 1rem 1.15rem;
          box-shadow: var(--shadow, 0 1px 2px rgba(15, 23, 42, 0.04));
        }
        .secmon-card h2,
        .secmon-card h3 {
          margin: 0 0 0.35rem;
          font-size: 1.05rem;
        }
        .secmon-dr-panel {
          margin: 1rem 0;
        }
        .secmon-dr-actions {
          display: grid;
          gap: 0.75rem;
          margin-top: 0.75rem;
        }
        .secmon-card--warn,
        .secmon-card--ok,
        .secmon-card--danger {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
        }
        .secmon-card--warn {
          background: #fff7ed;
          border-color: #fdba74;
          color: #9a3412;
        }
        .secmon-card--ok {
          background: #f0fdf4;
          border-color: #86efac;
          color: #166534;
        }
        .secmon-card--danger {
          background: #fef2f2;
          border-color: #fca5a5;
          color: #991b1b;
        }
        .secmon-card--warn p,
        .secmon-card--ok p,
        .secmon-card--danger p {
          margin: 0;
        }
        .secmon-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.85rem;
          margin: 0.85rem 0 1rem;
        }
        .secmon-span-2 {
          grid-column: 1 / -1;
        }
        .secmon-form-grid textarea,
        .secmon-update textarea,
        .secmon-form-grid input,
        .secmon-form-grid select,
        .secmon-update select {
          width: 100%;
          min-height: 2.5rem;
        }
        .secmon-form-grid textarea,
        .secmon-update textarea {
          min-height: 5rem;
          resize: vertical;
        }
        .secmon-check {
          flex-direction: row !important;
          align-items: center;
          gap: 0.55rem !important;
        }
        .secmon-check input {
          width: auto;
          min-height: auto;
        }
        .secmon-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .secmon-chip-row .btn.ghost {
          font-size: 0.82rem;
          padding: 0.25rem 0.65rem;
        }
        .secmon-access-rules {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.85rem;
        }
        .secmon-access-rule {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        /* Beat global label { display:grid } so checkbox sits left of the title. */
        .secmon-page label.checkbox-row.secmon-access-check {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          margin: 0;
          width: 100%;
          box-sizing: border-box;
        }
        .secmon-page label.checkbox-row.secmon-access-check input[type='checkbox'] {
          flex: 0 0 auto;
          width: 1rem;
          height: 1rem;
          margin: 0.2rem 0 0;
          align-self: flex-start;
        }
        .secmon-page label.checkbox-row.secmon-access-check > span {
          flex: 1 1 auto;
          min-width: 0;
          line-height: 1.35;
          font-weight: 500;
        }
        .secmon-access-rule__body {
          margin-left: 1.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .secmon-access-rule__body textarea {
          width: 100%;
          min-height: 4.5rem;
          resize: vertical;
          font-weight: 400;
        }
        .secmon-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }
        .secmon-stat {
          border: 1px solid var(--line, rgba(15, 23, 42, 0.12));
          border-radius: 12px;
          padding: 1rem 1.1rem;
          background: var(--panel, #fff);
        }
        .secmon-stat__value {
          margin: 0;
          font-size: 1.6rem;
          font-weight: 750;
          line-height: 1.1;
          text-transform: capitalize;
        }
        .secmon-stat__label {
          margin: 0.35rem 0 0;
          font-weight: 600;
        }
        .secmon-stat__hint {
          margin: 0.25rem 0 0;
          font-size: 0.82rem;
          color: var(--muted, #64748b);
        }
        .secmon-report-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }
        .secmon-list {
          list-style: none;
          margin: 0.75rem 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .secmon-list li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
        }
        .secmon-drawer {
          margin-top: 1.25rem;
          border: 1px solid var(--line, rgba(15, 23, 42, 0.12));
          border-radius: 12px;
          background: var(--panel, #fff);
          padding: 1rem 1.15rem;
        }
        .secmon-drawer__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.85rem;
        }
        .secmon-drawer__head h2 {
          margin: 0;
          font-size: 1.15rem;
        }
        .secmon-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-bottom: 0.85rem;
        }
        .secmon-dl {
          margin: 0;
          display: grid;
          gap: 0.75rem;
        }
        .secmon-dl dt {
          font-size: 0.75rem;
          font-weight: 650;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--muted, #64748b);
          margin: 0 0 0.2rem;
        }
        .secmon-dl dd {
          margin: 0;
        }
        .secmon-notes {
          margin-top: 1rem;
        }
        .secmon-notes h3 {
          margin: 0 0 0.5rem;
          font-size: 0.95rem;
        }
        .secmon-notes ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .secmon-notes li {
          border-top: 1px solid var(--line, rgba(15, 23, 42, 0.1));
          padding-top: 0.65rem;
        }
        .secmon-notes p {
          margin: 0.35rem 0 0;
        }
        .secmon-update {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        @media (max-width: 900px) {
          .secmon-stat-grid,
          .secmon-report-grid,
          .secmon-form-grid {
            grid-template-columns: 1fr;
          }
            
          .secmon-span-2 {
            grid-column: auto;
          }
        }
      `}</style>
    </section>
  )
}
