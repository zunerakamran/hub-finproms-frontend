import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FaEye } from 'react-icons/fa'
import { api } from '../api/client'
import ActingAdvisorBanner from '../components/ActingAdvisorBanner'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import WcStatusBadge from '../components/WebsiteComplianceUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatDateTime, complianceStatusChangedAt } from '../utils/dateFormat'
import { gridActorName } from '../utils/submissionAttribution'
import { wcSectionTitle } from '../utils/websiteCompliance'

export default function WebsiteComplianceMyRequests() {
  const { user } = useAuth()
  const { can, loading: hubLoading, effectiveAdvisorId, actingAdvisor } = useHub()
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const moduleOn = can('module_website_compliance')
  const canSubmit = can('wc_submit_change_requests') || can('wc_edit_sections')
  const canView = canSubmit
  const highlightId = Number(searchParams.get('highlight') || 0) || null
  const ownerId = effectiveAdvisorId ?? user?.id

  useEffect(() => {
    if (hubLoading || !moduleOn || !canView) {
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .websiteComplianceChangeRequests()
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        // Admin-staff acting as an advisor: editor_id is the advisor; also include
        // anything they submitted on behalf of that advisor.
        const mine = list.filter((cr) => {
          const editorId = Number(cr.editor_id)
          return (
            editorId === Number(ownerId) ||
            editorId === Number(user?.id) ||
            Number(cr.on_behalf_by_user_id) === Number(user?.id)
          )
        })
        setItems(mine)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load change requests.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hubLoading, moduleOn, canView, user?.id, ownerId, effectiveAdvisorId])

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
      ),
    [items]
  )

  const columns = [
    {
      key: 'id',
      label: '#',
      narrow: true,
      render: (row) => (
        <strong className={highlightId === row.id ? 'is-highlight' : undefined}>#{row.id}</strong>
      ),
      filterValue: (row) => String(row.id),
      sortValue: (row) => Number(row.id) || 0,
    },
    {
      key: 'version',
      label: 'Ver',
      narrow: true,
      render: (row) => `v${row.current_version || 1}`,
      filterValue: (row) => String(row.current_version || 1),
      sortValue: (row) => Number(row.current_version) || 1,
    },
    {
      key: 'section',
      label: 'Section',
      grow: true,
      render: (row) => wcSectionTitle(row),
      filterValue: (row) => wcSectionTitle(row),
    },
    {
      key: 'submitted_by',
      label: 'Submitted by',
      render: (row) => gridActorName(row, 'editor'),
      filterValue: (row) => gridActorName(row, 'editor'),
    },
    {
      key: 'firm',
      label: 'Firm',
      render: (row) => row.editor?.firm?.name || '—',
      filterValue: (row) => row.editor?.firm?.name || '',
    },
    {
      key: 'approver',
      label: 'Approver',
      render: (row) => row.approver?.name || <span className="muted">—</span>,
      filterValue: (row) => row.approver?.name || '',
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
        <WcStatusBadge status={row.status} at={complianceStatusChangedAt(row)} />
      ),
      filterValue: (row) =>
        [row.status, formatDateTime(complianceStatusChangedAt(row), '')].filter(Boolean).join(' '),
      truncate: false,
    },
  ]

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Content Pre Approval</p>
            <h1>My requests</h1>
            <p className="muted">
              Website Content Pre Approval is not enabled for this hub. Ask Power Admin to enable it
              under Modules.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (!hubLoading && !canView) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Content Pre Approval</p>
            <h1>My requests</h1>
            <p className="muted">You do not have permission to view your website change requests.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Website Content Pre Approval</p>
          <h1>My requests</h1>
          <p className="muted">
            {actingAdvisor
              ? `Change request history for ${actingAdvisor.name}.`
              : 'Track submissions, feedback, and version history.'}
          </p>
          <ActingAdvisorBanner action="requests" />
        </div>
        {canSubmit && (
          <Link className="btn primary" to="/my-dashboard/website-compliance/content-editor">
            Add new request
          </Link>
        )}
      </div>

      {error && <div className="alert">{error}</div>}
      {!loading && sorted.length === 0 ? (
        <p className="muted">
          No Website Content Pre Approval requests yet.
          {canSubmit && (
            <>
              {' '}
              Edit a section in the{' '}
              <Link to="/my-dashboard/website-compliance/content-editor">content editor</Link> to create one.
            </>
          )}
        </p>
      ) : (
        <DataGrid
          columns={columns}
          rows={sorted}
          loading={loading}
          emptyMessage="No Website Content Pre Approval requests yet."
          pageSize={10}
          actions={(row) => (
            <DataGridIconBtn
              icon={FaEye}
              label="Open"
              as={Link}
              to={`/my-dashboard/website-compliance/my-requests/${row.id}`}
              state={{ from: 'mine' }}
            />
          )}
        />
      )}
    </section>
  )
}
