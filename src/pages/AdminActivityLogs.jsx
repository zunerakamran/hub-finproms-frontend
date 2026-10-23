/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FaBolt,
  FaCalendarDay,
  FaChartBar,
  FaClipboardList,
  FaExclamationTriangle,
  FaFilter,
  FaHistory,
  FaSearch,
  FaShieldAlt,
  FaSync,
  FaTimes,
  FaUser,
  FaUsers,
} from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
import { formatDate, formatDateTime } from '../utils/dateFormat'
import { SmcBarChart } from '../components/SocialMediaComplianceUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { plainTextFromHtml, truncateRichText } from '../utils/richText'

const ACTION_LABELS = {
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',
  'auth.force_logout': 'Force-logged out user',
  'auth.login_failed': 'Failed sign-in',
  'auth.login_blocked': 'Sign-in blocked',
  'auth.register': 'New registration',
  'auth.email_verified': 'Email verified',
  'auth.login_otp_sent': 'Login OTP sent',
  'auth.login_otp_verified': 'Login OTP verified',
  'auth.profile_updated': 'Profile updated',
  'auth.terms_accepted': 'Accepted terms',
  'auth.privacy_accepted': 'Acknowledged privacy policy',
  'gdpr.export': 'GDPR data export',
  'gdpr.erase': 'GDPR data erasure',
  'activity_logs.view': 'Viewed activity log',
  'activity_logs.report': 'Viewed activity report',
  'modules.update': 'Updated hub modules',
  'gc.submit': 'Submitted compliance item',
  'gc.resubmit': 'Resubmitted compliance item',
  'gc.review': 'Reviewed compliance item',
  'gc.assign': 'Assigned compliance item',
  'gc.unassign': 'Unassigned compliance item',
  'gc.confirm_feedback': 'Confirmed compliance feedback',
  'gc.reports.view': 'Viewed compliance report',
  'gc.reports.export': 'Exported compliance report',
  'smc.submit': 'Submitted social media item',
  'smc.resubmit': 'Resubmitted social media item',
  'smc.review': 'Reviewed social media item',
  'smc.assign': 'Assigned social media item',
  'smc.unassign': 'Unassigned social media item',
  'smc.confirm_feedback': 'Confirmed social media feedback',
  'smc.reports.view': 'Viewed social media report',
  'smc.reports.export': 'Exported social media report',
  'wc.change_request.submit': 'Submitted website change',
  'wc.change_request.assign': 'Assigned website change',
  'wc.change_request.reject': 'Rejected website change',
  'wc.change_request.approve': 'Approved website change',
  'wc.change_request.schedule': 'Scheduled website change',
  'wc.template_request.submit': 'Submitted website template request',
  'wc.template_request.deploy': 'Deployed website template',
  'wc.template_request.reject': 'Rejected website template',
  'wc.section.update': 'Updated website section',
  'wc.section.lock': 'Locked website section',
  'wc.section.unlock': 'Unlocked website section',
}

const emptyFilters = {
  q: '',
  action: '',
  user_id: '',
  from: '',
  to: '',
}

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
]

function toDateInput(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function presetRange(id) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (id === 'all') return { from: '', to: '' }
  if (id === 'today') return { from: toDateInput(today), to: toDateInput(today) }
  const start = new Date(today)
  start.setDate(start.getDate() - (id === '7d' ? 6 : 29))
  return { from: toDateInput(start), to: toDateInput(today) }
}

function friendlyAction(action) {
  if (!action) return 'Activity'
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]
  return String(action)
    .replace(/\./g, ' | ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatWhen(value) {
  return formatDateTime(value)
}

function statusTone(code) {
  const n = Number(code)
  if (!n) return ''
  if (n >= 200 && n < 300) return 'ok'
  if (n >= 400) return 'warn'
  return ''
}

function formatDayLabel(dateStr) {
  if (!dateStr) return '-'
  return formatDate(`${dateStr}T12:00:00`, dateStr)
}

