import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEye } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import TaxStatusBadge from '../components/TaxonomyAddRequestsUI'
import { useHub } from '../context/HubContext'
import { formatDateTime } from '../utils/dateFormat'

export default function TaxonomyAddRequestsMy() {
  const { can, loading: hubLoading, effectiveAdvisorId } = useHub()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const canRequest = can('taxonomy_request_add')

  useEffect(() => {
    if (hubLoading || !canRequest) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .taxonomyAddRequestsMine({ per_page: 50 })
      .then((data) => {
        if (!cancelled) setItems(data.data || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load requests.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hubLoading, canRequest, effectiveAdvisorId])

  const columns = [
    {
      key: 'id',
      label: '#',
      narrow: true,
      render: (row) => <strong>#{row.id}</strong>,
      filterValue: (row) => String(row.id),
    },
    {
      key: 'target',
      label: 'What to add',
      render: (row) => row.target_label || row.target || '—',
      filterValue: (row) => row.target_label || row.target || '',
    },
    {
      key: 'proposed_name',
      label: 'Proposed name',
      render: (row) => row.proposed_name || '—',
      filterValue: (row) => row.proposed_name || '',
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
        <TaxStatusBadge status={row.status} at={row.reviewed_at || row.updated_at} />
      ),
      filterValue: (row) => row.status || '',
      truncate: false,
    },
  ]

  if (!hubLoading && !canRequest) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Taxonomy requests</p>
            <h1>My requests</h1>
            <p className="muted">
              You do not have permission to request new types, categories, or tags.
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
          <p className="eyebrow">Taxonomy requests</p>
          <h1>My requests</h1>
          <p className="muted">
            Track requests to add a post/reel type, category, tag, GC content type, or firm document
            category.
          </p>
        </div>
        <Link className="btn primary" to="/my-dashboard/taxonomy-add-requests/new">
          New request
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {!loading && items.length === 0 ? (
        <p className="muted">
          No taxonomy requests yet.{' '}
          <Link to="/my-dashboard/taxonomy-add-requests/new">Submit a request</Link>.
        </p>
      ) : (
        <DataGrid
          columns={columns}
          rows={items}
          loading={loading}
          emptyMessage="No taxonomy requests yet."
          pageSize={10}
          actions={(row) => (
            <DataGridIconBtn
              icon={FaEye}
              label="Open"
              as={Link}
              to={`/my-dashboard/taxonomy-add-requests/${row.id}`}
              state={{ from: 'mine' }}
            />
          )}
        />
      )}
    </section>
  )
}
