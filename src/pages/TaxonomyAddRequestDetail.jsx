import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api/client'
import DateTimeText from '../components/DateTimeText'
import TaxStatusBadge from '../components/TaxonomyAddRequestsUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { TAX_REVIEW_ANY, canReviewTaxTarget } from '../utils/taxonomyAddRequests'

export default function TaxonomyAddRequestDetail() {
  const { id } = useParams()
  const location = useLocation()
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, effectiveAdvisorId } = useHub()

  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [reviewNote, setReviewNote] = useState('')

  const canRequest = can('taxonomy_request_add')
  const canReviewAny = TAX_REVIEW_ANY.some((cap) => can(cap))
  const asPowerAdmin = isPowerAdmin

  const backFrom = location.state?.from
  const backTo =
    backFrom === 'queue'
      ? '/my-dashboard/taxonomy-add-requests/queue'
      : backFrom === 'mine' || backFrom === 'submit'
        ? '/my-dashboard/taxonomy-add-requests'
        : canReviewAny
          ? '/my-dashboard/taxonomy-add-requests/queue'
          : '/my-dashboard/taxonomy-add-requests'
  const backLabel = backTo.endsWith('/queue') ? '← Back to queue' : '← Back to my requests'

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      let data
      if (canReviewAny) {
        try {
          data = await api.taxonomyAddRequestsAdminShow(id, { asPowerAdmin })
        } catch {
          data = await api.taxonomyAddRequestsShow(id)
        }
      } else {
        data = await api.taxonomyAddRequestsShow(id)
      }
      setRow(data.data)
      setReviewNote('')
    } catch (err) {
      setError(err.message || 'Failed to load request.')
      setRow(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading || (!canRequest && !canReviewAny)) {
      setLoading(false)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, hubLoading, canRequest, canReviewAny, effectiveAdvisorId])

  const canReviewThis = row ? canReviewTaxTarget(can, row.target) : false
  const isPending = row?.status === 'Pending'

  const approve = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.taxonomyAddRequestsApprove(
        id,
        { review_note: reviewNote.trim() || undefined },
        { asPowerAdmin }
      )
      setRow(data.data)
      setMessage(data.message || 'Request marked as approved.')
      setReviewNote('')
    } catch (err) {
      setError(err.message || 'Could not approve request.')
    } finally {
      setSaving(false)
    }
  }

  const reject = async (event) => {
    event.preventDefault()
    if (!reviewNote.trim()) {
      setError('A review note is required when rejecting.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.taxonomyAddRequestsReject(
        id,
        { review_note: reviewNote.trim() },
        { asPowerAdmin }
      )
      setRow(data.data)
      setMessage(data.message || 'Request rejected.')
      setReviewNote('')
    } catch (err) {
      setError(err.message || 'Could not reject request.')
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && !canRequest && !canReviewAny) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Taxonomy requests</p>
            <h1>Request</h1>
            <p className="muted">You do not have permission to view this request.</p>
          </div>
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section>
        <p className="muted">Loading request…</p>
      </section>
    )
  }

  if (!row) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Taxonomy requests</p>
            <h1>Request</h1>
            {error && <div className="alert">{error}</div>}
          </div>
          <Link to={backTo} className="btn ghost">
            {backLabel}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Taxonomy requests</p>
          <h1>
            Request #{row.id}: {row.proposed_name}
          </h1>
          <p className="muted">
            <TaxStatusBadge status={row.status} at={row.reviewed_at || row.updated_at} />
            {' · '}
            {row.target_label || row.target}
          </p>
        </div>
        <Link to={backTo} className="btn ghost">
          {backLabel}
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="card stack" style={{ gap: '0.75rem', padding: '1rem 1.25rem' }}>
        <div>
          <strong>What to add</strong>
          <div>{row.target_label || row.target}</div>
        </div>
        <div>
          <strong>Proposed name</strong>
          <div>{row.proposed_name}</div>
        </div>
        <div>
          <strong>Remarks</strong>
          <div style={{ whiteSpace: 'pre-wrap' }}>{row.remarks || '—'}</div>
        </div>
        <div>
          <strong>Requested by</strong>
          <div>
            {row.submitter?.name || '—'}
            {row.submitter?.email ? ` (${row.submitter.email})` : ''}
          </div>
        </div>
        <div>
          <strong>Submitted</strong>
          <div>
            <DateTimeText value={row.created_at} />
          </div>
        </div>
        {row.reviewed_by_user && (
          <div>
            <strong>Reviewed by</strong>
            <div>
              {row.reviewed_by_user.name}
              {row.reviewed_at ? (
                <>
                  {' · '}
                  <DateTimeText value={row.reviewed_at} />
                </>
              ) : null}
            </div>
          </div>
        )}
        {row.review_note && (
          <div>
            <strong>Review note</strong>
            <div style={{ whiteSpace: 'pre-wrap' }}>{row.review_note}</div>
          </div>
        )}
        {row.created_entity_id != null && (
          <div>
            <strong>Created option ID</strong>
            <div>#{row.created_entity_id}</div>
          </div>
        )}
      </div>

      {canReviewThis && isPending && (
        <form className="admin-form" style={{ marginTop: '1.25rem' }} onSubmit={(e) => e.preventDefault()}>
          <h2 style={{ margin: '0 0 0.5rem' }}>Review</h2>
          <p className="muted">
            Create the option manually first (Categories / Tags / GC content types / firm document
            categories), then mark Approved. Reject requires a note for the requester.
          </p>
          <label>
            Review note {isPending ? <span className="muted">(required to reject)</span> : null}
            <textarea
              rows={4}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Optional on approve; required on reject…"
              maxLength={5000}
            />
          </label>
          <div className="actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn primary" disabled={saving} onClick={approve}>
              {saving ? 'Working…' : 'Mark approved'}
            </button>
            <button type="button" className="btn danger" disabled={saving} onClick={reject}>
              Reject
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