function BreakdownList({ rows, total, getLabel, getKey, onRowClick, isRowClickable }) {
  if (!rows?.length) {
    return <p className="muted">Nothing to show for this period.</p>
  }

  const max = Math.max(1, ...rows.map((row) => Number(row.count) || 0))

  return (
    <ul className="activity-breakdown">
      {rows.map((row, idx) => {
        const count = Number(row.count) || 0
        const pctOfMax = Math.round((count / max) * 100)
        const pctOfTotal = total > 0 ? Math.round((count / total) * 100) : 0
        const clickable = Boolean(onRowClick && (isRowClickable ? isRowClickable(row) : true))

        return (
          <li key={getKey(row, idx)} className={clickable ? 'is-clickable' : undefined}>
            {clickable ? (
              <button
                type="button"
                className="activity-breakdown__btn"
                onClick={() => onRowClick(row)}
              >
                <div className="activity-breakdown__head">
                  <span className="activity-breakdown__label" title={getLabel(row)}>
                    {getLabel(row)}
                  </span>
                  <span className="activity-breakdown__meta">
                    <strong>{count}</strong>
                    <span className="muted">{pctOfTotal}%</span>
                  </span>
                </div>
                <div className="activity-breakdown__track" aria-hidden>
                  <div className="activity-breakdown__fill" style={{ width: `${pctOfMax}%` }} />
                </div>
              </button>
            ) : (
              <>
                <div className="activity-breakdown__head">
                  <span className="activity-breakdown__label" title={getLabel(row)}>
                    {getLabel(row)}
                  </span>
                  <span className="activity-breakdown__meta">
                    <strong>{count}</strong>
                    <span className="muted">{pctOfTotal}%</span>
                  </span>
                </div>
                <div className="activity-breakdown__track" aria-hidden>
                  <div className="activity-breakdown__fill" style={{ width: `${pctOfMax}%` }} />
                </div>
              </>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function StatCard({ icon: Icon, label, value, hint, accent }) {
  return (
    <article className={`activity-stat-card activity-stat-card--${accent}`}>
      <div className="activity-stat-card__icon" aria-hidden>
        <Icon />
      </div>
      <div>
        <p className="activity-stat-card__value">{value ?? 0}</p>
        <p className="activity-stat-card__label">{label}</p>
        {hint ? <p className="activity-stat-card__hint">{hint}</p> : null}
      </div>
    </article>
  )
}

function severityClass(severity) {
  const s = String(severity || '').toLowerCase()
  if (s === 'high' || s === 'critical') return 'gc-status gc-status--bad'
  if (s === 'medium') return 'gc-status gc-status--awf'
  if (s === 'low') return 'gc-status gc-status--pending'
  return 'gc-status'
}

function anomalyStatusClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'reviewed' || s === 'dismissed') return 'gc-status gc-status--ok'
  if (s === 'escalated') return 'gc-status gc-status--awf'
  return 'gc-status gc-status--pending'
}

function AnomalyDetailDrawer({ anomaly, onClose, onReviewed, onDismissed, onEscalate, canEscalate, busy }) {
  if (!anomaly) return null

  return (
    <aside className="activity-anomaly-drawer" role="dialog" aria-label={anomaly.title || 'Anomaly detail'}>
      <div className="activity-anomaly-drawer__head">
        <h2>{anomaly.title || 'Anomaly'}</h2>
        <DataGridIconBtn icon={FaTimes} label="Close" onClick={onClose} />
      </div>
      <div className="activity-anomaly-drawer__body">
        <p className="muted">{formatWhen(anomaly.detected_at)}</p>
        <p>
          <span className={severityClass(anomaly.severity)}>{anomaly.severity}</span>{' '}
          <span className={anomalyStatusClass(anomaly.status)}>{anomaly.status}</span>
        </p>
        <p>
          <strong>Type:</strong> {anomaly.anomaly_type_label || anomaly.anomaly_type}
        </p>
        <p>{anomaly.description}</p>
        <p>
          <strong>Actor:</strong>{' '}
          {anomaly.actor?.name || anomaly.actor?.email || 'Unknown'}
          {anomaly.actor?.role ? ` | ${anomaly.actor.role}` : ''}
        </p>
        {anomaly.source_ip ? (
          <p>
            <strong>IP:</strong> {anomaly.source_ip}
          </p>
        ) : null}
        {anomaly.related_activity_log_ids?.length ? (
          <p>
            <strong>Related activity log IDs:</strong>{' '}
            {anomaly.related_activity_log_ids.join(', ')}
          </p>
        ) : null}
        {anomaly.security_event_id ? (
          <p>
            <strong>Security event:</strong> #{anomaly.security_event_id}
            {anomaly.security_incident_id ? ` | incident #${anomaly.security_incident_id}` : ''}
          </p>
        ) : null}
        <div className="activity-anomaly-drawer__actions">
          {anomaly.status === 'open' ? (
            <>
              <button type="button" className="btn" disabled={busy} onClick={() => onReviewed(anomaly)}>
                Mark reviewed
              </button>
              <button type="button" className="btn ghost" disabled={busy} onClick={() => onDismissed(anomaly)}>
                Dismiss
              </button>
            </>
          ) : null}
          {canEscalate && anomaly.status !== 'escalated' && !anomaly.security_event_id ? (
            <button type="button" className="btn primary" disabled={busy} onClick={() => onEscalate(anomaly)}>
              <FaShieldAlt aria-hidden /> Escalate to Security Monitoring
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  )
}

const initialRange = presetRange('30d')

export default function AdminActivityLogs({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const [tab, setTab] = useState('report')
  const [filters, setFilters] = useState(() => ({ ...emptyFilters, ...initialRange }))
  const [applied, setApplied] = useState(() => ({ ...emptyFilters, ...initialRange }))
  const [preset, setPreset] = useState('30d')
  const [report, setReport] = useState(null)
  const [logs, setLogs] = useState([])
  const [meta, setMeta] = useState(null)
  const [anomalies, setAnomalies] = useState([])
  const [anomalyMeta, setAnomalyMeta] = useState(null)
  const [anomalyOptions, setAnomalyOptions] = useState(null)
  const [anomalyFilters, setAnomalyFilters] = useState({
    severity: '',
    status: '',
    anomaly_type: '',
  })
  const [selectedAnomaly, setSelectedAnomaly] = useState(null)
  const [anomalyBusy, setAnomalyBusy] = useState(false)
  const [detectMessage, setDetectMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_view_activity_logs')
  const canEscalate = can('security_monitoring')
  const apiOpts = { asPowerAdmin }

  const queryParams = useCallback(
    (extra = {}) => {
      const params = { ...extra }
      if (applied.q) params.q = applied.q
      if (applied.action) params.action = applied.action
      if (applied.user_id !== '' && applied.user_id != null) params.user_id = applied.user_id
      if (applied.from) params.from = applied.from
      if (applied.to) params.to = applied.to
      return params
    },
    [applied]
  )

  useEffect(() => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    const load = async () => {
      try {
        if (tab === 'report') {
          const data = await api.activityLogReport(queryParams(), apiOpts)
          if (!cancelled) setReport(data.report || null)
        } else if (tab === 'anomalies') {
          const data = await api.activityAnomalies(
            {
              ...queryParams(),
              severity: anomalyFilters.severity || undefined,
              status: anomalyFilters.status || undefined,
              anomaly_type: anomalyFilters.anomaly_type || undefined,
              per_page: 50,
              page: 1,
            },
            apiOpts
          )
          if (!cancelled) {
            setAnomalies(data.data || [])
            setAnomalyMeta(data.meta || null)
            setAnomalyOptions(data.options || null)
          }
        } else {
          const data = await api.activityLogs({ ...queryParams(), per_page: 50, page: 1 }, apiOpts)
          if (!cancelled) {
            setLogs(data.data || [])
            setMeta(data.meta || null)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load activity data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [hubLoading, enabled, tab, queryParams, asPowerAdmin, anomalyFilters])

  const applyFilters = (event) => {
    event.preventDefault()
    setPreset('custom')
    setApplied({ ...filters })
  }

  const resetFilters = () => {
    const range = presetRange('30d')
    const next = { ...emptyFilters, ...range }
    setFilters(next)
    setApplied(next)
    setPreset('30d')
  }

  const applyPreset = (id) => {
    const range = presetRange(id)
    const next = { ...filters, ...range }
    setPreset(id)
    setFilters(next)
    setApplied(next)
  }

  const openPersonActivities = (row) => {
    // Guests have no user_id - use 0 so the API filters where user_id IS NULL.
    const userId = row?.user_id != null && row.user_id !== '' ? String(row.user_id) : '0'
    const next = {
      ...filters,
      user_id: userId,
    }
    setFilters(next)
    setApplied(next)
    setTab('logs')
  }

  const clearPersonFilter = () => {
    const next = { ...filters, user_id: '' }
    setFilters(next)
    setApplied(next)
  }

  const personFilterActive = applied.user_id !== '' && applied.user_id != null
  const personFilterIsGuest = String(applied.user_id) === '0'

  const summary = report?.summary
  const totalEvents = summary?.total ?? 0

  const insights = useMemo(() => {
    const topAction = report?.by_action?.[0]
    const topUser = report?.by_user?.[0]
    const topDay = report?.by_day?.[0]
    return { topAction, topUser, topDay }
  }, [report])

  const dayChart = useMemo(() => {
    const rows = [...(report?.by_day || [])].reverse().slice(-14)
    return {
      labels: rows.map((row) => formatDayLabel(row.date)),
      data: rows.map((row) => row.count),
    }
  }, [report])

  const actionChart = useMemo(() => {
    const rows = (report?.by_action || []).slice(0, 8)
    return {
      labels: rows.map((row) => friendlyAction(row.action)),
      data: rows.map((row) => row.count),
    }
  }, [report])

  const periodLabel = useMemo(() => {
    if (applied.from && applied.to && applied.from === applied.to) return `on ${formatDayLabel(applied.from)}`
    if (applied.from && applied.to) return `from ${formatDayLabel(applied.from)} to ${formatDayLabel(applied.to)}`
    if (applied.from) return `since ${formatDayLabel(applied.from)}`
    if (applied.to) return `until ${formatDayLabel(applied.to)}`
    return 'for all recorded time'
  }, [applied])

  const reloadAnomalies = useCallback(async () => {
    const data = await api.activityAnomalies(
      {
        ...queryParams(),
        severity: anomalyFilters.severity || undefined,
        status: anomalyFilters.status || undefined,
        anomaly_type: anomalyFilters.anomaly_type || undefined,
        per_page: 50,
        page: 1,
      },
      apiOpts
    )
    setAnomalies(data.data || [])
    setAnomalyMeta(data.meta || null)
    setAnomalyOptions(data.options || null)
  }, [queryParams, anomalyFilters, asPowerAdmin])

  const openAnomaly = async (row) => {
    try {
      setAnomalyBusy(true)
      const data = await api.activityAnomaly(row.id, apiOpts)
      setSelectedAnomaly(data.data || row)
    } catch (err) {
      setError(err.message || 'Failed to load anomaly detail.')
    } finally {
      setAnomalyBusy(false)
    }
  }

  const markAnomaly = async (row, status) => {
    try {
      setAnomalyBusy(true)
      setError('')
      const data = await api.updateActivityAnomaly(row.id, { status }, apiOpts)
      setSelectedAnomaly(data.data || null)
      await reloadAnomalies()
    } catch (err) {
      setError(err.message || 'Failed to update anomaly.')
    } finally {
      setAnomalyBusy(false)
    }
  }

  const escalateAnomaly = async (row) => {
    try {
      setAnomalyBusy(true)
      setError('')
      const data = await api.escalateActivityAnomaly(row.id, apiOpts)
      setSelectedAnomaly(data.data || null)
      await reloadAnomalies()
    } catch (err) {
      setError(err.message || 'Failed to escalate anomaly.')
    } finally {
      setAnomalyBusy(false)
    }
  }

  const runDetectNow = async () => {
    try {
      setAnomalyBusy(true)
      setDetectMessage('')
      setError('')
      const data = await api.detectActivityAnomaliesNow(apiOpts)
      const created = data.data?.created ?? 0
      setDetectMessage(
        created > 0
          ? `Detection finished — ${created} new anomal${created === 1 ? 'y' : 'ies'} recorded.`
          : 'Detection finished — no new anomalies.'
      )
      await reloadAnomalies()
    } catch (err) {
      setError(err.message || 'Detection failed.')
    } finally {
      setAnomalyBusy(false)
    }
  }

  const anomalyColumns = useMemo(
    () => [
      {
        key: 'detected_at',
        label: 'Detected',
        filterValue: (row) => formatWhen(row.detected_at),
        render: (row) => formatWhen(row.detected_at),
      },
      {
        key: 'severity',
        label: 'Severity',
        filterValue: (row) => row.severity || '',
        render: (row) => <span className={severityClass(row.severity)}>{row.severity}</span>,
      },
      {
        key: 'status',
        label: 'Status',
        filterValue: (row) => row.status || '',
        render: (row) => <span className={anomalyStatusClass(row.status)}>{row.status}</span>,
      },
      {
        key: 'title',
        label: 'Anomaly',
        filterValue: (row) => `${row.title || ''} ${row.anomaly_type || ''}`,
        render: (row) => (
          <div>
            <strong>{row.title}</strong>
            <div className="muted">{row.anomaly_type_label || row.anomaly_type}</div>
          </div>
        ),
      },
      {
        key: 'actor',
        label: 'Actor',
        filterValue: (row) =>
          [row.actor?.name, row.actor?.email, row.source_ip].filter(Boolean).join(' '),
        render: (row) => (
          <div>
            <div>{row.actor?.name || row.actor?.email || 'Unknown'}</div>
            {row.source_ip ? <span className="muted">{row.source_ip}</span> : null}
          </div>
        ),
      },
      {
        key: 'actions',
        label: '',
        sortable: false,
        render: (row) => (
          <button type="button" className="btn ghost" onClick={() => openAnomaly(row)}>
            View
          </button>
        ),
      },
    ],
    []
  )

  const logColumns = useMemo(
    () => [
      {
        key: 'created_at',
        label: 'When',
        filterValue: (row) => formatWhen(row.created_at),
        render: (row) => formatWhen(row.created_at),
      },
      {
        key: 'action',
        label: 'Action',
        filterValue: (row) => `${friendlyAction(row.action)} ${row.action || ''}`,
        render: (row) => (
          <div>
            <strong>{friendlyAction(row.action)}</strong>
            <div>
              <code className="activity-chip activity-chip--code">{row.action}</code>
            </div>
          </div>
        ),
      },
      {
        key: 'user',
        label: 'User',
        filterValue: (row) =>
          [row.user_name, row.user_email, row.user_role].filter(Boolean).join(' '),
        render: (row) => (
          <div>
            <div>
              {row.user_name || 'Guest'}
              {row.user_role ? ` | ${row.user_role}` : ''}
            </div>
            {row.user_email ? <span className="muted">{row.user_email}</span> : null}
          </div>
        ),
      },
      {
        key: 'description',
        label: 'Description',
        filterValue: (row) => plainTextFromHtml(row.description || ''),
        render: (row) => truncateRichText(row.description, 180) || '-',
      },
      {
        key: 'path',
        label: 'Request',
        filterValue: (row) => [row.method, row.path].filter(Boolean).join(' '),
        render: (row) =>
          row.method || row.path ? (
            <span className="activity-chip activity-chip--mono">
              {[row.method, row.path].filter(Boolean).join(' ')}
            </span>
          ) : (
            '-'
          ),
      },
      {
        key: 'status_code',
        label: 'Status',
        filterValue: (row) => String(row.status_code || ''),
        render: (row) =>
          row.status_code ? (
            <span className={`badge ${statusTone(row.status_code)}`}>{row.status_code}</span>
          ) : (
            '-'
          ),
      },
    ],
    []
  )

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Hub</p>
            <h1>Activity logs</h1>
            <p className="muted">
              Enable &quot;View activity logs / report&quot; for your role under Power Admin
              - Capabilities.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="activity-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Activity logs</h1>
          <p className="muted">
            See what people are doing in this hub - sign-ins, reviews, updates, and more. Use the
            summary cards for a quick overview, dig into the timeline for detail, and check Anomaly
            detection for unusual activity patterns (separate from Security Monitoring).
          </p>
        </div>
      </div>

      <div className="tab-row" role="tablist" aria-label="Activity views">
        <button
          type="button"
          className={`btn ghost ${tab === 'report' ? 'active' : ''}`}
          onClick={() => setTab('report')}
        >
          <FaChartBar aria-hidden /> Overview report
        </button>
        <button
          type="button"
          className={`btn ghost ${tab === 'logs' ? 'active' : ''}`}
          onClick={() => setTab('logs')}
        >
          <FaHistory aria-hidden /> Activity timeline
        </button>
        <button
          type="button"
          className={`btn ghost ${tab === 'anomalies' ? 'active' : ''}`}
          onClick={() => setTab('anomalies')}
        >
          <FaExclamationTriangle aria-hidden /> Anomaly detection
        </button>
      </div>

      <div className="activity-panel">
        <div className="activity-panel__head">
          <div className="activity-panel__title">
            <FaFilter aria-hidden />
            <div>
              <strong>Filters</strong>
              <p className="muted">Narrow results {periodLabel}.</p>
            </div>
          </div>
          <div className="activity-presets" role="group" aria-label="Date range">
            {DATE_PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`btn ghost ${preset === item.id ? 'active' : ''}`}
                onClick={() => applyPreset(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <form className="activity-filters" onSubmit={applyFilters}>
          <label className="activity-field">
            <span>Search</span>
            <div className="activity-field__input">
              <FaSearch aria-hidden />
              <input
                type="search"
                placeholder={
                  tab === 'anomalies'
                    ? 'Title, actor, IP, or type...'
                    : 'Name, email, description, or page path...'
                }
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              />
            </div>
          </label>
          {tab === 'anomalies' ? (
            <>
              <label className="activity-field">
                <span>Severity</span>
                <select
                  value={anomalyFilters.severity}
                  onChange={(e) =>
                    setAnomalyFilters((f) => ({ ...f, severity: e.target.value }))
                  }
                >
                  <option value="">Any</option>
                  {(anomalyOptions?.severities || ['info', 'low', 'medium', 'high']).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="activity-field">
                <span>Status</span>
                <select
                  value={anomalyFilters.status}
                  onChange={(e) => setAnomalyFilters((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="">Any</option>
                  {(anomalyOptions?.statuses || ['open', 'reviewed', 'dismissed', 'escalated']).map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    )
                  )}
                </select>
              </label>
              <label className="activity-field">
                <span>Type</span>
                <select
                  value={anomalyFilters.anomaly_type}
                  onChange={(e) =>
                    setAnomalyFilters((f) => ({ ...f, anomaly_type: e.target.value }))
                  }
                >
                  <option value="">Any</option>
                  {(anomalyOptions?.anomaly_types || []).map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="activity-field">
                <span>Action type</span>
                <input
                  type="text"
                  placeholder="e.g. auth.login"
                  value={filters.action}
                  onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                  list="activity-action-suggestions"
                />
                <datalist id="activity-action-suggestions">
                  {Object.keys(ACTION_LABELS).map((key) => (
                    <option key={key} value={key}>
                      {ACTION_LABELS[key]}
                    </option>
                  ))}
                </datalist>
              </label>
              <label className="activity-field">
                <span>User ID</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0 = guests"
                  value={filters.user_id}
                  onChange={(e) => setFilters((f) => ({ ...f, user_id: e.target.value }))}
                />
              </label>
            </>
          )}
          <label className="activity-field">
            <span>From</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => {
                setPreset('custom')
                setFilters((f) => ({ ...f, from: e.target.value }))
              }}
            />
          </label>
          <label className="activity-field">
            <span>To</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => {
                setPreset('custom')
                setFilters((f) => ({ ...f, to: e.target.value }))
              }}
            />
          </label>
          <div className="activity-filters__actions">
            <button
              type="button"
              className="btn activity-filters__btn activity-filters__btn--reset"
              onClick={resetFilters}
            >
              Reset
            </button>
            <button type="submit" className="btn primary activity-filters__btn">
              Apply filters
            </button>
          </div>
        </form>
      </div>

      {error && <div className="alert">{error}</div>}
      {detectMessage && tab === 'anomalies' ? (
        <div className="alert success">{detectMessage}</div>
      ) : null}

      {loading ? (
        <div className="state">Loading activity...</div>
      ) : tab === 'anomalies' ? (
        <div className="activity-anomalies">
          <div className="activity-feed-meta">
            <p>
              Unusual patterns found from activity logs {periodLabel}
              {anomalyMeta?.total != null ? (
                <>
                  {' '}
                  (<strong>{anomalies.length}</strong> of <strong>{anomalyMeta.total}</strong>)
                </>
              ) : null}
              . This is not Security Monitoring — escalate security-relevant items when that module
              is enabled.
            </p>
            <button
              type="button"
              className="btn"
              disabled={anomalyBusy}
              onClick={runDetectNow}
            >
              <FaSync aria-hidden /> Detect now
            </button>
          </div>

          {!anomalies.length ? (
            <div className="empty-state activity-empty">
              <FaExclamationTriangle aria-hidden />
              <h2>No open anomalies</h2>
              <p className="muted">
                Run &quot;Detect now&quot; or wait for the scheduled scan. Healthy hubs often show an
                empty list.
              </p>
            </div>
          ) : (
            <DataGrid
              columns={anomalyColumns}
              rows={anomalies}
              loading={false}
              emptyMessage="No matching anomalies."
              pageSize={10}
              getRowKey={(row) => row.id}
            />
          )}

          <AnomalyDetailDrawer
            anomaly={selectedAnomaly}
            onClose={() => setSelectedAnomaly(null)}
            onReviewed={(row) => markAnomaly(row, 'reviewed')}
            onDismissed={(row) => markAnomaly(row, 'dismissed')}
            onEscalate={escalateAnomaly}
            canEscalate={canEscalate}
            busy={anomalyBusy}
          />
        </div>
      ) : tab === 'report' ? (
        !report ? (
          <div className="empty-state activity-empty">
            <FaClipboardList aria-hidden />
            <h2>No report data yet</h2>
            <p className="muted">Try a wider date range, or check back after users start using the hub.</p>
          </div>
        ) : (
          <div className="activity-report">
            <div className="activity-stat-grid">
              <StatCard
                icon={FaBolt}
                accent="events"
                label="Total activities"
                value={summary?.total ?? 0}
                hint="All recorded actions in this period"
              />
              <StatCard
                icon={FaUsers}
                accent="users"
                label="People involved"
                value={summary?.unique_users ?? 0}
                hint="Unique users who triggered activity"
              />
              <StatCard
                icon={FaClipboardList}
                accent="actions"
                label="Action types"
                value={summary?.unique_actions ?? 0}
                hint="Distinct kinds of activity"
              />
            </div>

            <div className="activity-insight-grid">
              <article className="activity-insight-card">
                <p className="activity-insight-card__eyebrow">Most common action</p>
                <h3>{insights.topAction ? friendlyAction(insights.topAction.action) : '-'}</h3>
                <p className="muted">
                  {insights.topAction
                    ? `${insights.topAction.count} time${insights.topAction.count === 1 ? '' : 's'}`
                    : 'No actions yet'}
                </p>
              </article>
              <article
                className={`activity-insight-card${
                  insights.topUser ? ' activity-insight-card--clickable' : ''
                }`}
                role={insights.topUser ? 'button' : undefined}
                tabIndex={insights.topUser ? 0 : undefined}
                onClick={() => {
                  if (insights.topUser) openPersonActivities(insights.topUser)
                }}
                onKeyDown={(e) => {
                  if (insights.topUser && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    openPersonActivities(insights.topUser)
                  }
                }}
              >
                <p className="activity-insight-card__eyebrow">Most active person</p>
                <h3>{insights.topUser?.user_name || insights.topUser?.user_email || '-'}</h3>
                <p className="muted">
                  {insights.topUser
                    ? `${insights.topUser.count} event${insights.topUser.count === 1 ? '' : 's'}${
                        insights.topUser.user_role ? ` | ${insights.topUser.user_role}` : ''
                      }`
                    : 'No users yet'}
                </p>
                {insights.topUser ? (
                  <p className="activity-insight-card__cta muted">View their activities</p>
                ) : null}
              </article>
              <article className="activity-insight-card">
                <p className="activity-insight-card__eyebrow">Busiest day</p>
                <h3>{insights.topDay ? formatDayLabel(insights.topDay.date) : '-'}</h3>
                <p className="muted">
                  {insights.topDay
                    ? `${insights.topDay.count} event${insights.topDay.count === 1 ? '' : 's'}`
                    : 'No daily data yet'}
                </p>
              </article>
            </div>

            <div className="activity-section-grid">
              <section className="activity-section-card">
                <header>
                  <div className="activity-section-card__icon activity-section-card__icon--chart">
                    <FaChartBar />
                  </div>
                  <div>
                    <h2>Activity by day</h2>
                    <p className="muted">Daily volume over the selected period (last 14 days shown).</p>
                  </div>
                </header>
                <SmcBarChart labels={dayChart.labels} data={dayChart.data} />
              </section>

              <section className="activity-section-card">
                <header>
                  <div className="activity-section-card__icon activity-section-card__icon--bolt">
                    <FaBolt />
                  </div>
                  <div>
                    <h2>Top actions</h2>
                    <p className="muted">What people do most often in this hub.</p>
                  </div>
                </header>
                <SmcBarChart labels={actionChart.labels} data={actionChart.data} />
              </section>

              <section className="activity-section-card">
                <header>
                  <div className="activity-section-card__icon activity-section-card__icon--user">
                    <FaUser />
                  </div>
                  <div>
                    <h2>By person</h2>
                    <p className="muted">Who generated the most activity. Click a person to open their timeline.</p>
                  </div>
                </header>
                <BreakdownList
                  rows={report.by_user || []}
                  total={totalEvents}
                  getKey={(row, idx) => `${row.user_id || 'guest'}-${idx}`}
                  getLabel={(row) =>
                    [row.user_name || 'Guest', row.user_email, row.user_role].filter(Boolean).join(' | ')
                  }
                  isRowClickable={() => true}
                  onRowClick={openPersonActivities}
                />
              </section>

              <section className="activity-section-card">
                <header>
                  <div className="activity-section-card__icon activity-section-card__icon--day">
                    <FaCalendarDay />
                  </div>
                  <div>
                    <h2>All action types</h2>
                    <p className="muted">Full breakdown with share of total events.</p>
                  </div>
                </header>
                <BreakdownList
                  rows={report.by_action || []}
                  total={totalEvents}
                  getKey={(row) => row.action}
                  getLabel={(row) => friendlyAction(row.action)}
                />
              </section>
            </div>

            <div className="activity-cta-bar">
              <div>
                <strong>Need the raw detail?</strong>
                <p className="muted">Open the timeline to see each event with who, what, and when.</p>
              </div>
              <button type="button" className="btn" onClick={() => setTab('logs')}>
                View activity timeline
              </button>
            </div>
          </div>
        )
      ) : (
        <>
          <div className="activity-feed-meta">
            <p>
              Showing loaded events {periodLabel}
              {meta?.total != null ? (
                <>
                  {' '}
                  (<strong>{logs.length}</strong> of <strong>{meta.total}</strong>)
                </>
              ) : null}
              {personFilterActive ? (
                <>
                  {' '}
                  for{' '}
                  <strong>{personFilterIsGuest ? 'Guest (anonymous)' : `user ID ${applied.user_id}`}</strong>
                </>
              ) : null}
              .
            </p>
            {personFilterActive ? (
              <button type="button" className="btn ghost" onClick={clearPersonFilter}>
                Clear person filter
              </button>
            ) : null}
          </div>

          <DataGrid
            columns={logColumns}
            rows={logs}
            loading={false}
            emptyMessage="No matching activity. Try clearing filters or widening the date range."
            pageSize={10}
            getRowKey={(row) => row.id}
          />
        </>
      )}

      <style>{`
        .activity-page .tab-row .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
        }

        .activity-panel {
          margin-bottom: 1.25rem;
          padding: 1rem 1.15rem 1.15rem;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: var(--panel);
          box-shadow: var(--shadow);
        }

        .activity-panel__head {
          display: flex;
          flex-wrap: wrap;
          gap: 0.85rem;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .activity-panel__title {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
        }

        .activity-panel__title > svg {
          margin-top: 0.2rem;
          color: var(--brand);
          flex-shrink: 0;
        }

        .activity-panel__title strong {
          display: block;
          margin-bottom: 0.15rem;
        }

        .activity-panel__title p {
          margin: 0;
          font-size: 0.88rem;
        }

        .activity-presets {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }

        .activity-presets .btn {
          padding: 0.35rem 0.75rem;
          font-size: 0.85rem;
        }

        .activity-filters {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 0.75rem;
          align-items: end;
        }

        .activity-field {
          display: grid;
          gap: 0.35rem;
          min-width: 0;
        }

        .activity-field > span {
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .activity-field input {
          width: 100%;
          min-width: 0;
        }

        .activity-field__input {
          position: relative;
        }

        .activity-field__input svg {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          font-size: 0.8rem;
          pointer-events: none;
        }

        .activity-field__input input {
          padding-left: 2.1rem;
        }

        .activity-filters__actions {
          grid-column: 1 / -1;
          display: flex;
          flex-wrap: nowrap;
          justify-content: flex-end;
          align-items: center;
          gap: 0.65rem;
        }

        .activity-filters__actions .activity-filters__btn {
          flex: 0 0 9.75rem;
          min-height: 2.65rem;
          justify-content: center;
        }

        .activity-filters__actions .activity-filters__btn--reset {
          background: #f2f4f7;
          border: 1px solid var(--line);
          color: var(--ink);
        }

        .activity-filters__actions .activity-filters__btn--reset:hover:not(:disabled) {
          background: #e8ecf1;
          border-color: color-mix(in srgb, var(--muted) 35%, var(--line));
          color: var(--ink);
        }

        .activity-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .activity-stat-card {
          display: flex;
          gap: 0.9rem;
          align-items: flex-start;
          padding: 1.15rem 1.2rem;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: var(--panel);
          box-shadow: var(--shadow);
        }

        .activity-stat-card__icon {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 12px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          font-size: 1rem;
        }

        .activity-stat-card--events .activity-stat-card__icon {
          background: #eff6ff;
          color: #2563eb;
        }
        .activity-stat-card--users .activity-stat-card__icon {
          background: #ecfdf5;
          color: #059669;
        }
        .activity-stat-card--actions .activity-stat-card__icon {
          background: #fff7ed;
          color: #ea580c;
        }

        .activity-stat-card__value {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 750;
          line-height: 1.1;
        }

        .activity-stat-card__label {
          margin: 0.25rem 0 0;
          font-weight: 600;
        }

        .activity-stat-card__hint {
          margin: 0.2rem 0 0;
          font-size: 0.82rem;
          color: var(--muted);
        }

        .activity-insight-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .activity-insight-card {
          padding: 1rem 1.15rem;
          border-radius: 16px;
          border: 1px solid var(--line);
          background: linear-gradient(180deg, #f8fafc 0%, var(--panel) 100%);
        }

        .activity-insight-card__eyebrow {
          margin: 0 0 0.35rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .activity-insight-card h3 {
          margin: 0;
          font-size: 1.05rem;
          line-height: 1.3;
        }

        .activity-insight-card p {
          margin: 0.35rem 0 0;
          font-size: 0.88rem;
        }

        .activity-insight-card--clickable {
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        }

        .activity-insight-card--clickable:hover,
        .activity-insight-card--clickable:focus-visible {
          border-color: color-mix(in srgb, var(--brand) 35%, var(--line));
          box-shadow: 0 8px 22px rgba(16, 24, 40, 0.08);
          transform: translateY(-1px);
          outline: none;
        }

        .activity-insight-card__cta {
          margin-top: 0.55rem !important;
          font-weight: 600;
          color: var(--brand) !important;
        }

        .activity-section-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .activity-section-card {
          padding: 1.15rem 1.25rem 1.25rem;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: var(--panel);
          box-shadow: var(--shadow);
          min-width: 0;
        }

        .activity-section-card header {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          margin-bottom: 0.85rem;
        }

        .activity-section-card h2 {
          margin: 0;
          font-size: 1.05rem;
        }

        .activity-section-card header p {
          margin: 0.2rem 0 0;
          font-size: 0.84rem;
        }

        .activity-section-card__icon {
          width: 2.35rem;
          height: 2.35rem;
          border-radius: 12px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .activity-section-card__icon--chart { background: #eff6ff; color: #2563eb; }
        .activity-section-card__icon--bolt { background: #fff7ed; color: #ea580c; }
        .activity-section-card__icon--user { background: #ecfdf5; color: #059669; }
        .activity-section-card__icon--day { background: #f5f3ff; color: #7c3aed; }

        .activity-breakdown {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 22rem;
          overflow: auto;
        }

        .activity-breakdown__btn {
          display: block;
          width: 100%;
          margin: 0;
          padding: 0.45rem 0.5rem;
          border: 1px solid transparent;
          border-radius: 10px;
          background: transparent;
          text-align: left;
          font: inherit;
          color: inherit;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .activity-breakdown__btn:hover,
        .activity-breakdown__btn:focus-visible {
          background: color-mix(in srgb, var(--brand) 8%, #fff);
          border-color: color-mix(in srgb, var(--brand) 22%, var(--line));
          outline: none;
        }

        .activity-breakdown__head {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          align-items: baseline;
          margin-bottom: 0.35rem;
        }

        .activity-breakdown__label {
          font-size: 0.9rem;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .activity-breakdown__meta {
          display: inline-flex;
          gap: 0.4rem;
          align-items: baseline;
          flex-shrink: 0;
          font-size: 0.85rem;
        }

        .activity-breakdown__track {
          height: 0.45rem;
          border-radius: 999px;
          background: #eef2f7;
          overflow: hidden;
        }

        .activity-breakdown__fill {
          height: 100%;
          border-radius: inherit;
          background: var(--brand, #2563eb);
          transition: width 0.35s ease;
        }

        .activity-cta-bar {
          margin-top: 1rem;
          padding: 1rem 1.15rem;
          border-radius: 16px;
          border: 1px dashed var(--line);
          background: #f8fafc;
          display: flex;
          flex-wrap: wrap;
          gap: 0.85rem;
          align-items: center;
          justify-content: space-between;
        }

        .activity-cta-bar p {
          margin: 0.2rem 0 0;
          font-size: 0.88rem;
        }

        .activity-empty {
          text-align: center;
          padding: 2.5rem 1rem;
        }

        .activity-empty svg {
          font-size: 1.75rem;
          color: var(--muted);
          margin-bottom: 0.65rem;
        }

        .activity-empty h2 {
          margin: 0 0 0.35rem;
          font-size: 1.15rem;
        }

        .activity-feed-meta {
          margin-bottom: 0.75rem;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .activity-feed-meta p {
          margin: 0;
          color: var(--muted);
          font-size: 0.92rem;
        }

        .activity-feed {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .activity-feed-card {
          display: flex;
          gap: 0.9rem;
          padding: 1rem 1.1rem;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: var(--panel);
          box-shadow: var(--shadow);
        }

        .activity-feed-card__avatar {
          width: 2.6rem;
          height: 2.6rem;
          border-radius: 999px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #1d4ed8;
          background: #dbeafe;
        }

        .activity-feed-card__body {
          min-width: 0;
          flex: 1;
        }

        .activity-feed-card__top {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
        }

        .activity-feed-card h3 {
          margin: 0;
          font-size: 1rem;
        }

        .activity-feed-card__desc {
          margin: 0.3rem 0 0;
          color: var(--muted);
          font-size: 0.92rem;
        }

        .activity-feed-card__when {
          text-align: right;
          flex-shrink: 0;
          display: grid;
          gap: 0.15rem;
          font-size: 0.82rem;
        }

        .activity-feed-card__rel {
          font-weight: 700;
          color: var(--brand, #2563eb);
        }

        .activity-feed-card__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-top: 0.75rem;
          align-items: center;
        }

        .activity-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          background: #f1f5f9;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .activity-chip--mono,
        .activity-chip--code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-weight: 500;
        }

        .activity-chip--code {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--muted);
        }

        .activity-pagination {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
          align-items: center;
        }

        .activity-anomaly-drawer {
          position: fixed;
          top: 0;
          right: 0;
          width: min(420px, 100vw);
          height: 100vh;
          z-index: 40;
          background: var(--panel, #fff);
          border-left: 1px solid var(--line);
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
        }

        .activity-anomaly-drawer__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 1rem 1.1rem;
          border-bottom: 1px solid var(--line);
        }

        .activity-anomaly-drawer__head h2 {
          margin: 0;
          font-size: 1.05rem;
        }

        .activity-anomaly-drawer__body {
          padding: 1rem 1.1rem;
          overflow: auto;
          display: grid;
          gap: 0.65rem;
        }

        .activity-anomaly-drawer__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .activity-anomaly-drawer__actions .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }

        @media (max-width: 900px) {
          .activity-stat-grid,
          .activity-insight-grid,
          .activity-section-grid {
            grid-template-columns: 1fr;
          }

          .activity-feed-card__top {
            flex-direction: column;
          }

          .activity-feed-card__when {
            text-align: left;
          }
        }
      `}</style>
    </section>
  )
}
