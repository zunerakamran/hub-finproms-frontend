/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FaBolt,
  FaCalendarDay,
  FaChartBar,
  FaClipboardList,
  FaFilter,
  FaHistory,
  FaSearch,
  FaUser,
  FaUsers,
} from 'react-icons/fa'
import { api } from '../api/client'
import { SmcBarChart } from '../components/SocialMediaComplianceUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const ACTION_LABELS = {
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',
  'auth.login_failed': 'Failed sign-in',
  'auth.login_blocked': 'Sign-in blocked',
  'auth.register': 'New registration',
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
    .replace(/\./g, ' · ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatWhen(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return String(value)
  }
}

function relativeWhen(value) {
  if (!value) return ''
  try {
    const then = new Date(value).getTime()
    const diff = Date.now() - then
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 14) return `${days}d ago`
    return ''
  } catch {
    return ''
  }
}

function initials(name, email) {
  const source = (name || email || '?').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function statusTone(code) {
  const n = Number(code)
  if (!n) return ''
  if (n >= 200 && n < 300) return 'ok'
  if (n >= 400) return 'warn'
  return ''
}

function formatDayLabel(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function BreakdownList({ rows, total, getLabel, getKey }) {
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
        return (
          <li key={getKey(row, idx)}>
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
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_view_activity_logs')
  const apiOpts = { asPowerAdmin }

  const queryParams = useCallback(
    (extra = {}) => {
      const params = { ...extra }
      if (applied.q) params.q = applied.q
      if (applied.action) params.action = applied.action
      if (applied.user_id) params.user_id = applied.user_id
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
        } else {
          const data = await api.activityLogs({ ...queryParams(), per_page: 25, page }, apiOpts)
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
  }, [hubLoading, enabled, tab, page, queryParams, asPowerAdmin])

  const applyFilters = (event) => {
    event.preventDefault()
    setPage(1)
    setPreset('custom')
    setApplied({ ...filters })
  }

  const resetFilters = () => {
    const range = presetRange('30d')
    const next = { ...emptyFilters, ...range }
    setFilters(next)
    setApplied(next)
    setPreset('30d')
    setPage(1)
  }

  const applyPreset = (id) => {
    const range = presetRange(id)
    const next = { ...filters, ...range }
    setPreset(id)
    setFilters(next)
    setApplied(next)
    setPage(1)
  }

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

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Hub</p>
            <h1>Activity logs</h1>
            <p className="muted">
              Enable &quot;View activity logs / report&quot; for your role under Power Admin →
              Capabilities.
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
            See what people are doing in this hub — sign-ins, reviews, updates, and more. Use the
            summary cards for a quick overview, then dig into the detailed timeline when you need
            specifics.
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
          onClick={() => {
            setTab('logs')
            setPage(1)
          }}
        >
          <FaHistory aria-hidden /> Activity timeline
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
                placeholder="Name, email, description, or page path…"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              />
            </div>
          </label>
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
              min="1"
              placeholder="Optional"
              value={filters.user_id}
              onChange={(e) => setFilters((f) => ({ ...f, user_id: e.target.value }))}
            />
          </label>
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
            <button type="submit" className="btn">
              Apply filters
            </button>
            <button type="button" className="btn ghost" onClick={resetFilters}>
              Reset
            </button>
          </div>
        </form>
      </div>

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <div className="state">Loading activity…</div>
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
                label="Total events"
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
                <h3>{insights.topAction ? friendlyAction(insights.topAction.action) : '—'}</h3>
                <p className="muted">
                  {insights.topAction
                    ? `${insights.topAction.count} time${insights.topAction.count === 1 ? '' : 's'}`
                    : 'No actions yet'}
                </p>
              </article>
              <article className="activity-insight-card">
                <p className="activity-insight-card__eyebrow">Most active person</p>
                <h3>{insights.topUser?.user_name || insights.topUser?.user_email || '—'}</h3>
                <p className="muted">
                  {insights.topUser
                    ? `${insights.topUser.count} event${insights.topUser.count === 1 ? '' : 's'}${
                        insights.topUser.user_role ? ` · ${insights.topUser.user_role}` : ''
                      }`
                    : 'No users yet'}
                </p>
              </article>
              <article className="activity-insight-card">
                <p className="activity-insight-card__eyebrow">Busiest day</p>
                <h3>{insights.topDay ? formatDayLabel(insights.topDay.date) : '—'}</h3>
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
                    <p className="muted">Who generated the most activity.</p>
                  </div>
                </header>
                <BreakdownList
                  rows={report.by_user || []}
                  total={totalEvents}
                  getKey={(row, idx) => `${row.user_id || 'guest'}-${idx}`}
                  getLabel={(row) =>
                    [row.user_name || 'Guest', row.user_email, row.user_role].filter(Boolean).join(' · ')
                  }
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
      ) : logs.length === 0 ? (
        <div className="empty-state activity-empty">
          <FaHistory aria-hidden />
          <h2>No matching activity</h2>
          <p className="muted">Try clearing filters or widening the date range.</p>
        </div>
      ) : (
        <>
          <div className="activity-feed-meta">
            <p>
              Showing <strong>{logs.length}</strong> of <strong>{meta?.total ?? logs.length}</strong>{' '}
              events {periodLabel}.
            </p>
          </div>

          <div className="activity-feed">
            {logs.map((entry) => {
              const whenRel = relativeWhen(entry.created_at)
              const tone = statusTone(entry.status_code)
              return (
                <article key={entry.id} className="activity-feed-card">
                  <div className="activity-feed-card__avatar" aria-hidden>
                    {initials(entry.user_name, entry.user_email)}
                  </div>
                  <div className="activity-feed-card__body">
                    <div className="activity-feed-card__top">
                      <div>
                        <h3>{friendlyAction(entry.action)}</h3>
                        <p className="activity-feed-card__desc">
                          {entry.description || 'No description provided.'}
                        </p>
                      </div>
                      <div className="activity-feed-card__when">
                        {whenRel ? <span className="activity-feed-card__rel">{whenRel}</span> : null}
                        <span className="muted">{formatWhen(entry.created_at)}</span>
                      </div>
                    </div>
                    <div className="activity-feed-card__meta">
                      <span className="activity-chip">
                        <FaUser aria-hidden />
                        {entry.user_name || 'Guest'}
                        {entry.user_role ? ` · ${entry.user_role}` : ''}
                      </span>
                      {entry.user_email ? <span className="activity-chip muted">{entry.user_email}</span> : null}
                      {entry.method || entry.path ? (
                        <span className="activity-chip activity-chip--mono">
                          {[entry.method, entry.path].filter(Boolean).join(' ')}
                        </span>
                      ) : null}
                      {entry.status_code ? (
                        <span className={`badge ${tone}`}>{entry.status_code}</span>
                      ) : null}
                      <code className="activity-chip activity-chip--code">{entry.action}</code>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {meta && meta.last_page > 1 ? (
            <div className="activity-pagination">
              <button
                type="button"
                className="btn ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="muted">
                Page {meta.current_page} of {meta.last_page}
              </span>
              <button
                type="button"
                className="btn ghost"
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
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
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
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
