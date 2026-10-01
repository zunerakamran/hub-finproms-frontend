import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api/client'
import SmcStatusBadge, { SmcVersionCard, SmcSupportingFilesBlock } from '../components/SocialMediaComplianceUI'
import FileDropzone from '../components/FileDropzone'
import SupportingFilesPicker from '../components/SupportingFilesPicker'
import DateTimeText from '../components/DateTimeText'
import RequiredMark from '../components/RequiredMark'
import RichTextDisplay from '../components/RichTextDisplay'
import RichTextEditor, { isRichTextEmpty } from '../components/RichTextEditor'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { SMC_STATUSES, smcStatusClass } from '../utils/socialMediaCompliance'
import {
  appendSupportingFiles,
  compliancePostBody,
  resolveComplianceSupportingFiles,
} from '../utils/complianceSupportingFiles'
import ComplianceStatusText from '../components/ComplianceStatusText'

export default function SocialMediaComplianceRequestDetail() {
  const { id } = useParams()
  const location = useLocation()
  const { user, isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, complianceStatusLabel, effectiveAdvisorId } = useHub()

  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const [reviewStatus, setReviewStatus] = useState('Pending')
  const [feedback, setFeedback] = useState('')
  const [resubDescription, setResubDescription] = useState('')
  const [resubImage, setResubImage] = useState(null)
  const [confirmImage, setConfirmImage] = useState(null)
  const [assigningSelf, setAssigningSelf] = useState(false)
  const [reviewSupportingFiles, setReviewSupportingFiles] = useState([])
  const [changeStatusFiles, setChangeStatusFiles] = useState([])
  const [resubSupportingFiles, setResubSupportingFiles] = useState([])
  const [confirmSupportingFiles, setConfirmSupportingFiles] = useState([])

  const moduleOn = can('module_social_media_compliance')
  const canReview = can('smc_review_requests')
  const canChangeStatus = can('smc_change_request_status')
  const canViewAll =
    can('smc_view_all_requests') || can('smc_assign_requests') || canChangeStatus
  const asPowerAdmin = isPowerAdmin

  const backFrom = location.state?.from
  const backTo =
    backFrom === 'queue'
      ? '/my-dashboard/social-media-compliance/queue'
      : backFrom === 'mine' || backFrom === 'submit'
        ? '/my-dashboard/social-media-compliance'
        : canViewAll || canReview || canChangeStatus
          ? '/my-dashboard/social-media-compliance/queue'
          : '/my-dashboard/social-media-compliance'
  const backLabel =
    backTo.endsWith('/queue') ? '← Back to queue' : '← Back to my requests'

  const [changeStatus, setChangeStatus] = useState('Pending')
  const [changeComment, setChangeComment] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      let data
      if (canViewAll || canReview || canChangeStatus) {
        try {
          data = await api.socialMediaComplianceAdminShow(id, { asPowerAdmin })
        } catch {
          data = await api.socialMediaComplianceShow(id)
        }
      } else {
        data = await api.socialMediaComplianceShow(id)
      }
      const item = data.data
      setRow(item)
      setReviewStatus(item.status || 'Pending')
      setFeedback(item.feedback || '')
      setChangeStatus(item.status || 'Pending')
      setChangeComment('')
      setResubDescription(item.description || '')
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
    isOwner && can('smc_submit_request') && row &&
    (row.status === 'Rejected' || row.status === 'Approved with Feedback')

  const assignToMyself = async () => {
    if (!user?.id) return
    setAssigningSelf(true)
    setError('')
    setMessage('')
    try {
      const data = await api.socialMediaComplianceAssign(id, user.id, { asPowerAdmin })
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
        { status: reviewStatus, feedback },
        reviewSupportingFiles
      )
      const data = await api.socialMediaComplianceReview(id, body, { asPowerAdmin })
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
      const data = await api.socialMediaComplianceChangeStatus(id, body, { asPowerAdmin })
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
      if (resubImage) form.append('attachment', resubImage)
      appendSupportingFiles(form, resubSupportingFiles)
      const data = await api.socialMediaComplianceResubmit(id, form)
      setRow(data.data)
      setMessage('Resubmitted for review.')
      setResubImage(null)
      setResubSupportingFiles([])
    } catch (err) {
      setError(err.message || 'Resubmit failed.')
    } finally {
      setSaving(false)
    }
  }

  const confirmFeedback = async (withImage) => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const form = new FormData()
      if (withImage && confirmImage) form.append('attachment', confirmImage)
      appendSupportingFiles(form, confirmSupportingFiles)
      const data = await api.socialMediaComplianceConfirmFeedback(id, form)
      setRow(data.data)
      setMessage('Request confirmed as Approved.')
      setConfirmImage(null)
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
        <p className="muted">Social Media Pre Approval module is off for this hub.</p>
      </section>
    )
  }

  if (loading) return <div className="state">Loading...</div>
  if (error && !row) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Social Media Compliance</p>
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
    <section className="smc-detail">
      <div className="page-head">
        <div>
          <p className="eyebrow">Social Media Compliance</p>
          <h1>
            Request #{row.id}{' '}
            <SmcStatusBadge
              status={row.status}
              at={row.reviewed_at || row.submission_date}
            />
          </h1>
          <p className="muted">
            {row.attribution_label ||
              `Submitted by ${row.submitter?.name || row.name}`}{' '}
            · <DateTimeText value={row.submission_date} />
            {row.post?.title ? ` · ${row.post.title}` : ''}
          </p>
        </div>
        <Link to={backTo} className="btn ghost">
          {backLabel}
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {canShowReviewForm && (
        <form className="admin-form smc-panel" onSubmit={saveReview}>
          <h2>Review</h2>
          <fieldset className="smc-status-group">
            <legend>Set status</legend>
            {SMC_STATUSES.map((status) => (
              <label
                key={status}
                className={`smc-radio ${smcStatusClass(status)}${reviewStatus === status ? ' is-selected' : ''}`}
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
          <label>
            Feedback / notes
            <RichTextEditor
              rows={4}
              value={feedback}
              onChange={setFeedback}
              placeholder="Leave feedback for the submitter…"
            />
          </label>
          <SupportingFilesPicker
            id="smc-review-supporting-files"
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

      {isOwner && can('smc_submit_request') && row.status === 'Approved with Feedback' && (
        <div className="admin-form smc-panel">
          <h2>
            <ComplianceStatusText
              status="Approved with Feedback"
              label={complianceStatusLabel('Approved with Feedback')}
            />
          </h2>
          <p className="muted">
            Confirm as approved, or upload a corrected image/video (also becomes Approved).
          </p>
          {row.feedback && <RichTextDisplay html={row.feedback} className="smc-feedback" />}
          <FileDropzone
            id="smc-confirm-attachment"
            label="Optional new attachment"
            hint="JPG, PNG, GIF, WebP, MP4, MOV or WebM."
            accept="image/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            files={confirmImage ? [confirmImage] : []}
            onChange={(next) => setConfirmImage(next?.[0] || null)}
          />
          <SupportingFilesPicker
            id="smc-confirm-supporting-files"
            files={confirmSupportingFiles}
            onChange={setConfirmSupportingFiles}
          />
          <div className="actions">
            <button
              type="button"
              className="btn primary"
              disabled={saving}
              onClick={() =>
                confirmFeedback(Boolean(confirmImage || confirmSupportingFiles.length))
              }
            >
              {confirmImage || confirmSupportingFiles.length
                ? 'Upload & approve'
                : 'Confirm approved'}
            </button>
          </div>
        </div>
      )}

      {isOwner && can('smc_submit_request') && row.status === 'Rejected' && (
        <form className="admin-form smc-panel" onSubmit={resubmit}>
          <h2>Rejected — resubmit</h2>
          <label>
            <RequiredMark>Updated description</RequiredMark>
            <RichTextEditor
              rows={4}
              value={resubDescription}
              onChange={setResubDescription}
              required
            />
          </label>
          <FileDropzone
            id="smc-resubmit-attachment"
            label="New attachment (optional)"
            hint="JPG, PNG, GIF, WebP, MP4, MOV or WebM. Leave empty to keep the current file."
            accept="image/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            files={resubImage ? [resubImage] : []}
            onChange={(next) => setResubImage(next?.[0] || null)}
          />
          <SupportingFilesPicker
            id="smc-resubmit-supporting-files"
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
        <form className="admin-form smc-panel" onSubmit={saveChangeStatus}>
          <h2>Change status</h2>
          <p className="muted">
            Creates a new version with the selected status and optional comment. Firm visibility still applies.
          </p>
          <fieldset className="smc-status-group">
            <legend>New status</legend>
            {SMC_STATUSES.map((status) => (
              <label
                key={status}
                className={`smc-radio ${smcStatusClass(status)}${changeStatus === status ? ' is-selected' : ''}`}
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
          <label>
            Comment (optional)
            <RichTextEditor
              rows={3}
              value={changeComment}
              onChange={setChangeComment}
              placeholder="Reason for changing status…"
            />
          </label>
          <SupportingFilesPicker
            id="smc-change-status-supporting-files"
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
        <p className="smc-banner">
          Assigned to <strong>{row.assignee.name}</strong>
          {row.assigned_date ? (
            <>
              {' '}
              on <DateTimeText value={row.assigned_date} />
            </>
          ) : null}
        </p>
      ) : (
        <div className="smc-banner smc-banner--warn" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span>Not assigned to a reviewer yet.</span>
          {canAssignToMyself && (
            <button type="button" className="btn primary" disabled={assigningSelf} onClick={assignToMyself}>
              {assigningSelf ? 'Assigning…' : 'Assign to myself'}
            </button>
          )}
        </div>
      )}

      <div className="smc-panel" style={{ marginBottom: '1rem' }}>
        <p className="muted label">Supporting files</p>
        <SmcSupportingFilesBlock files={resolveComplianceSupportingFiles(row)} />
      </div>

      <div className="smc-versions">
        {versions.map((ver) => (
          <SmcVersionCard
            key={ver.id}
            version={ver}
            isLatest={Number(ver.version_number) === Number(row.current_version)}
          />
        ))}
      </div>
    </section>
  )
}
