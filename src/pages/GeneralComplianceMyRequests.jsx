import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import GcStatusBadge from '../components/GeneralComplianceUI'
import { useHub } from '../context/HubContext'
import { formatGcDate } from '../utils/generalCompliance'

export default function GeneralComplianceMyRequests() {
  const { can, loading: hubLoading, effectiveAdvisorId } = useHub()
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
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
      .generalComplianceMine({ per_page: 20, page })
      .then((data) => {
        if (cancelled) return
        setItems(data.data || [])
        setMeta(data.meta || null)
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
  }, [hubLoading, moduleOn, canView, page, effectiveAdvisorId])

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">General Compliance</p>
            <h1>My requests</h1>
            <p className="muted">
              General Compliance is not enabled for this hub. Ask Power Admin to turn on the module
              under Functionalities → Modules.
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
      {loading ? (
        <div className="state">Loading...</div>
      ) : items.length === 0 ? (
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
        <div className="gc-list">
          {items.map((row) => (
            <Link
              key={row.id}
              to={`/my-dashboard/general-compliance/${row.id}`}
              state={{ from: 'mine' }}
              className="gc-list-item"
            >
              <div>
                <strong>#{row.id}</strong>
                <span className="muted"> v{row.current_version}</span>
                <p>{row.description?.slice(0, 100) || 'General compliance request'}</p>
                <small className="muted">
                  {formatGcDate(row.submission_date)}
                  {row.attachments?.length
                    ? ` · ${row.attachments.length} attachment${row.attachments.length === 1 ? '' : 's'}`
                    : ''}
                </small>
              </div>
              <GcStatusBadge status={row.status} />
            </Link>
          ))}
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
