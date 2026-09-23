import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import ActingAdvisorBanner from '../components/ActingAdvisorBanner'
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
  const canView =
    can('wc_submit_change_requests') ||
    can('wc_edit_sections') ||
    can('wc_publish_live_content')
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

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>My requests</h1>
            <p className="muted">
              Website Compliance is not enabled for this hub. Ask Power Admin to enable Website Compliance
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
      {loading ? (
        <div className="state">Loading...</div>
      ) : sorted.length === 0 ? (
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
        <div className="wc-list">
          {sorted.map((row) => (
            <Link
              key={row.id}
              to={`/my-dashboard/website-compliance/my-requests/${row.id}`}
              state={{ from: 'mine' }}
              className={`wc-list-item${highlightId === row.id ? ' is-highlight' : ''}`}
            >
              <div>
                <strong>#{row.id}</strong>
                <span className="muted"> v{row.current_version || 1}</span>
                <p>{wcSectionTitle(row)}</p>
                <OnBehalfAttribution row={row} ownerKey="editor" />
                <small className="muted">
                  {formatWcDate(row.created_at)}
                  {row.approver?.name ? ` · Reviewer: ${row.approver.name}` : ''}
                </small>
              </div>
              <WcStatusBadge status={row.status} />
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
