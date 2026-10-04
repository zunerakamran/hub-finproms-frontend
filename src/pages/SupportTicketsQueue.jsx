import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEye } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import StStatusBadge from '../components/SupportTicketsUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatDateTime } from '../utils/dateFormat'
import { ST_STATUSES } from '../utils/supportTickets'

export default function SupportTicketsQueue() {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHubId } = useHub()
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('')
  const [appliedStatus, setAppliedStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const asPowerAdmin = isPowerAdmin
  const moduleOn = can('support_tickets')
  const canViewAll = can('st_view_all_tickets')
  const canChangeStatus = can('st_change_ticket_status')
  const enabled = moduleOn && (canViewAll || canChangeStatus)

  useEffect(() => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .supportTicketsAdminList(
        { per_page: 50, status: appliedStatus || undefined },
        { asPowerAdmin }
      )
      .then((data) => {
        if (!cancelled) setItems(data.data || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load tickets.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hubLoading, enabled, appliedStatus, asPowerAdmin, actingHubId])

  const columns = [
    {
      key: 'id',
      label: '#',
      narrow: true,
      render: (row) => <strong>#{row.id}</strong>,
      filterValue: (row) => String(row.id),
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (row) => row.subject || '—',
      filterValue: (row) => row.subject || '',
    },
    {
      key: 'submitter',
      label: 'Submitted by',
      render: (row) => row.submitter?.name || '—',
      filterValue: (row) => row.submitter?.name || '',
    },
    {
      key: 'module',
      label: 'Module',
      fit: true,
      render: (row) => row.module_area_label || row.module_area || '—',
      filterValue: (row) => row.module_area_label || row.module_area || '',
    },
    {
      key: 'priority',
      label: 'Priority',
      fit: true,
      render: (row) => row.priority_label || row.priority || '—',
      filterValue: (row) => row.priority_label || row.priority || '',
    },
    {
      key: 'submitted',
      label: 'Submitted',
      date: true,
      render: (row) => <DataGridDate value={row.created_at} />,
      filterValue: (row) => formatDateTime(row.created_at, ''),
      sortValue: (row) => (row.created_at ? new Date(row.created_at).getTime() : 0),
      truncate: false,
    },
    {
      key: 'status',
      label: 'Status',
      fit: true,
      render: (row) => (
        <StStatusBadge status={row.status} at={row.status_changed_at || row.updated_at} />
      ),
      filterValue: (row) => row.status || '',
      truncate: false,
    },
  ]

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Support Tickets</p>
            <h1>All tickets</h1>
            <p className="muted">
              {!moduleOn
                ? 'Support Tickets functionality is off for this hub.'
                : 'You do not have permission to view the support ticket queue.'}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Support Tickets</p>
          <h1>All tickets</h1>
          <p className="muted">Review reported issues, update status, and leave resolution notes.</p>
        </div>
      </div>

      <form
        className="filters-row"
        onSubmit={(e) => {
          e.preventDefault()
          setAppliedStatus(status)
        }}
        style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}
      >
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {ST_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <div className="actions" style={{ alignSelf: 'end' }}>
          <button type="submit" className="btn">
            Apply
          </button>
        </div>
      </form>

      {error && <div className="alert">{error}</div>}

      <DataGrid
        columns={columns}
        rows={items}
        loading={loading}
        emptyMessage="No support tickets in this queue."
        pageSize={15}
        actions={(row) => (
          <DataGridIconBtn
            icon={FaEye}
            label="Open"
            as={Link}
            to={`/my-dashboard/support-tickets/${row.id}`}
            state={{ from: 'queue' }}
          />
        )}
      />
    </section>
  )
}
