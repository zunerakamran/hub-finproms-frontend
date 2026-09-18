import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api/client'
import WcStatusBadge, { WcVersionCard } from '../components/WebsiteComplianceUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatWcDate, wcSectionTitle } from '../utils/websiteCompliance'

export default function WebsiteComplianceRequestDetail() {
  const { id } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const { can, loading: hubLoading } = useHub()

  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const moduleOn = can('module_website_compliance')
  const canSubmit = can('wc_submit_change_requests') || can('wc_edit_sections')
  const canViewAll = can('wc_view_all_change_requests')
  const canReview = can('wc_review_change_requests')

  const backFrom = location.state?.from
  const backTo =
    backFrom === 'queue' || backFrom === 'review'
      ? '/my-dashboard/website-compliance/review'
      : backFrom === 'history'
        ? '/my-dashboard/website-compliance/history'
        : '/my-dashboard/website-compliance/my-requests'
  const backLabel =
    backTo.endsWith('/review')
      ? '← Back to review queue'
      : backTo.endsWith('/history')
        ? '← Back to history'
        : '← Back to my requests'

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.websiteComplianceShowChangeRequest(id)
      setRow(data?.change_request || data)
    } catch (err) {
      setError(err.message || 'Failed to load request.')
      setRow(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading || !moduleOn) {
      setLoading(false)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, hubLoading, moduleOn])

  const isOwner = row && user && Number(row.editor_id) === Number(user.id)

  const confirmFeedback = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.websiteComplianceConfirmChangeRequestFeedback(id, {})
      setRow(data?.change_request || data)
      setMessage('Request confirmed as Approved.')
    } catch (err) {
      setError(err.message || err.data?.message || 'Confirm failed.')
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <p className="muted">Website Compliance module is off for this hub.</p>
      </section>
    )
  }

  if (loading) return <div className="state">Loading...</div>
  if (error && !row) {
    return (
      <section>
        <Link to={backTo} className="back">
          {backLabel}
        </Link>
        <div className="alert">{error}</div>
      </section>
    )
  }
  if (!row) return null

  const versions = [...(row.versions || [])].sort(
    (a, b) => Number(b.version_number || 0) - Number(a.version_number || 0)
  )
  const editorPath = `/my-dashboard/website-compliance/content-editor`

  return (
    <section>
      <Link to={backTo} className="back">
        {backLabel}
      </Link>

      <div className="page-head">
        <div>
          <p className="eyebrow">Website Compliance</p>
          <h1>
            Request #{row.id} <WcStatusBadge status={row.status} />
          </h1>
          <p className="muted">
            Submitted by {row.editor?.name || 'Advisor'} · {formatWcDate(row.created_at)}
            {wcSectionTitle(row) ? ` · ${wcSectionTitle(row)}` : ''}
            <span> · v{row.current_version || 1}</span>
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {row.approver ? (
        <p className="wc-banner">
          Assigned to <strong>{row.approver.name}</strong>
        </p>
      ) : (
        <div className="wc-banner wc-banner--warn">Not assigned to a reviewer yet.</div>
      )}

      <div className="wc-versions">
        {versions.length === 0 ? (
          <p className="muted">No versions recorded for this request yet.</p>
        ) : (
          versions.map((ver) => (
            <WcVersionCard
              key={ver.id || ver.version_number}
              version={ver}
              isLatest={Number(ver.version_number) === Number(row.current_version || 1)}
            />
          ))
        )}
      </div>

      {isOwner && canSubmit && row.status === 'rejected' && (
        <div className="admin-form wc-panel">
          <h2>Rejected — resubmit</h2>
          {row.rejection_reason && <p className="wc-feedback">{row.rejection_reason}</p>}
          <p className="muted">
            Only sections from the previous version can be edited. Open the content editor to revise those
            sections and resubmit.
          </p>
          <div className="actions">
            <Link className="btn primary" to={editorPath}>
              Open content editor to resubmit
            </Link>
          </div>
        </div>
      )}

      {isOwner && canSubmit && row.status === 'approved_with_feedback' && (
        <div className="admin-form wc-panel">
          <h2>Approved with feedback</h2>
          <p className="muted">
            Confirm as approved without changes, or open the content editor to revise only the previous
            version&apos;s sections and publish.
          </p>
          {row.feedback && <p className="wc-feedback">{row.feedback}</p>}
          <div className="actions">
            <button type="button" className="btn primary" disabled={saving} onClick={confirmFeedback}>
              {saving ? 'Publishing…' : 'Confirm approved'}
            </button>
            <Link className="btn ghost" to={editorPath}>
              Edit sections &amp; publish
            </Link>
          </div>
        </div>
      )}

      {!isOwner && (canViewAll || canReview) && (
        <p className="muted" style={{ marginTop: '1rem' }}>
          Review actions for this request are available in the{' '}
          <Link to="/my-dashboard/website-compliance/review">review queue</Link>.
        </p>
      )}
    </section>
  )
}
