import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import OnBehalfAttribution from '../components/OnBehalfAttribution'
import SmcStatusBadge from '../components/SocialMediaComplianceUI'
import { useHub } from '../context/HubContext'
import { formatSmcDate } from '../utils/socialMediaCompliance'

export default function SocialMediaComplianceMyRequests() {
  const { can, loading: hubLoading, effectiveAdvisorId } = useHub()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
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
      .socialMediaComplianceMine({ per_page: 20, page })
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
      {loading ? (
        <div className="state">Loading...</div>
      ) : items.length === 0 ? (
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
        <div className="smc-list">
          {items.map((row) => (
            <Link
              key={row.id}
              to={`/my-dashboard/social-media-compliance/${row.id}`}
              state={{ from: 'mine' }}
              className="smc-list-item"
            >
              <div>
                <strong>#{row.id}</strong>
                <span className="muted"> v{row.current_version}</span>
                <p>{row.description?.slice(0, 100) || row.post?.title || 'Social media compliance request'}</p>
                <OnBehalfAttribution row={row} ownerKey="submitter" />
                <small className="muted">{formatSmcDate(row.submission_date)}</small>
              </div>
              <SmcStatusBadge status={row.status} />
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
