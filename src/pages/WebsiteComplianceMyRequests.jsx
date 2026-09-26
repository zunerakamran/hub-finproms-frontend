import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import ActingAdvisorBanner from '../components/ActingAdvisorBanner'
import DataGrid from '../components/DataGrid'
import OnBehalfAttribution from '../components/OnBehalfAttribution'
import WcStatusBadge from '../components/WebsiteComplianceUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatWcDate, wcSectionTitle } from '../utils/websiteCompliance'

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
      width: '8%',
      minWidth: 64,
      render: (row) => (
        <strong className={highlightId === row.id ? 'is-highlight' : undefined}>#{row.id}</strong>
      ),
      filterValue: (row) => String(row.id),
      sortValue: (row) => Number(row.id) || 0,
    },
    {
      key: 'version',
      label: 'Version',
      width: '10%',
      minWidth: 80,
      render: (row) => `v${row.current_version || 1}`,
      filterValue: (row) => String(row.current_version || 1),
      sortValue: (row) => Number(row.current_version) || 1,
    },
    {
      key: 'description',
      label: 'Description',
      width: '34%',
      minWidth: 180,
      render: (row) => (
        <>
          <div>{wcSectionTitle(row)}</div>
          <OnBehalfAttribution row={row} ownerKey="editor" />
        </>
      ),
      filterValue: (row) =>
        [wcSectionTitle(row), row.attribution_label, row.on_behalf_by?.name].filter(Boolean).join(' '),
    },
    {
      key: 'submitted',
      label: 'Submitted',
      width: '28%',
      minWidth: 160,
      render: (row) => (
        <>
          {formatWcDate(row.created_at)}
          {row.approver?.name ? (
            <small className="muted"> · Reviewer: {row.approver.name}</small>
          ) : null}
        </>
      ),
      filterValue: (row) =>
        [formatWcDate(row.created_at), row.approver?.name].filter(Boolean).join(' '),
      sortValue: (row) => (row.created_at ? new Date(row.created_at).getTime() : 0),
    },
    {
      key: 'status',
      label: 'Status',
      width: '20%',
      minWidth: 120,
      render: (row) => <WcStatusBadge status={row.status} />,
      filterValue: (row) => row.status || '',
    },
  ]

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
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
            <p className="eyebrow">Website Compliance</p>
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
          <p className="eyebrow">Website Compliance</p>
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
          No website compliance requests yet.
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
          emptyMessage="No website compliance requests yet."
          pageSize={10}
          rowLink={(row) => `/my-dashboard/website-compliance/my-requests/${row.id}`}
          rowLinkState={{ from: 'mine' }}
        />
      )}
    </section>
  )
}
