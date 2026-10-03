import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaGlobe, FaPaperPlane, FaRocket, FaSync } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import DataGrid, { DataGridDate } from '../components/DataGrid'
import RequiredMark from '../components/RequiredMark'
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
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [selectedId, setSelectedId] = useState('')
  const [liveDomain, setLiveDomain] = useState('')
  const [notes, setNotes] = useState('')

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

  const submittedGoLiveRequests = useMemo(() => {
    const uid = Number(user?.id)
    return requests.filter(
      (row) =>
        String(row.status || '').toLowerCase() === 'ready_for_live' &&
        Number(row.requested_by_id) === uid
    )
  }, [requests, user?.id])

  useEffect(() => {
    if (!selectedId && myStagingRequests[0]) {
      setSelectedId(String(myStagingRequests[0].id))
      setLiveDomain(myStagingRequests[0].domain_name || '')
      return
    }
    const stillValid = myStagingRequests.some((r) => String(r.id) === String(selectedId))
    if (selectedId && !stillValid) {
      const next = myStagingRequests[0]
      setSelectedId(next ? String(next.id) : '')
      setLiveDomain(next?.domain_name || '')
    }
  }, [myStagingRequests, selectedId])

  const selectedStaging = useMemo(
    () => myStagingRequests.find((r) => String(r.id) === String(selectedId)) || null,
    [myStagingRequests, selectedId]
  )

  const handleSelectStaging = (id) => {
    setSelectedId(id)
    const row = myStagingRequests.find((r) => String(r.id) === String(id))
    setLiveDomain(row?.domain_name || '')
  }

  const handleSubmitGoLive = async (e) => {
    e.preventDefault()
    if (!selectedStaging) {
      setError('Select a staging website to request go-live for.')
      return
    }
    if (!liveDomain.trim()) {
      setError('Main/live domain is required.')
      return
    }
    setSubmitting(true)
    setMessage('')
    setError('')
    try {
      const res = await api.post(`/template-requests/${selectedStaging.id}/request-go-live`, {
        domain_name: liveDomain.trim(),
        notes: notes.trim() || undefined,
      })
      setMessage(
        res.data?.message ||
          'Go-live request submitted. Power Admin will see it as a new request and deploy it to the main URL.'
      )
      setNotes('')
      setSelectedId('')
      setLiveDomain('')
      await fetchData(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit go-live request.')
    } finally {
      setSubmitting(false)
    }
  }

  const historyColumns = useMemo(
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
        label: 'Requested live domain',
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
        key: 'go_live_requested_at',
        label: 'Submitted',
        date: true,
        render: (row) => <DataGridDate value={row.go_live_requested_at || row.updated_at} />,
        filterValue: (row) => formatDateTime(row.go_live_requested_at || row.updated_at, ''),
        sortValue: (row) => {
          const value = row.go_live_requested_at || row.updated_at
          return value ? new Date(value).getTime() : 0
        },
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
            <h1>Request go-live</h1>
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
            <h1>Request go-live</h1>
            <p className="muted">You do not have permission to submit go-live requests.</p>
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
          <h1>Request go-live</h1>
          <p className="muted">
            When your staging website is complete, submit a go-live request. {roleLabel('power_admin')}{' '}
            will see it as a new request and deploy it to your main URL.
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

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Submit go-live request</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Only the original requester can submit this. Choose a staging site, confirm the main domain,
          then submit.
        </p>

        {loading ? (
          <p className="muted">Loading staging sites…</p>
        ) : myStagingRequests.length === 0 ? (
          <div className="alert" style={{ marginBottom: 0 }}>
            No staging sites are available to request go-live for. Ask Power Admin to deploy to a
            temporary URL first, finish compliance work, then return here.
          </div>
        ) : (
          <form onSubmit={handleSubmitGoLive} className="form-grid" style={{ gap: '1rem' }}>
            <label>
              <RequiredMark>Staging website</RequiredMark>
              <select
                value={selectedId}
                onChange={(e) => handleSelectStaging(e.target.value)}
                required
              >
                {myStagingRequests.map((row) => (
                  <option key={row.id} value={row.id}>
                    #{row.id} · {row.domain_name || 'No live domain yet'}
                    {row.staging_domain || row.cpanel_domain
                      ? ` (staging: ${row.staging_domain || row.cpanel_domain})`
                      : ''}
                  </option>
                ))}
              </select>
            </label>

            {selectedStaging ? (
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                <FaGlobe aria-hidden style={{ marginRight: 6 }} />
                Currently on staging:{' '}
                <strong>{selectedStaging.staging_domain || selectedStaging.cpanel_domain || '—'}</strong>
                {' · '}
                Template: <strong>{selectedStaging.template_name || '—'}</strong>
              </div>
            ) : null}

            <label>
              <RequiredMark>Main / live domain</RequiredMark>
              <input
                type="text"
                value={liveDomain}
                onChange={(e) => setLiveDomain(e.target.value)}
                placeholder="e.g. www.advisorfirm.com"
                required
              />
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                This is the public URL Power Admin will deploy to when they process your request.
              </span>
            </label>

            <label>
              Notes for Power Admin <span className="muted">(optional)</span>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any launch notes, DNS readiness, or special instructions…"
                maxLength={5000}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="submit" className="btn primary" disabled={submitting || !selectedStaging}>
                <FaPaperPlane aria-hidden style={{ marginRight: 6 }} />
                {submitting ? 'Submitting…' : 'Submit go-live request'}
              </button>
            </div>
          </form>
        )}
      </div>

      <h2 style={{ marginBottom: '0.5rem' }}>
        <FaRocket aria-hidden style={{ marginRight: 8 }} />
        Your submitted go-live requests
      </h2>
      <DataGrid
        columns={historyColumns}
        rows={submittedGoLiveRequests}
        loading={loading}
        pageSize={10}
        emptyMessage="No go-live requests submitted yet."
      />
    </section>
  )
}
