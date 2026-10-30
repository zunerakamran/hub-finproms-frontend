import { useEffect, useState } from 'react'
import { api } from '../api/client'
import DataGrid, { DataGridDate } from '../components/DataGrid'
import { useHub } from '../context/HubContext'

const STATUSES = [
  { value: '', label: 'Active (open + acknowledged)' },
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'ignored', label: 'Ignored' },
  { value: 'all', label: 'All' },
]

function statusBadge(status) {
  const s = String(status || 'open').toLowerCase()
  let cls = 'gc-status gc-status--pending'
  if (s === 'resolved') cls = 'gc-status gc-status--ok'
  else if (s === 'ignored') cls = 'gc-status gc-status--awf'
  else if (s === 'acknowledged') cls = 'gc-status gc-status--pending'
  return <span className={cls}>{s}</span>
}

export default function SupportTicketsSystemErrors() {
  const { can, loading: hubLoading, actingHubId } = useHub()
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [q, setQ] = useState('')
  const [applied, setApplied] = useState({ status: '', source: '', q: '' })
  const [openCount, setOpenCount] = useState(0)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [staffNote, setStaffNote] = useState('')

  const moduleOn = can('support_tickets')
  const enabled = moduleOn && can('st_view_system_errors')

  useEffect(() => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')

    const params = {
      per_page: 50,
      source: applied.source || undefined,
      q: applied.q || undefined,
      status: applied.status === '' ? 'active' : applied.status,
    }

    api
      .systemErrorsList(params)
      .then((data) => {
        if (cancelled) return
        setItems(data.data || [])
        setOpenCount(data.meta?.open_count ?? 0)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load system errors.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [hubLoading, enabled, applied, actingHubId])

  const openDetail = async (row) => {
    setSelected(row)
    setStaffNote(row.staff_note || '')
    try {
      const data = await api.systemErrorsShow(row.id)
      setSelected(data.data || row)
      setStaffNote(data.data?.staff_note || '')
    } catch {
      // keep list row
    }
  }

  const setStatusOnSelected = async (nextStatus) => {
    if (!selected?.id) return
    setBusy(true)
    setError('')
    try {
      const data = await api.systemErrorsUpdateStatus(selected.id, {
        status: nextStatus,
        staff_note: staffNote || undefined,
      })
      setSelected(data.data)
      setApplied((prev) => ({ ...prev }))
    } catch (err) {
      setError(err.message || 'Failed to update status.')
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    {
      key: 'id',
      label: '#',
      narrow: true,
      render: (row) => <strong>#{row.id}</strong>,
    },
    {
      key: 'message',
      label: 'Error',
      render: (row) => (
        <div>
          <div>{row.message}</div>
          {row.exception_class ? <div className="muted">{row.exception_class}</div> : null}
        </div>
      ),
      filterValue: (row) => `${row.message || ''} ${row.exception_class || ''}`,
      truncate: false,
    },
    {
      key: 'source',
      label: 'Source',
      fit: true,
      render: (row) => row.source || '-',
    },
    {
      key: 'count',
      label: 'Count',
      narrow: true,
      render: (row) => row.occurrence_count ?? 1,
    },
    {
      key: 'status',
      label: 'Status',
      fit: true,
      render: (row) => statusBadge(row.status),
    },
    {
      key: 'last_seen',
      label: 'Last seen',
      render: (row) => <DataGridDate value={row.last_seen_at} />,
    },
    {
      key: 'actions',
      label: '',
      narrow: true,
      render: (row) => (
        <button type="button" className="btn ghost" onClick={() => openDetail(row)}>
          View
        </button>
      ),
    },
  ]

  if (hubLoading) {
    return <div className="page-card muted">Loading…</div>
  }

  if (!enabled) {
    return (
      <div className="page-card">
        <p className="eyebrow">Support Tickets</p>
        <h1>System errors</h1>
        <p className="muted">
          {!moduleOn
            ? 'Support Tickets functionality is off for this hub.'
            : 'You do not have permission to view automatic system errors.'}
        </p>
      </div>
    )
  }

  return (
    <div className="page-card">
      <p className="eyebrow">Support Tickets</p>
      <h1>System errors</h1>
      <p className="muted">
        Bugs and crashes the system captured automatically — even when nobody filed a ticket.
        {openCount > 0 ? ` ${openCount} active.` : ''}
      </p>

      {error ? <div className="alert">{error}</div> : null}

      <div className="report-filters report-filters--compact">
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s.value || 'active'} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Source
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All</option>
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
          </select>
        </label>
        <label>
          Search
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Message, class, URL…" />
        </label>
        <button
          type="button"
          className="btn primary"
          onClick={() => setApplied({ status, source, q: q.trim() })}
        >
          Apply
        </button>
      </div>

      <DataGrid columns={columns} rows={items} loading={loading} emptyLabel="No system errors logged yet." />

      {selected ? (
        <div className="st-system-error-detail" role="dialog" aria-label="System error detail">
          <div className="st-system-error-detail__panel">
            <header>
              <strong>Error #{selected.id}</strong>
              <button type="button" className="btn ghost" onClick={() => setSelected(null)}>
                Close
              </button>
            </header>
            <p>{selected.message}</p>
            <dl className="st-system-error-detail__meta">
              <div>
                <dt>Status</dt>
                <dd>{statusBadge(selected.status)}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{selected.source}</dd>
              </div>
              <div>
                <dt>Occurrences</dt>
                <dd>{selected.occurrence_count}</dd>
              </div>
              <div>
                <dt>Page / route</dt>
                <dd>{selected.page_url || selected.route || '—'}</dd>
              </div>
              <div>
                <dt>User</dt>
                <dd>
                  {selected.user
                    ? `${selected.user.name || '—'} ${selected.user.email ? `(${selected.user.email})` : ''}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Last seen</dt>
                <dd>
                  <DataGridDate value={selected.last_seen_at} />
                </dd>
              </div>
            </dl>
            {selected.stack_trace ? (
              <pre className="st-system-error-detail__stack">{selected.stack_trace}</pre>
            ) : null}
            <label>
              Staff note
              <textarea
                rows={3}
                value={staffNote}
                onChange={(e) => setStaffNote(e.target.value)}
                disabled={busy}
              />
            </label>
            <div className="st-system-error-detail__actions">
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                onClick={() => setStatusOnSelected('acknowledged')}
              >
                Acknowledge
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                onClick={() => setStatusOnSelected('resolved')}
              >
                Resolve
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                onClick={() => setStatusOnSelected('ignored')}
              >
                Ignore
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                onClick={() => setStatusOnSelected('open')}
              >
                Reopen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
