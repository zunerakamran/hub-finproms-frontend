import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api/client'
import GcStatusBadge, { GcVersionCard, GcAttachmentList } from '../components/GeneralComplianceUI'
import ComplianceAuditTrail from '../components/ComplianceAuditTrail'
import SupportingFilesPicker from '../components/SupportingFilesPicker'
import DateTimeText from '../components/DateTimeText'
import RequiredMark from '../components/RequiredMark'
import RichTextDisplay from '../components/RichTextDisplay'
import RichTextEditor, { isRichTextEmpty } from '../components/RichTextEditor'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { GC_STATUSES, gcStatusClass } from '../utils/generalCompliance'
import {
  appendComplianceAttachments,
  appendSupportingFiles,
  compliancePostBody,
  resolveComplianceAttachments,
} from '../utils/complianceSupportingFiles'
import ComplianceStatusText from '../components/ComplianceStatusText'

export default function GeneralComplianceRequestDetail() {
  const { id } = useParams()
  const location = useLocation()
  const { user, isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, complianceStatusLabel, effectiveAdvisorId, roleLabel } = useHub()

  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const [reviewStatus, setReviewStatus] = useState('Pending')
  const [feedback, setFeedback] = useState('')
  const [futureFeedback, setFutureFeedback] = useState('')
  const [resubDescription, setResubDescription] = useState('')
  const [resubContentType, setResubContentType] = useState('')
  const [contentTypes, setContentTypes] = useState([])
  const [resubFiles, setResubFiles] = useState([])
  const [resubSupportingFiles, setResubSupportingFiles] = useState([])
  const [confirmFiles, setConfirmFiles] = useState([])
  const [confirmSupportingFiles, setConfirmSupportingFiles] = useState([])
  const [assigningSelf, setAssigningSelf] = useState(false)
  const [changeStatus, setChangeStatus] = useState('Pending')
  const [changeComment, setChangeComment] = useState('')
  const [reviewSupportingFiles, setReviewSupportingFiles] = useState([])
  const [changeStatusFiles, setChangeStatusFiles] = useState([])

  const moduleOn = can('module_general_compliance')
  const canReview = can('gc_review_requests')
  const canChangeStatus = can('gc_change_request_status')
  const canViewAll =
    can('gc_view_all_requests') || can('gc_assign_requests') || canChangeStatus
  const asPowerAdmin = isPowerAdmin

  const backFrom = location.state?.from
  const backTo =
    backFrom === 'queue'
      ? '/my-dashboard/general-compliance/queue'
      : backFrom === 'mine' || backFrom === 'submit'
        ? '/my-dashboard/general-compliance'
        : canViewAll || canReview || canChangeStatus
          ? '/my-dashboard/general-compliance/queue'
          : '/my-dashboard/general-compliance'
  const backLabel =
    backTo.endsWith('/queue') ? '← Back to queue' : '← Back to my requests'

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      let data
      if (canViewAll || canReview || canChangeStatus) {
        try {
          data = await api.generalComplianceAdminShow(id, { asPowerAdmin })
        } catch {
          data = await api.generalComplianceShow(id)
        }
      } else {
        data = await api.generalComplianceShow(id)
      }
      const item = data.data
      setRow(item)
      setReviewStatus(item.status || 'Pending')
      setFeedback(item.feedback || '')
      setFutureFeedback(item.future_feedback || '')
      setChangeStatus(item.status || 'Pending')
      setChangeComment('')
      setResubDescription(item.description || '')
      setResubContentType(item.content_type || '')
    } catch (err) {
      setError(err.message || 'Failed to load request.')
      setRow(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading || !moduleOn) return
    let cancelled = false
    api
      .generalComplianceContentTypes()
      .then((data) => {
        if (!cancelled) setContentTypes(data.types || [])
      })
      .catch(() => {
        if (!cancelled) setContentTypes([])
      })
    return () => {
      cancelled = true
    }
  }, [hubLoading, moduleOn])

  useEffect(() => {
    if (hubLoading || !moduleOn) {
      setLoading(false)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, hubLoading, moduleOn])

  const isOwner =
    row &&
    user &&
    (Number(row.user_id) === Number(user.id) ||
      (effectiveAdvisorId != null && Number(row.user_id) === Number(effectiveAdvisorId)))
  const isAssignee = row && user && Number(row.assigned_to) === Number(user.id)
  const canReviewThis = canReview && (canViewAll || isAssignee)
  const canShowReviewForm = canReviewThis && row?.status === 'Pending'
  const canAssignToMyself = canReview && row && !row.assigned_to && user?.id
  const canOwnerRespond =
    isOwner && can('gc_submit_request') && row &&
    (row.status === 'Rejected' || row.status === 'Approved with Feedback')

  const assignToMyself = async () => {
    if (!user?.id) return
    setAssigningSelf(true)
    setError('')
    setMessage('')
    try {
      const data = await api.generalComplianceAssign(id, user.id, { asPowerAdmin })
      setRow(data.data)
      setMessage('Assigned to you. You can review this request now.')
    } catch (err) {
      setError(err.message || 'Could not assign this request to you.')
    } finally {
      setAssigningSelf(false)
    }
  }

  const saveReview = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const body = compliancePostBody(
        { status: reviewStatus, feedback, future_feedback: futureFeedback },
        reviewSupportingFiles
      )
      const data = await api.generalComplianceReview(id, body, { asPowerAdmin })
      setRow(data.data)
      setReviewSupportingFiles([])
      setMessage('Review saved.')
    } catch (err) {
      setError(err.message || 'Review failed.')
    } finally {
      setSaving(false)
    }
  }

  const saveChangeStatus = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const body = compliancePostBody(
        { status: changeStatus, comment: changeComment },
        changeStatusFiles
      )
      const data = await api.generalComplianceChangeStatus(id, body, { asPowerAdmin })
      setRow(data.data)
      setChangeComment('')
      setChangeStatusFiles([])
      setChangeStatus(data.data?.status || changeStatus)
      setMessage('Status updated (new version created).')
    } catch (err) {
      setError(err.message || 'Status change failed.')
    } finally {
      setSaving(false)
    }
  }

  const appendPrimaryAttachments = (form, files) => {
    appendComplianceAttachments(form, files)
  }

  const resubmit = async (event) => {
    event.preventDefault()
    if (isRichTextEmpty(resubDescription)) {
      setError('Updated description is required.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const form = new FormData()
      form.append('description', resubDescription)
      form.append('content_type', resubContentType)
      appendPrimaryAttachments(form, resubFiles)
      appendSupportingFiles(form, resubSupportingFiles)
      const data = await api.generalComplianceResubmit(id, form)
      setRow(data.data)
      setMessage('Resubmitted for review.')
      setResubFiles([])
      setResubSupportingFiles([])
    } catch (err) {
      setError(err.message || 'Resubmit failed.')
    } finally {
      setSaving(false)
    }
  }

  const confirmFeedback = async (withFiles) => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const form = new FormData()
      if (withFiles) {
        if (confirmFiles.length) appendPrimaryAttachments(form, confirmFiles)
        if (confirmSupportingFiles.length) appendSupportingFiles(form, confirmSupportingFiles)
      }
      const data = await api.generalComplianceConfirmFeedback(id, form)
      setRow(data.data)
      setMessage('Request confirmed as Approved.')
      setConfirmFiles([])
      setConfirmSupportingFiles([])
    } catch (err) {
      setError(err.message || 'Confirm failed.')
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <p className="muted">Generic Content Pre Approval module is off for this hub.</p>
      </section>
    )
  }

  if (loading) return <div className="state">Loading...</div>
  if (error && !row) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">General Compliance</p>
            <h1>Request</h1>
          </div>
          <Link to={backTo} className="btn ghost">
            {backLabel}
          </Link>
        </div>
        <div className="alert">{error}</div>
      </section>
    )
  }
  if (!row) return null

  const versions = row.versions || []

  return (
    <section className="gc-detail">
      <div className="page-head">
        <div>
          <p className="eyebrow">General Compliance</p>
          <h1>
            Request #{row.id}{' '}
            <GcStatusBadge
              status={row.status}
              at={row.reviewed_at || row.submission_date}
            />
          </h1>
          <p className="muted">
            {row.attribution_label ||
              `Submitted by ${row.submitter?.name || row.name}`}{' '}
            · <DateTimeText value={row.submission_date} />
          </p>
        </div>
        <Link to={backTo} className="btn ghost">
          {backLabel}
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {canShowReviewForm && (
        <form className="admin-form gc-panel" onSubmit={saveReview}>
          <h2>Review</h2>
          <fieldset className="gc-status-group">
            <legend>Set status</legend>
            {GC_STATUSES.map((status) => (
              <label
                key={status}
                className={`gc-radio ${gcStatusClass(status)}${reviewStatus === status ? ' is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="status"
                  value={status}
                  checked={reviewStatus === status}
                  onChange={() => setReviewStatus(status)}
                />
                <ComplianceStatusText status={status} label={complianceStatusLabel(status)} />
              </label>
            ))}
          </fieldset>
          <div className="admin-field">
            <span className="field-label-text">Remedial Feedback/notes</span>
            <RichTextEditor
              rows={4}
              value={feedback}
              onChange={setFeedback}
              placeholder="Remedial feedback for the submitter…"
            />
          </div>
          <div className="admin-field">
            <span className="field-label-text">Future Feedback/notes</span>
            <RichTextEditor
              rows={4}
              value={futureFeedback}
              onChange={setFutureFeedback}
              placeholder="Notes for future reference…"
            />
          </div>
          <SupportingFilesPicker
            id="gc-review-supporting-files"
            files={reviewSupportingFiles}
            onChange={setReviewSupportingFiles}
          />
          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save review'}
            </button>
          </div>
        </form>
      )}

      {isOwner && can('gc_submit_request') && row.status === 'Approved with Feedback' && (
        <div className="admin-form gc-panel">
          <h2>
            <ComplianceStatusText
              status="Approved with Feedback"
              label={complianceStatusLabel('Approved with Feedback')}
            />
          </h2>
          <p className="muted">
            Confirm as approved, or upload corrected attachments (also becomes Approved).
          </p>
          {row.feedback ? (
            <div style={{ marginBottom: '0.75rem' }}>
              <p className="muted label">Remedial Feedback/notes</p>
              <RichTextDisplay html={row.feedback} className="gc-feedback" />
            </div>
          ) : null}
          {row.future_feedback ? (
            <div style={{ marginBottom: '0.75rem' }}>
              <p className="muted label">Future Feedback/notes</p>
              <RichTextDisplay html={row.future_feedback} className="gc-feedback" />
            </div>
          ) : null}
          <SupportingFilesPicker
            id="gc-confirm-attachments"
            label="Attachments (optional)"
            files={confirmFiles}
            onChange={setConfirmFiles}
          />
          <SupportingFilesPicker
            id="gc-confirm-supporting-files"
            files={confirmSupportingFiles}
            onChange={setConfirmSupportingFiles}
          />
          <div className="actions">
            <button
              type="button"
              className="btn primary"
              disabled={saving}
              onClick={() =>
                confirmFeedback(Boolean(confirmFiles.length || confirmSupportingFiles.length))
              }
            >
              {confirmFiles.length || confirmSupportingFiles.length
                ? 'Upload & approve'
                : 'Confirm approved'}
            </button>
          </div>
        </div>
      )}

      {isOwner && can('gc_submit_request') && row.status === 'Rejected' && (
        <form className="admin-form gc-panel" onSubmit={resubmit}>
          <h2>Rejected — resubmit</h2>
          {row.feedback ? (
            <div style={{ marginBottom: '0.75rem' }}>
              <p className="muted label">Remedial Feedback/notes</p>
              <RichTextDisplay html={row.feedback} className="gc-feedback" />
            </div>
          ) : null}
          {row.future_feedback ? (
            <div style={{ marginBottom: '0.75rem' }}>
              <p className="muted label">Future Feedback/notes</p>
              <RichTextDisplay html={row.future_feedback} className="gc-feedback" />
            </div>
          ) : null}
          <label>
            <RequiredMark>Content type</RequiredMark>
            <select
              value={resubContentType}
              onChange={(e) => setResubContentType(e.target.value)}
              required
            >
              <option value="">Select content type…</option>
              {contentTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
              {resubContentType &&
                !contentTypes.some((t) => t.name === resubContentType) && (
                  <option value={resubContentType}>{resubContentType}</option>
                )}
            </select>
          </label>
          <div className="admin-field">
            <span className="field-label-text">
              <RequiredMark>Updated description</RequiredMark>
            </span>
            <RichTextEditor
              rows={4}
              value={resubDescription}
              onChange={setResubDescription}
              required
            />
          </div>
          <SupportingFilesPicker
            id="gc-resubmit-attachments"
            label="Attachments (optional)"
            files={resubFiles}
            onChange={setResubFiles}
          />
          <SupportingFilesPicker
            id="gc-resubmit-supporting-files"
            files={resubSupportingFiles}
            onChange={setResubSupportingFiles}
          />
          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Submitting…' : 'Resubmit'}
            </button>
          </div>
        </form>
      )}

      {canChangeStatus && (
        <form className="admin-form gc-panel" onSubmit={saveChangeStatus}>
          <h2>Change status</h2>
          <p className="muted">
            Creates a new version with the selected status and optional comment. Firm visibility still applies.
          </p>
          <fieldset className="gc-status-group">
            <legend>New status</legend>
            {GC_STATUSES.map((status) => (
              <label
                key={status}
                className={`gc-radio ${gcStatusClass(status)}${changeStatus === status ? ' is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="change-status"
                  value={status}
                  checked={changeStatus === status}
                  onChange={() => setChangeStatus(status)}
                />
                <ComplianceStatusText status={status} label={complianceStatusLabel(status)} />
              </label>
            ))}
          </fieldset>
          <div className="admin-field">
            <span className="field-label-text">Comment (optional)</span>
            <RichTextEditor
              rows={3}
              value={changeComment}
              onChange={setChangeComment}
              placeholder="Reason for changing status…"
            />
          </div>
          <SupportingFilesPicker
            id="gc-change-status-supporting-files"
            files={changeStatusFiles}
            onChange={setChangeStatusFiles}
          />
          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Update status'}
            </button>
          </div>
        </form>
      )}

      {row.assignee ? (
        <p className="gc-banner">
          Assigned to <strong>{row.assignee.name}</strong>
          {row.assignee.role ? (
            <span className="muted"> · {roleLabel(row.assignee.role)}</span>
          ) : null}
          {row.assignee.email ? (
            <span className="muted"> ({row.assignee.email})</span>
          ) : null}
          {row.assigned_date ? (
            <>
              {' '}
              on <DateTimeText value={row.assigned_date} />
            </>
          ) : null}
          {row.assigner?.name ? (
            <>
              <br />
              <span className="muted">
                Assigned by <strong>{row.assigner.name}</strong>
                {row.assigner.role ? ` · ${roleLabel(row.assigner.role)}` : ''}
                {row.assigner.email ? ` (${row.assigner.email})` : ''}
              </span>
            </>
          ) : null}
        </p>
      ) : (
        <div className="gc-banner gc-banner--warn" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span>Not assigned to a reviewer yet.</span>
          {canAssignToMyself && (
            <button type="button" className="btn primary" disabled={assigningSelf} onClick={assignToMyself}>
              {assigningSelf ? 'Assigning…' : 'Assign to myself'}
            </button>
          )}
        </div>
      )}

      <div className="gc-panel" style={{ marginBottom: '1rem' }}>
        {row.content_type ? (
          <>
            <p className="muted label">Content type</p>
            <p>{row.content_type}</p>
          </>
        ) : null}
        <p className="muted label" style={{ marginTop: row.content_type ? '0.75rem' : 0 }}>
          Current description
        </p>
        <RichTextDisplay html={row.description} className="gc-pre" />
        {row.feedback ? (
          <>
            <p className="muted label" style={{ marginTop: '0.75rem' }}>
              Remedial Feedback/notes
            </p>
            <RichTextDisplay html={row.feedback} className="gc-feedback" />
          </>
        ) : null}
        {row.future_feedback ? (
          <>
            <p className="muted label" style={{ marginTop: '0.75rem' }}>
              Future Feedback/notes
            </p>
            <RichTextDisplay html={row.future_feedback} className="gc-feedback" />
          </>
        ) : null}
        {resolveComplianceAttachments(row).length ? (
          <>
            <p className="muted label" style={{ marginTop: '0.75rem' }}>
              Attachments
            </p>
            <GcAttachmentList
              attachments={resolveComplianceAttachments(row)}
              showUploader={false}
            />
          </>
        ) : null}
      </div>

      <ComplianceAuditTrail events={row.audit_trail} />

      <div className="gc-versions">
        {versions.map((ver) => (
          <GcVersionCard
            key={ver.id}
            version={ver}
            isLatest={Number(ver.version_number) === Number(row.current_version)}
          />
        ))}
      </div>
    </section>
  )
}
