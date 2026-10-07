import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEye } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import TaxStatusBadge from '../components/TaxonomyAddRequestsUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatDateTime } from '../utils/dateFormat'
import { TAX_REVIEW_ANY, TAX_STATUSES } from '../utils/taxonomyAddRequests'

export default function TaxonomyAddRequestsQueue() {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHubId } = useHub()
  const [items, setItems] = useState([])
  const [targets, setTargets] = useState([])
  const [status, setStatus] = useState('Pending')
  const [target, setTarget] = useState('')
  const [appliedStatus, setAppliedStatus] = useState('Pending')
  const [appliedTarget, setAppliedTarget] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const asPowerAdmin = isPowerAdmin
  const enabled = TAX_REVIEW_ANY.some((cap) => can(cap))

  useEffect(() => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .taxonomyAddRequestsAdminList(
        {
          per_page: 50,
          status: appliedStatus || undefined,
          target: appliedTarget || undefined,
        },
        { asPowerAdmin }
      )
      .then((data) => {
        if (cancelled) return
        setItems(data.data || [])
        setTargets(data.options?.targets || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load taxonomy requests.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hubLoading, enabled, appliedStatus, appliedTarget, asPowerAdmin, actingHubId])

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
      key: 'submitter',
      label: 'Requested by',
      render: (row) => row.submitter?.name || '—',
      filterValue: (row) => row.submitter?.name || '',
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

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Taxonomy requests</p>
            <h1>Review queue</h1>
            <p className="muted">
              You need a Manage capability for types, categories, tags, GC content types, or firm
              document categories to review these requests.
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
          <h1>Review queue</h1>
          <p className="muted">
            Approve to create the option automatically, or reject with a note.
          </p>
        </div>
      </div>

      <form
        className="filters-row"
        onSubmit={(e) => {
          e.preventDefault()
          setAppliedStatus(status)
          setAppliedTarget(target)
        }}
        style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}
      >
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {TAX_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">All types</option>
            {targets.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
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
        emptyMessage="No taxonomy requests in this queue."
        pageSize={15}
        actions={(row) => (
          <DataGridIconBtn
            icon={FaEye}
            label="Open"
            as={Link}
            to={`/my-dashboard/taxonomy-add-requests/${row.id}`}
            state={{ from: 'queue' }}
          />
        )}
      />
    </section>
  )
}
