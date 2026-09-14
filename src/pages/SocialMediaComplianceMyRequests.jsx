import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import SmcStatusBadge from '../components/SocialMediaComplianceUI'
import { useHub } from '../context/HubContext'
import { formatSmcDate } from '../utils/socialMediaCompliance'

export default function SocialMediaComplianceMyRequests() {
  const { can, loading: hubLoading } = useHub()
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const moduleOn = can('module_social_media_compliance')
  const canSubmit = can('smc_submit_request')
  const canView = can('smc_view_own_requests') || canSubmit
  const highlightPost = searchParams.get('post_id')

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
  }, [hubLoading, moduleOn, canView, page])

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Social Media Compliance</p>
            <h1>My requests</h1>
            <p className="muted">
              Social Media Compliance is not enabled for this hub. Ask Power Admin to turn on the
              module under Functionalities → Modules.
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
          <Link
            className="btn primary"
            to={
              highlightPost
                ? `/my-dashboard/social-media-compliance/new?post_id=${highlightPost}`
                : '/my-dashboard/social-media-compliance/new'
            }
          >
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
              Open a <Link to="/my-dashboard/purchases">purchased post</Link> and send it for social media compliance, or start a{' '}
              <Link to="/my-dashboard/social-media-compliance/new">new request</Link>.
            </>
          )}
        </p>
      ) : (
        <div className="smc-list">
          {items.map((row) => (
            <Link
              key={row.id}
              to={`/my-dashboard/social-media-compliance/${row.id}`}
              className="smc-list-item"
            >
              <div>
                <strong>#{row.id}</strong>
                <span className="muted"> v{row.current_version}</span>
                <p>{row.post?.title || row.description?.slice(0, 100) || 'Social media compliance request'}</p>
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
