import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEye, FaUserPlus } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import OnBehalfAttribution from '../components/OnBehalfAttribution'
import SmcStatusBadge from '../components/SocialMediaComplianceUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { reviewersForSubmitterFirm } from '../utils/firmAssigneeFilter'

export default function SocialMediaComplianceQueue() {
  const { user, isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, complianceStatusLabel, actingHubId } = useHub()
  const [items, setItems] = useState([])
  const [reviewers, setReviewers] = useState([])
  const [status, setStatus] = useState('')
  const [appliedStatus, setAppliedStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assigning, setAssigning] = useState(null)
  const [message, setMessage] = useState('')

  const asPowerAdmin = isPowerAdmin
  const moduleOn = can('module_social_media_compliance')
  const canAssign = can('smc_assign_requests')
  const canViewAll = can('smc_view_all_requests')
  const canReview = can('smc_review_requests')
  const canChangeStatus = can('smc_change_request_status')
  const canSelfAssign = canReview
  // Full hub list when view-all, assign, or change-status; reviewers without those see assigned + unassigned (pickup).
  const useFullList = canViewAll || canAssign || canChangeStatus
  const enabled = moduleOn && (canViewAll || canAssign || canReview || canChangeStatus)

  useEffect(() => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')

    const params = {
      per_page: 100,
      status: appliedStatus || undefined,
    }

    Promise.all([
      api.socialMediaComplianceAdminRequests(params, {
        asPowerAdmin,
        queueOnly: !useFullList,
      }),
      canAssign ? api.socialMediaComplianceReviewers({ asPowerAdmin }) : Promise.resolve({ data: [] }),
    ])
      .then(([listData, reviewersData]) => {
        if (cancelled) return
        setItems(listData.data || [])
        setReviewers(reviewersData.data || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load queue.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [hubLoading, enabled, appliedStatus, asPowerAdmin, useFullList, canAssign, actingHubId])

  const assign = async (requestId, assignedTo) => {
    setAssigning(requestId)
    setMessage('')
    setError('')
    try {
      const data = await api.socialMediaComplianceAssign(
        requestId,
        assignedTo ? Number(assignedTo) : null,
        { asPowerAdmin }
      )
      setItems((prev) =>
        prev.map((row) => (row.id === requestId ? { ...row, ...data.data } : row))
      )
      setMessage(assignedTo ? 'Assigned.' : 'Unassigned.')
    } catch (err) {
      setError(err.message || 'Assign failed.')
    } finally {
      setAssigning(null)
    }
  }

  const assignToMe = async (requestId) => {
    if (!user?.id) return
    await assign(requestId, user.id)
    setMessage('Assigned to you. You can open and review this request.')
  }

  const columns = [
    {
      key: 'id',
      label: '#',
      narrow: true,
      render: (row) => <strong>{row.id}</strong>,
      filterValue: (row) => String(row.id),
    },
    {
      key: 'submitted_by',
      label: 'Submitted by',
      render: (row) =>
        row.attribution_label || row.on_behalf_by?.name ? (
          <OnBehalfAttribution row={row} ownerKey="submitter" flush />
        ) : (
          row.name
        ),
      filterValue: (row) =>
        [row.attribution_label, row.on_behalf_by?.name, row.name, row.submitter?.name]
          .filter(Boolean)
          .join(' '),
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
      render: (row) => (row.description || '').slice(0, 80),
      filterValue: (row) => row.description || '',
    },
    {
      key: 'image',
      label: 'Image',
      filterable: false,
      render: (row) =>
        row.image_url ? (
          <a href={row.image_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            {/\.(mp4|mov|webm)(\?|$)/i.test(row.image_url) ? (
              <video src={row.image_url} className="smc-thumb-sm" muted />
            ) : (
              <img src={row.image_url} alt="" className="smc-thumb-sm" />
            )}
          </a>
        ) : (
          '—'
        ),
    },
    {
      key: 'status',
      label: 'Status',
      fit: true,
      render: (row) => <SmcStatusBadge status={row.status} />,
      filterValue: (row) => row.status || '',
    },
    {
      key: 'assigned',
      label: 'Assigned',
      render: (row) => row.assignee?.name || <span className="muted">Unassigned</span>,
      filterValue: (row) => row.assignee?.name || 'Unassigned',
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
  ]

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Social Media Compliance</p>
            <h1>All requests</h1>
            <p className="muted">
              {!moduleOn
                ? 'Enable the Social Media Pre Approval module first.'
                : 'You need assign, view-all, or review capability for this queue.'}
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
          <h1>All requests</h1>
          <p className="muted">
            {useFullList
              ? 'All hub requests.'
              : 'Your assigned requests and unassigned requests you can pick up.'}
          </p>
        </div>
      </div>

      <form
        className="filters-row"
        onSubmit={(e) => {
          e.preventDefault()
          setAppliedStatus(status)
        }}
      >
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="Pending">{complianceStatusLabel('Pending')}</option>
          <option value="Approved">{complianceStatusLabel('Approved')}</option>
          <option value="Rejected">{complianceStatusLabel('Rejected')}</option>
          <option value="Approved with Feedback">{complianceStatusLabel('Approved with Feedback')}</option>
        </select>
        <button className="btn primary" type="submit">
          Filter
        </button>
      </form>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <DataGrid
        columns={columns}
        rows={items}
        loading={loading}
        emptyMessage="No requests in this queue."
        pageSize={10}
        actionsLabel="Actions"
        actions={(row) => (
          <>
            <DataGridIconBtn
              icon={FaEye}
              label="Review"
              as={Link}
              to={`/my-dashboard/social-media-compliance/${row.id}`}
              state={{ from: 'queue' }}
            />
            {canAssign ? (
              <select
                key={`${row.id}-${row.assigned_to || ''}`}
                className="data-grid__inline-select"
                defaultValue={row.assigned_to || ''}
                disabled={assigning === row.id}
                onChange={(e) => assign(row.id, e.target.value)}
                aria-label="Assign reviewer"
                title="Assign reviewer"
              >
                <option value="">— Unassigned —</option>
                {reviewersForSubmitterFirm(reviewers, row.submitter?.firm).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.firm?.name ? ` (${r.firm.name})` : ''}
                  </option>
                ))}
              </select>
            ) : null}
            {canSelfAssign && !canAssign ? (
              !row.assigned_to ? (
                <DataGridIconBtn
                  icon={FaUserPlus}
                  label={assigning === row.id ? 'Assigning…' : 'Assign to me'}
                  disabled={assigning === row.id}
                  onClick={() => assignToMe(row.id)}
                />
              ) : Number(row.assigned_to) === Number(user?.id) ? (
                <span className="muted">You</span>
              ) : (
                <span className="muted">—</span>
              )
            ) : null}
          </>
        )}
      />
    </section>
  )
}
