import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

function formatWhen(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

const emptyFilters = {
  q: '',
  action: '',
  user_id: '',
  from: '',
  to: '',
}

export default function AdminActivityLogs({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const [tab, setTab] = useState('report')
  const [filters, setFilters] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [report, setReport] = useState(null)
  const [logs, setLogs] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_view_activity_logs')
  const eyebrow = asPowerAdmin ? 'Power Admin' : 'Client Admin'
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
    setApplied({ ...filters })
  }

  const resetFilters = () => {
    setFilters(emptyFilters)
    setApplied(emptyFilters)
    setPage(1)
  }

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
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

  const summary = report?.summary

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>Activity logs</h1>
          <p className="muted">
            Audit trail of user activity on this hub. Who can open this screen is controlled by the
            Capabilities matrix.
          </p>
        </div>
      </div>

      <div className="admin-subnav" style={{ marginBottom: '1rem' }} role="tablist">
        <button
          type="button"
          className={tab === 'report' ? 'btn' : 'btn ghost'}
          onClick={() => setTab('report')}
        >
          Report
        </button>
        <button
          type="button"
          className={tab === 'logs' ? 'btn' : 'btn ghost'}
          onClick={() => {
            setTab('logs')
            setPage(1)
          }}
        >
          Log feed
        </button>
      </div>

      <form className="admin-filter-bar" onSubmit={applyFilters} style={{ marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder="Search description, email, path…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
        <input
          type="text"
          placeholder="Action (e.g. auth.login)"
          value={filters.action}
          onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
        />
        <input
          type="number"
          min="1"
          placeholder="User ID"
          value={filters.user_id}
          onChange={(e) => setFilters((f) => ({ ...f, user_id: e.target.value }))}
        />
        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          aria-label="From date"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          aria-label="To date"
        />
        <button type="submit" className="btn">
          Apply
        </button>
        <button type="button" className="btn ghost" onClick={resetFilters}>
          Reset
        </button>
      </form>

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <div className="state">Loading...</div>
      ) : tab === 'report' ? (
        !report ? (
          <div className="empty-state">
            <p className="muted">No report data.</p>
          </div>
        ) : (
          <div className="activity-report">
            <div className="admin-dashboard-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-dashboard-card">
                <h2>Total events</h2>
                <p style={{ fontSize: '1.75rem', margin: 0 }}>{summary?.total ?? 0}</p>
              </div>
              <div className="admin-dashboard-card">
                <h2>Unique users</h2>
                <p style={{ fontSize: '1.75rem', margin: 0 }}>{summary?.unique_users ?? 0}</p>
              </div>
              <div className="admin-dashboard-card">
                <h2>Unique actions</h2>
                <p style={{ fontSize: '1.75rem', margin: 0 }}>{summary?.unique_actions ?? 0}</p>
              </div>
            </div>

            <div className="admin-dashboard-grid">
              <div className="admin-dashboard-card">
                <h2>By action</h2>
                {(report.by_action || []).length === 0 ? (
                  <p className="muted">No activity yet.</p>
                ) : (
                  <ul className="activity-stat-list">
                    {report.by_action.map((row) => (
                      <li key={row.action}>
                        <code>{row.action}</code>
                        <strong>{row.count}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="admin-dashboard-card">
                <h2>By user</h2>
                {(report.by_user || []).length === 0 ? (
                  <p className="muted">No activity yet.</p>
                ) : (
                  <ul className="activity-stat-list">
                    {report.by_user.map((row, idx) => (
                      <li key={`${row.user_id || 'guest'}-${idx}`}>
                        <span>
                          {row.user_name || 'Guest'}
                          {row.user_email ? (
                            <span className="muted"> · {row.user_email}</span>
                          ) : null}
                          {row.user_role ? (
                            <span className="muted"> · {row.user_role}</span>
                          ) : null}
                        </span>
                        <strong>{row.count}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="admin-dashboard-card">
                <h2>By day</h2>
                {(report.by_day || []).length === 0 ? (
                  <p className="muted">No activity yet.</p>
                ) : (
                  <ul className="activity-stat-list">
                    {report.by_day.map((row) => (
                      <li key={row.date}>
                        <span>{row.date}</span>
                        <strong>{row.count}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <p className="muted">No activity log entries match these filters.</p>
        </div>
      ) : (
        <>
          <div className="invoice-list">
            {logs.map((entry) => (
              <div key={entry.id} className="invoice-row">
                <div>
                  <strong>
                    <code>{entry.action}</code>
                  </strong>
                  <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                    {entry.description || '—'}
                  </p>
                  <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                    {entry.user_name || 'Guest'}
                    {entry.user_email ? ` · ${entry.user_email}` : ''}
                    {entry.user_role ? ` · ${entry.user_role}` : ''}
                    {entry.method ? ` · ${entry.method}` : ''}
                    {entry.path ? ` ${entry.path}` : ''}
                  </p>
                </div>
                <div className="invoice-row-meta">
                  {entry.status_code ? <span className="badge">{entry.status_code}</span> : null}
                  <span className="muted">{formatWhen(entry.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
          {meta && meta.last_page > 1 ? (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="muted">
                Page {meta.current_page} of {meta.last_page} ({meta.total} total)
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
        .activity-stat-list {
          list-style: none;
          padding: 0;
          margin: 0.75rem 0 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .activity-stat-list li {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: baseline;
          font-size: 0.9rem;
        }
        .admin-filter-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }
        .admin-filter-bar input {
          min-width: 9rem;
        }
      `}</style>
    </section>
  )
}
