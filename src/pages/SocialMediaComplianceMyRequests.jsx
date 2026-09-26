import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEye } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import OnBehalfAttribution from '../components/OnBehalfAttribution'
import SmcStatusBadge from '../components/SocialMediaComplianceUI'
import { useHub } from '../context/HubContext'

export default function SocialMediaComplianceMyRequests() {
  const { can, loading: hubLoading, effectiveAdvisorId } = useHub()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const moduleOn = can('module_social_media_compliance')
  const canSubmit = can('smc_submit_request')
  const canView = can('smc_view_own_requests') || canSubmit

  useEffect(() => {
    if (hubLoading || !moduleOn || !canView) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .socialMediaComplianceMine({ per_page: 100 })
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
          <div>
            {row.description?.slice(0, 100) || row.post?.title || 'Social media compliance request'}
          </div>
          <OnBehalfAttribution row={row} ownerKey="submitter" />
        </>
      ),
      filterValue: (row) =>
        [row.description, row.post?.title, row.attribution_label, row.on_behalf_by?.name]
          .filter(Boolean)
          .join(' '),
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
      render: (row) => <SmcStatusBadge status={row.status} />,
      filterValue: (row) => row.status || '',
    },
  ]

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Social Media Compliance</p>
            <h1>My requests</h1>
            <p className="muted">
              Social Media Pre Approval is not enabled for this hub. Ask Power Admin to enable it under
              Modules.
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
          <p className="eyebrow">Social Media Compliance</p>
          <h1>My requests</h1>
          <p className="muted">Track submissions, feedback, and version history.</p>
        </div>
        {canSubmit && (
          <Link className="btn primary" to="/my-dashboard/social-media-compliance/new">
            Add new request
          </Link>
        )}
      </div>

      {error && <div className="alert">{error}</div>}
      {!loading && items.length === 0 ? (
        <p className="muted">
          No social media compliance requests yet.
          {canSubmit && (
            <>
              {' '}
              <Link to="/my-dashboard/social-media-compliance/new">Submit a new request</Link> with an
              image or video.
            </>
          )}
        </p>
      ) : (
        <DataGrid
          columns={columns}
          rows={items}
          loading={loading}
          emptyMessage="No social media compliance requests yet."
          pageSize={10}
          actions={(row) => (
            <DataGridIconBtn
              icon={FaEye}
              label="Open"
              as={Link}
              to={`/my-dashboard/social-media-compliance/${row.id}`}
              state={{ from: 'mine' }}
            />
          )}
        />
      )}
    </section>
  )
}
