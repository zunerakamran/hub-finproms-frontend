import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaGlobe, FaRocket, FaSync } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import DataGrid, { DataGridDate } from '../components/DataGrid'
import WcStatusBadge from '../components/WebsiteComplianceUI'
import { formatDateTime } from '../utils/dateFormat'
import {
  websiteModuleOffMessage,
  websiteTemplateLibraryOn,
} from '../utils/websiteCompliance'
import api from '../websiteCompliance/wcApi'
import { canRequestGoLive } from '../websiteCompliance/utils/deploymentStatus'

export default function WebsiteComplianceGoLive() {
  const { user } = useAuth()
  const { can, loading: hubLoading, complianceStatusLabel, roleLabel } = useHub()
  const templateModuleOn = websiteTemplateLibraryOn(can)
  const canAccess =
    can('wc_request_deployments') || can('wc_assign_website_templates')

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!canAccess) {
      setLoading(false)
      return
    }
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const res = await api.get('/template-requests')
      setRequests(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load deployments.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [canAccess])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const myStagingRequests = useMemo(() => {
    const uid = user?.id
    return requests.filter((row) => canRequestGoLive(row, uid))
  }, [requests, user?.id])

  const awaitingPromotion = useMemo(() => {
    const uid = Number(user?.id)
    return requests.filter(
      (row) =>
        String(row.status || '').toLowerCase() === 'ready_for_live' &&
        Number(row.requested_by_id) === uid
    )
  }, [requests, user?.id])

  const handleRequestGoLive = async (row) => {
    setBusyId(row.id)
    setMessage('')
    setError('')
    try {
      const res = await api.post(`/template-requests/${row.id}/request-go-live`)
      setMessage(res.data?.message || 'Go-live requested successfully.')
      setRequests((prev) =>
        prev.map((r) => (r.id === row.id ? (res.data?.template_request || { ...r, status: 'ready_for_live' }) : r))
      )
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request go-live.')
    } finally {
      setBusyId(null)
    }
  }

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
        key: 'domain_name',
        label: 'Intended live domain',
        grow: true,
        render: (row) => row.domain_name || '—',
        filterValue: (row) => row.domain_name || '',
      },
      {
        key: 'staging',
        label: 'Staging URL',
        render: (row) => row.staging_domain || row.cpanel_domain || '—',
        filterValue: (row) => row.staging_domain || row.cpanel_domain || '',
      },
      {
        key: 'template_name',
        label: 'Template',
        render: (row) => row.template_name || '—',
        filterValue: (row) => row.template_name || '',
      },
      {
        key: 'status',
        label: 'Status',
        fit: true,
        render: (row) => (
          <WcStatusBadge status={row.status} at={row.go_live_requested_at || row.updated_at} />
        ),
        filterValue: (row) => complianceStatusLabel(row.status) || row.status || '',
        truncate: false,
      },
      {
        key: 'updated_at',
        label: 'Updated',
        date: true,
        render: (row) => <DataGridDate value={row.updated_at} />,
        filterValue: (row) => formatDateTime(row.updated_at, ''),
        sortValue: (row) => (row.updated_at ? new Date(row.updated_at).getTime() : 0),
        truncate: false,
      },
    ],
    [complianceStatusLabel]
  )

  if (!hubLoading && !templateModuleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Template Library</p>
            <h1>Ready for live</h1>
            <p className="muted">{websiteModuleOffMessage({ templateLibrary: true })}</p>
          </div>
        </div>
      </section>
    )
  }

  if (!hubLoading && !canAccess) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Template Library</p>
            <h1>Ready for live</h1>
            <p className="muted">You do not have permission to request go-live for deployments.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Website Template Library</p>
          <h1>Ready for live</h1>
          <p className="muted">
            When your staging site is complete, request Power Admin ({roleLabel('power_admin')}) to
            shift it to the main/live URL. Only the original requester can do this.
          </p>
        </div>
        <div className="page-head__actions">
          <Link className="btn ghost" to="/my-dashboard/website-compliance/my-sites">
            My sites
          </Link>
          <button
            type="button"
            className="btn ghost"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
          >
            <FaSync aria-hidden style={{ marginRight: 6 }} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      {awaitingPromotion.length > 0 ? (
        <div className="alert" style={{ marginBottom: '1rem' }}>
          {awaitingPromotion.length} site{awaitingPromotion.length === 1 ? '' : 's'} waiting for
          Power Admin to promote to the live URL.
        </div>
      ) : null}

      <DataGrid
        columns={columns}
        rows={[...myStagingRequests, ...awaitingPromotion]}
        loading={loading}
        pageSize={10}
        emptyMessage="No staging sites are ready for a go-live request. Deploy to staging first, finish compliance work, then return here."
        actionsLabel="Actions"
        actions={(row) => {
          if (String(row.status || '').toLowerCase() === 'ready_for_live') {
            return <span className="muted">Awaiting promote</span>
          }
          return (
            <button
              type="button"
              className="btn primary"
              style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem', minHeight: 0 }}
              disabled={busyId === row.id}
              onClick={() => handleRequestGoLive(row)}
            >
              <FaRocket aria-hidden style={{ marginRight: 6 }} />
              {busyId === row.id ? 'Submitting…' : 'Ready for live'}
            </button>
          )
        }}
      />

      <p className="muted" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <FaGlobe aria-hidden style={{ marginRight: 6, display: 'relative', top: 1 }} />
        Staging sites stay on their temporary URL until Power Admin promotes them. Compliance keeps
        working after go-live on the main domain.
      </p>
    </section>
  )
}
