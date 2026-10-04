import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaEye, FaHandPointer, FaSync, FaLayerGroup } from 'react-icons/fa'
import api from '../wcApi'
import { useAuth } from '../../context/AuthContext'
import { useHub } from '../../context/HubContext'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../../components/DataGrid'
import WcStatusBadge from '../../components/WebsiteComplianceUI'
import { formatDateTime, complianceStatusChangedAt } from '../../utils/dateFormat'
import { gridActorName } from '../../utils/submissionAttribution'

const PAGE_SIZE = 20

function getRequestSections(req) {
  if (req.section?.name) {
    return { type: 'single', names: [req.section.name] }
  }
  if (Array.isArray(req.section_edits) && req.section_edits.length > 0) {
    return {
      type: 'batch',
      names: req.section_edits.map((e) => e.section_name || 'Section'),
    }
  }
  return { type: 'unknown', names: [] }
}

function getSectionLabel(req) {
  const { type, names } = getRequestSections(req)
  if (type === 'single') return names[0] || '—'
  if (type === 'batch') {
    const preview = names.slice(0, 3).join(', ')
    const extra = names.length > 3 ? ` +${names.length - 3} more` : ''
    return `${preview}${extra}` || '—'
  }
  return '—'
}

function isPickupPool(r) {
  return r.status === 'pending' && !r.approver_id
}

export default function ReviewQueuePanel({ variant = 'active' } = {}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { can, complianceStatusLabel } = useHub()
  const canChangeStatus = can('wc_change_request_status')
  const canViewAll =
    (can('wc_view_all_change_requests') || canChangeStatus) &&
    String(user?.role || '') !== 'approver'

  const [requests, setRequests] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pickingId, setPickingId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setPage(1)
  }, [variant])

  const fetchRequests = useCallback(async (isRefresh = false, pageArg = page) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const params =
        variant === 'active'
          ? { unassigned_only: 1, per_page: PAGE_SIZE, page: pageArg }
          : {
              history_only: 1,
              per_page: PAGE_SIZE,
              page: pageArg,
              ...(canViewAll ? {} : { mine_as_approver: 1 }),
            }
      const res = await api.get('/change-requests', { params })
      setRequests(Array.isArray(res.data) ? res.data : res.data?.data || [])
      setMeta(
        res.meta || {
          current_page: pageArg,
          last_page: 1,
          per_page: PAGE_SIZE,
          total: Array.isArray(res.data) ? res.data.length : 0,
        }
      )
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load requests.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [variant, page, canViewAll])

  useEffect(() => {
    fetchRequests(false, page)
  }, [fetchRequests, page])

  const filteredRequests = useMemo(() => {
    // Server already scopes active/history; keep a light safety filter for active.
    if (variant === 'active') {
      return requests.filter((r) => isPickupPool(r))
    }
    return requests
  }, [requests, variant])

  const handlePick = useCallback(
    async (req) => {
      setPickingId(req.id)
      setError('')
      setMessage('')
      try {
        await api.post(`/change-requests/${req.id}/assign`)
        setRequests((prev) =>
          prev.map((r) =>
            r.id === req.id
              ? {
                  ...r,
                  status: 'pending',
                  approver_id: user.id,
                  approver: user,
                }
              : r
          )
        )
        setMessage('Request picked up. Opening detail…')
        navigate(`/my-dashboard/website-compliance/my-requests/${req.id}`, {
          state: { from: 'history' },
        })
      } catch (err) {
        setError(err.response?.data?.message || 'Could not pick up this request.')
      } finally {
        setPickingId(null)
      }
    },
    [navigate, user]
  )

  const columns = useMemo(
    () => [
      {
        key: 'id',
        label: '#',
        narrow: true,
        render: (row) => <strong>#{row.id}</strong>,
        filterValue: (row) => String(row.id),
        sortValue: (row) => Number(row.id) || 0,
      },
      {
        key: 'section',
        label: 'Section',
        grow: true,
        render: (row) => {
          const { type, names } = getRequestSections(row)
          return (
            <span>
              {getSectionLabel(row)}
              {type === 'batch' ? (
                <span className="muted" style={{ display: 'block', fontSize: 11 }}>
                  <FaLayerGroup style={{ display: 'inline', width: 12, height: 12, marginRight: 4 }} />
                  {names.length} sections
                </span>
              ) : null}
            </span>
          )
        },
        filterValue: (row) => getSectionLabel(row),
        truncate: false,
      },
      {
        key: 'editor',
        label: 'Submitted by',
        render: (row) => gridActorName(row, 'editor'),
        filterValue: (row) => gridActorName(row, 'editor'),
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => (
          <WcStatusBadge status={row.status} label={complianceStatusLabel(row.status)} />
        ),
        filterValue: (row) => complianceStatusLabel(row.status) || row.status || '',
      },
      {
        key: 'status_changed',
        label: 'Status changed',
        date: true,
        render: (row) => <DataGridDate value={complianceStatusChangedAt(row)} />,
        filterValue: (row) => formatDateTime(complianceStatusChangedAt(row), ''),
        sortValue: (row) => {
          const v = complianceStatusChangedAt(row)
          return v ? new Date(v).getTime() : 0
        },
        truncate: false,
      },
      {
        key: 'approver',
        label: 'Approver',
        render: (row) => row.approver?.name || <span className="muted">—</span>,
        filterValue: (row) => row.approver?.name || '',
      },
      {
        key: 'created_at',
        label: 'Submitted',
        date: true,
        render: (row) => <DataGridDate value={row.created_at} />,
        filterValue: (row) => formatDateTime(row.created_at, ''),
        sortValue: (row) => (row.created_at ? new Date(row.created_at).getTime() : 0),
        truncate: false,
      },
      {
        key: 'version',
        label: 'Ver',
        narrow: true,
        render: (row) => (row.current_version ? `v${row.current_version}` : '—'),
        filterValue: (row) => String(row.current_version || ''),
        sortValue: (row) => Number(row.current_version) || 0,
      },
    ],
    [complianceStatusLabel]
  )

  return (
    <div>
      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <div className="filters-row" style={{ justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button
          type="button"
          className="btn ghost"
          onClick={() => fetchRequests(true, page)}
          disabled={refreshing || loading}
        >
          <FaSync aria-hidden style={{ marginRight: 6 }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <DataGrid
        columns={columns}
        rows={filteredRequests}
        loading={loading}
        pageSize={PAGE_SIZE}
        serverPagination={{
          page: meta.current_page || page,
          totalItems: meta.total || 0,
          pageSize: meta.per_page || PAGE_SIZE,
          onPageChange: (next) => setPage(next),
        }}
        emptyMessage={
          variant === 'history'
            ? canViewAll
              ? 'No history yet'
              : 'No reviews assigned to you yet'
            : 'No pending requests available to pick up'
        }
        actionsLabel="Actions"
        actions={(row) => {
          const canPick = variant === 'active' && isPickupPool(row)
          return (
            <>
              <DataGridIconBtn
                as={Link}
                to={`/my-dashboard/website-compliance/my-requests/${row.id}`}
                state={{ from: variant === 'history' ? 'history' : 'review' }}
                icon={FaEye}
                label="Open"
              />
              {canPick ? (
                <DataGridIconBtn
                  icon={FaHandPointer}
                  label={pickingId === row.id ? 'Picking…' : 'Pick it'}
                  variant="primary"
                  disabled={pickingId === row.id}
                  onClick={() => handlePick(row)}
                />
              ) : null}
            </>
          )
        }}
      />
    </div>
  )
}
