import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEye } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import StStatusBadge from '../components/SupportTicketsUI'
import { useHub } from '../context/HubContext'
import { formatDateTime } from '../utils/dateFormat'

export default function SupportTicketsMyTickets() {
  const { can, loading: hubLoading, effectiveAdvisorId } = useHub()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const moduleOn = can('support_tickets')
  const canSubmit = can('st_submit_ticket')
  const canView = can('st_view_own_tickets') || canSubmit

  useEffect(() => {
    if (hubLoading || !moduleOn || !canView) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .supportTicketsMine({ per_page: 100 })
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
  }, [hubLoading, moduleOn, canView, effectiveAdvisorId])

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
      key: 'module',
      label: 'Module',
      fit: true,
      render: (row) => row.module_area_label || row.module_area || '—',
      filterValue: (row) => row.module_area_label || row.module_area || '',
    },
    {
      key: 'category',
      label: 'Category',
      fit: true,
      render: (row) => row.category_label || row.category || '—',
      filterValue: (row) => row.category_label || row.category || '',
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

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Support Tickets</p>
            <h1>My tickets</h1>
            <p className="muted">
              Support Tickets is not enabled for this hub. Ask Power Admin to enable it under
              Functionalities.
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
          <h1>My tickets</h1>
          <p className="muted">Track issues you reported and their status updates.</p>
        </div>
        {canSubmit && (
          <Link className="btn primary" to="/my-dashboard/support-tickets/new">
            New ticket
          </Link>
        )}
      </div>

      {error && <div className="alert">{error}</div>}
      {!loading && items.length === 0 ? (
        <p className="muted">
          No support tickets yet.
          {canSubmit && (
            <>
              {' '}
              Start a <Link to="/my-dashboard/support-tickets/new">new ticket</Link>.
            </>
          )}
        </p>
      ) : (
        <DataGrid
          columns={columns}
          rows={items}
          loading={loading}
          emptyMessage="No support tickets yet."
          pageSize={10}
          actions={(row) => (
            <DataGridIconBtn
              icon={FaEye}
              label="Open"
              as={Link}
              to={`/my-dashboard/support-tickets/${row.id}`}
              state={{ from: 'mine' }}
            />
          )}
        />
      )}
    </section>
  )
}
