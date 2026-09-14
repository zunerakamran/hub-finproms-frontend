import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import SmcStatusBadge from '../components/SocialMediaComplianceUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatSmcDate } from '../utils/socialMediaCompliance'

export default function SocialMediaComplianceQueue() {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [reviewers, setReviewers] = useState([])
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [applied, setApplied] = useState({ status: '', q: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assigning, setAssigning] = useState(null)
  const [message, setMessage] = useState('')

  const asPowerAdmin = isPowerAdmin
  const moduleOn = can('module_social_media_compliance')
  const canAssign = can('smc_assign_requests')
  const canViewAll = can('smc_view_all_requests')
  const canReview = can('smc_review_requests')
  // Full hub list when view-all or assign; reviewers without those only see assigned queue.
  const useFullList = canViewAll || canAssign
  const enabled = moduleOn && (canViewAll || canAssign || canReview)

  useEffect(() => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')

    const params = {
      per_page: 25,
      page,
      status: applied.status || undefined,
      q: applied.q || undefined,
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
        setMeta(listData.meta || null)
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
  }, [hubLoading, enabled, page, applied, asPowerAdmin, useFullList, canAssign])

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

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Social Media Compliance</p>
            <h1>All requests</h1>
            <p className="muted">
              {!moduleOn
                ? 'Enable the Social Media Compliance module first.'
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
            {useFullList ? 'All hub requests.' : 'Requests assigned to you.'}
          </p>
        </div>
      </div>

      <form
        className="filters-row"
        onSubmit={(e) => {
          e.preventDefault()
          setPage(1)
          setApplied({ status, q })
        }}
      >
        <input
          type="search"
          placeholder="Search name / description…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Approved with Feedback">Approved with Feedback</option>
        </select>
        <button className="btn primary" type="submit">
          Filter
        </button>
      </form>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {loading ? (
        <div className="state">Loading...</div>
      ) : items.length === 0 ? (
        <p className="muted">No requests in this queue.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Submitted by</th>
                <th>Ver</th>
                <th>Description</th>
                <th>Image</th>
                <th>Status</th>
                <th>Assigned</th>
                {canAssign && <th>Assign</th>}
                <th>Submitted</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.id}</strong>
                  </td>
                  <td>{row.name}</td>
                  <td>v{row.current_version}</td>
                  <td>{(row.description || '').slice(0, 80)}</td>
                  <td>
                    {row.image_url ? (
                      <a href={row.image_url} target="_blank" rel="noreferrer">
                        <img src={row.image_url} alt="" className="smc-thumb-sm" />
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <SmcStatusBadge status={row.status} />
                  </td>
                  <td>{row.assignee?.name || <span className="muted">Unassigned</span>}</td>
                  {canAssign && (
                    <td>
                      <select
                        defaultValue={row.assigned_to || ''}
                        disabled={assigning === row.id}
                        onChange={(e) => assign(row.id, e.target.value)}
                      >
                        <option value="">— Unassigned —</option>
                        {reviewers.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td>{formatSmcDate(row.submission_date)}</td>
                  <td>
                    <Link className="btn ghost" to={`/my-dashboard/social-media-compliance/${row.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <div className="actions" style={{ marginTop: 16 }}>
          <button
            className="btn ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="muted">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <button
            className="btn ghost"
            disabled={page >= meta.last_page}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  )
}
