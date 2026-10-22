import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEye, FaHandPointer, FaUserPlus } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import GcStatusBadge from '../components/GeneralComplianceUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import {
  actorIsConflicted,
  apiValidationMessage,
  assignableReviewers,
} from '../utils/complianceSeparation'
import { formatDateTime, complianceStatusChangedAt } from '../utils/dateFormat'
import { gridActorName } from '../utils/submissionAttribution'
import { resolveComplianceAttachments } from '../utils/complianceSupportingFiles'

/**
 * @param {{ variant?: 'review' | 'history' }} props
 */
export default function GeneralComplianceQueue({ variant = 'history' }) {
  const isReview = variant === 'review'
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
  const moduleOn = can('module_general_compliance')
  const canAssign = can('gc_assign_requests')
  const canViewAll = can('gc_view_all_requests')
  const canReview = can('gc_review_requests')
  const canChangeStatus = can('gc_change_request_status')
  const canSelfAssign = canReview
  const seesHubWideHistory = canViewAll || canAssign || canChangeStatus
  const enabled = moduleOn && (canViewAll || canAssign || canReview || canChangeStatus)
  const reviewEnabled = moduleOn && (canReview || canAssign)

  useEffect(() => {
    const pageEnabled = isReview ? reviewEnabled : enabled
    if (hubLoading || !pageEnabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')

    const params = {
      per_page: 50,
      status: appliedStatus || undefined,
      ...(isReview
        ? { unassigned_only: 1 }
        : {
            history_only: 1,
            ...(seesHubWideHistory ? {} : { mine_as_approver: 1 }),
          }),
    }

    Promise.all([
      api.generalComplianceAdminRequests(params, {
        asPowerAdmin,
        queueOnly: !seesHubWideHistory && isReview,
      }),
      canAssign && isReview
        ? api.generalComplianceReviewers({ asPowerAdmin })
        : Promise.resolve({ data: [] }),
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
  }, [
    hubLoading,
    enabled,
    reviewEnabled,
    appliedStatus,
    asPowerAdmin,
    canAssign,
    actingHubId,
    isReview,
    seesHubWideHistory,
  ])

  const assign = async (requestId, assignedTo) => {
    setAssigning(requestId)
    setMessage('')
    setError('')
    try {
      const data = await api.generalComplianceAssign(
        requestId,
        assignedTo ? Number(assignedTo) : null,
        { asPowerAdmin }
      )
      if (isReview) {
        setItems((prev) => prev.filter((row) => row.id !== requestId))
      } else {
        setItems((prev) =>
          prev.map((row) => (row.id === requestId ? { ...row, ...data.data } : row))
        )
      }
      setMessage(assignedTo ? 'Assigned.' : 'Unassigned.')
    } catch (err) {
      setError(apiValidationMessage(err, 'Assign failed.'))
    } finally {
      setAssigning(null)
    }
  }

  const pickIt = async (requestId) => {
    if (!user?.id) return
    const row = items.find((r) => Number(r.id) === Number(requestId))
    if (row && actorIsConflicted(user.id, row)) {
      setError(
        'You cannot pick up this request — you submitted it (or submitted it on behalf).'
      )
      return
    }
    await assign(requestId, user.id)
    setMessage('Picked up. You can open and review this request.')
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
      render: (row) => gridActorName(row, 'submitter'),
      filterValue: (row) => gridActorName(row, 'submitter'),
    },
    {
      key: 'firm',
      label: 'Firm',
      render: (row) => row.submitter?.firm?.name || '-',
      filterValue: (row) => row.submitter?.firm?.name || '',
    },
    {
      key: 'version',
      label: 'Ver',
      narrow: true,
      render: (row) => `v${row.current_version}`,
      filterValue: (row) => String(row.current_version ?? ''),
    },
    {
      key: 'content_type',
      label: 'Content type',
      fit: true,
      render: (row) => row.content_type || '-',
      filterValue: (row) => row.content_type || '',
    },
    {
      key: 'files',
      label: 'Attachments',
      render: (row) => {
        const count = resolveComplianceAttachments(row).length
        return count ? <span className="muted">{count} file(s)</span> : '-'
      },
      filterValue: (row) => String(resolveComplianceAttachments(row).length),
    },
    {
      key: 'status',
      label: 'Status',
      fit: true,
      render: (row) => (
        <GcStatusBadge status={row.status} at={complianceStatusChangedAt(row)} />
      ),
      filterValue: (row) => complianceStatusLabel(row.status) || row.status || '',
      truncate: false,
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
      filterValue: (row) => formatDateTime(row.submission_date, ''),
      sortValue: (row) =>
        row.submission_date ? new Date(row.submission_date).getTime() : 0,
      truncate: false,
    },
  ]

  const title = isReview ? 'Requests queue' : 'All requests'
  const subtitle = isReview
    ? 'New unassigned requests you can pick up for review.'
    : seesHubWideHistory
      ? 'Assigned and reviewed requests for this hub.'
      : 'Requests assigned to you (your review history).'
  const fromState = isReview ? 'review' : 'history'
  const pageEnabled = isReview ? reviewEnabled : enabled

  if (!hubLoading && !pageEnabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">General Compliance</p>
            <h1>{title}</h1>
            <p className="muted">
              {!moduleOn
                ? 'Enable the Generic Content Pre Approval module first.'
                : isReview
                  ? 'You need review or assign capability for this queue.'
                  : 'You need assign, view-all, or review capability for this list.'}
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
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
        </div>
      </div>

      {!isReview ? (
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
            <option value="Approved with Feedback">
              {complianceStatusLabel('Approved with Feedback')}
            </option>
            <option value="Rejected">{complianceStatusLabel('Rejected')}</option>
          </select>
          <button className="btn primary" type="submit">
            Filter
          </button>
        </form>
      ) : null}

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <DataGrid
        columns={columns}
        rows={items}
        loading={loading}
        emptyMessage={
          isReview ? 'No unassigned requests available to pick up.' : 'No requests in history yet.'
        }
        pageSize={10}
        actionsLabel="Actions"
        actions={(row) => {
          const conflicted = actorIsConflicted(user?.id, row)
          return (
            <>
              <DataGridIconBtn
                icon={FaEye}
                label="Open"
                as={Link}
                to={`/my-dashboard/general-compliance/${row.id}`}
                state={{ from: fromState }}
              />
              {isReview && canAssign ? (
                <select
                  key={`${row.id}-${row.assigned_to || ''}`}
                  className="data-grid__inline-select"
                  defaultValue=""
                  disabled={assigning === row.id}
                  onChange={(e) => {
                    const value = e.target.value
                    if (!value) return
                    assign(row.id, value)
                  }}
                  aria-label="Assign reviewer"
                  title="Assign reviewer"
                >
                  <option value="">Assign…</option>
                  {assignableReviewers(reviewers, row, row.submitter?.firm).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                      {r.firm?.name ? ` (${r.firm.name})` : ''}
                    </option>
                  ))}
                </select>
              ) : null}
              {isReview && canSelfAssign && !conflicted ? (
                <DataGridIconBtn
                  icon={FaHandPointer}
                  label={assigning === row.id ? 'Picking…' : 'Pick it'}
                  variant="primary"
                  disabled={assigning === row.id}
                  onClick={() => pickIt(row.id)}
                />
              ) : null}
              {!isReview && canSelfAssign && !row.assigned_to && !canAssign && !conflicted ? (
                <DataGridIconBtn
                  icon={FaUserPlus}
                  label={assigning === row.id ? 'Assigning…' : 'Assign to me'}
                  disabled={assigning === row.id}
                  onClick={() => pickIt(row.id)}
                />
              ) : null}
            </>
          )
        }}
      />
    </section>
  )
}
