import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEye } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import GcStatusBadge from '../components/GeneralComplianceUI'
import OnBehalfAttribution from '../components/OnBehalfAttribution'
import { useHub } from '../context/HubContext'

export default function GeneralComplianceMyRequests() {
  const { can, loading: hubLoading, effectiveAdvisorId } = useHub()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const moduleOn = can('module_general_compliance')
  const canSubmit = can('gc_submit_request')
  const canView = can('gc_view_own_requests') || canSubmit

  useEffect(() => {
    if (hubLoading || !moduleOn || !canView) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .generalComplianceMine({ per_page: 100 })
      .then((data) => {
        if (cancelled) return
        setItems(data.data || [])
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
      key: 'version',
      label: 'Ver',
      narrow: true,
      render: (row) => `v${row.current_version}`,
      filterValue: (row) => String(row.current_version ?? ''),
    },
    {
      key: 'description',
      label: 'Description',
      grow: true,
      render: (row) => (
        <>
          <div>{row.description?.slice(0, 100) || 'General compliance request'}</div>
          <OnBehalfAttribution row={row} ownerKey="submitter" />
          {row.attachments?.length ? (
            <small className="muted">
              {row.attachments.length} attachment{row.attachments.length === 1 ? '' : 's'}
            </small>
          ) : null}
        </>
      ),
      filterValue: (row) =>
        [row.description, row.attribution_label, row.on_behalf_by?.name].filter(Boolean).join(' '),
      truncate: false,
    },
    {
      key: 'submitted',
      label: 'Submitted',
      date: true,
      render: (row) => <DataGridDate value={row.submission_date} />,
      filterValue: (row) =>
        row.submission_date ? new Date(row.submission_date).toLocaleString() : '',
      sortValue: (row) =>
        row.submission_date ? new Date(row.submission_date).getTime() : 0,
      truncate: false,
    },
    {
      key: 'status',
      label: 'Status',
      fit: true,
      render: (row) => <GcStatusBadge status={row.status} />,
      filterValue: (row) => row.status || '',
    },
  ]

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">General Compliance</p>
            <h1>My requests</h1>
            <p className="muted">
              Generic Content Pre Approval is not enabled for this hub. Ask Power Admin to enable it
              under Modules.
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
          <p className="eyebrow">General Compliance</p>
          <h1>My requests</h1>
          <p className="muted">Track submissions, feedback, attachments, and version history.</p>
        </div>
        {canSubmit && (
          <Link className="btn primary" to="/my-dashboard/general-compliance/new">
            Add new request
          </Link>
        )}
      </div>

      {error && <div className="alert">{error}</div>}
      {!loading && items.length === 0 ? (
        <p className="muted">
          No general compliance requests yet.
          {canSubmit && (
            <>
              {' '}
              Start a <Link to="/my-dashboard/general-compliance/new">new request</Link>.
            </>
          )}
        </p>
      ) : (
        <DataGrid
          columns={columns}
          rows={items}
          loading={loading}
          emptyMessage="No general compliance requests yet."
          pageSize={10}
          actions={(row) => (
            <DataGridIconBtn
              icon={FaEye}
              label="Open"
              as={Link}
              to={`/my-dashboard/general-compliance/${row.id}`}
              state={{ from: 'mine' }}
            />
          )}
        />
      )}
    </section>
  )
}
