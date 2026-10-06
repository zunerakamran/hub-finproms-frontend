import { useState } from 'react'
import {
  FaCalendarAlt,
  FaCalendarCheck,
  FaCheckCircle,
  FaCommentDots,
  FaHandPointer,
  FaRocket,
  FaTimesCircle,
} from 'react-icons/fa'
import { api } from '../../api/client'
import ComplianceStatusText from '../../components/ComplianceStatusText'
import RichTextEditor, { isRichTextEmpty } from '../../components/RichTextEditor'
import { DataGridDate } from '../../components/DataGrid'
import { useHub } from '../../context/HubContext'
import { formatDateTime } from '../../utils/dateFormat'
import {
  capturePreviewSnapshot,
  resolveRequestPreview,
} from '../utils/changeRequestPreview'
import SupportingFilesPicker from '../../components/SupportingFilesPicker'
import { compliancePostBody } from '../../utils/complianceSupportingFiles'
import wcApi from '../wcApi'

/**
 * Pickup + approve / approve&publish / schedule / approve-with-feedback / reject.
 * Shown for assignees, view-all managers, and change-status managers (same options).
 */
export default function ChangeRequestReviewActions({
  request,
  user,
  canViewAll = false,
  canOverrideStatus = false,
  onUpdated,
  onMessage,
  onError,
}) {
  const { complianceStatusLabel } = useHub()
  const [busy, setBusy] = useState(null)
  const [decision, setDecision] = useState('approve')
  const [scheduleDate, setScheduleDate] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [awfFeedback, setAwfFeedback] = useState('')
  const [reviewSupportingFiles, setReviewSupportingFiles] = useState([])

  if (!request || !user) return null

  const isAssignedToMe = Number(request.approver_id) === Number(user.id)
  const isPendingLike =
    request.status === 'under_review' || request.status === 'pending'
  const isApprovedAwaitingPublish = request.status === 'approved'
  const isOverrideableTerminal =
    request.status === 'rejected' || request.status === 'approved_with_feedback'
  const isLocked =
    request.status === 'published' || request.status === 'scheduled'
  const showPickBanner =
    request.status === 'pending' && !request.approver_id && !canOverrideStatus && !canViewAll

  // Managers with view-all or change-status can decide without picking first.
  const canDecide = isAssignedToMe || canViewAll || canOverrideStatus
  // Approvers: pending / under_review only.
  // Change-status managers: also rejected / approved-with-feedback (not published or scheduled).
  const showReviewPanel =
    canDecide &&
    !isLocked &&
    (isPendingLike || (canOverrideStatus && isOverrideableTerminal))
  // After approve-only, show scheduler (+ optional publish now).
  const showSchedulePanel = canDecide && isApprovedAwaitingPublish

  if (!showPickBanner && !showReviewPanel && !showSchedulePanel) return null

  const snapshotBeforeDecision = async () => {
    try {
      const preview = await resolveRequestPreview(wcApi, request)
      await capturePreviewSnapshot(wcApi, request.id, preview)
    } catch {
      // Snapshot is best-effort; decision APIs still proceed.
    }
  }

  const parseScheduleIso = () => {
    if (!scheduleDate) return null
    const local = new Date(scheduleDate)
    if (Number.isNaN(local.getTime())) {
      onError?.('Invalid schedule time. Please pick a valid date and time.')
      return false
    }
    if (local.getTime() <= Date.now() + 60_000) {
      onError?.('Schedule time must be at least 1 minute in the future.')
      return false
    }
    return local.toISOString()
  }

  const handleAssign = async () => {
    setBusy('assign')
    onError?.('')
    onMessage?.('')
    try {
      await api.websiteComplianceAssignChangeRequest(request.id)
      const next = {
        ...request,
        status: 'pending',
        approver_id: user.id,
        approver: { id: user.id, name: user.name, email: user.email },
      }
      onUpdated?.(next)
      onMessage?.('Request picked up. You can now review and approve or reject.')
    } catch (err) {
      onError?.(err.message || err.data?.message || 'Could not pick up this request.')
    } finally {
      setBusy(null)
    }
  }

  const handleApproveOnly = async () => {
    setBusy('approve')
    onError?.('')
    onMessage?.('')
    try {
      await snapshotBeforeDecision()
      const body = compliancePostBody({}, reviewSupportingFiles)
      const data = await api.websiteComplianceApproveChangeRequest(request.id, body)
      onUpdated?.({
        ...request,
        ...(data?.change_request || data || {}),
        status: data?.status || 'approved',
        scheduled_at: null,
      })
      onMessage?.(
        'Request approved. Use the scheduler below to publish later, or publish now.'
      )
      setReviewSupportingFiles([])
    } catch (err) {
      onError?.(err.message || err.data?.message || 'Failed to approve request.')
    } finally {
      setBusy(null)
    }
  }

  const handleApproveAndPublish = async () => {
    setBusy('publish')
    onError?.('')
    onMessage?.('')
    try {
      await snapshotBeforeDecision()
      const body = compliancePostBody({ publish_now: true }, reviewSupportingFiles)
      const data = await api.websiteComplianceApproveChangeRequest(request.id, body)
      onUpdated?.({
        ...request,
        ...(data?.change_request || data || {}),
        status: data?.status || 'published',
        scheduled_at: null,
      })
      const synced = data?.cpanel_synced === true
      const queued = data?.cpanel_sync_queued === true
      const apiMessage = typeof data?.message === 'string' ? data.message.trim() : ''
      if (synced) {
        onMessage?.(apiMessage || 'Request approved and published to the live advisor site.')
      } else if (queued) {
        onMessage?.(
          apiMessage ||
            'Request approved in the hub. Live site sync was queued — refresh the advisor site after the worker runs.'
        )
      } else {
        onError?.(
          apiMessage ||
            'Request was saved as published in the hub, but the live advisor site was not updated. Check cPanel domain / API key and Laravel logs.'
        )
      }
      setReviewSupportingFiles([])
    } catch (err) {
      const apiMessage =
        err?.data?.message ||
        err?.response?.data?.message ||
        err?.message
      // Hub may still mark the CR published (502) when cPanel sync fails.
      if (err?.data?.status === 'published' || err?.response?.data?.status === 'published') {
        const payload = err.data || err.response?.data || {}
        onUpdated?.({
          ...request,
          ...(payload.change_request || {}),
          status: 'published',
          scheduled_at: null,
        })
        onError?.(
          apiMessage ||
            'Request was saved as published in the hub, but the live advisor site was not updated.'
        )
      } else {
        onError?.(apiMessage || 'Failed to approve and publish.')
      }
    } finally {
      setBusy(null)
    }
  }

  const handleSchedulePublish = async () => {
    setBusy('schedule')
    onError?.('')
    onMessage?.('')

    const scheduledTime = parseScheduleIso()
    if (scheduledTime === false) {
      setBusy(null)
      return
    }
    if (!scheduledTime) {
      onError?.('Please pick a date and time to schedule publish.')
      setBusy(null)
      return
    }

    try {
      await snapshotBeforeDecision()
      const body = compliancePostBody({ scheduled_at: scheduledTime }, reviewSupportingFiles)
      const data = await api.websiteComplianceApproveChangeRequest(request.id, body)
      const status = data?.status || 'scheduled'
      const savedScheduledAt = data?.scheduled_at || scheduledTime
      onUpdated?.({
        ...request,
        ...(data?.change_request || data || {}),
        status,
        scheduled_at: savedScheduledAt,
      })
      onMessage?.(
        `Publish scheduled for ${formatDateTime(savedScheduledAt)}. Status can no longer be changed.`
      )
      setReviewSupportingFiles([])
      setScheduleDate('')
    } catch (err) {
      onError?.(err.message || err.data?.message || 'Failed to schedule publish.')
    } finally {
      setBusy(null)
    }
  }

  const handleReject = async () => {
    if (isRichTextEmpty(rejectionReason)) {
      onError?.('Please enter a rejection reason before rejecting.')
      return
    }
    setBusy('reject')
    onError?.('')
    onMessage?.('')
    try {
      await snapshotBeforeDecision()
      const body = compliancePostBody({ rejection_reason: rejectionReason }, reviewSupportingFiles)
      await api.websiteComplianceRejectChangeRequest(request.id, body)
      onUpdated?.({
        ...request,
        status: 'rejected',
        rejection_reason: rejectionReason,
        feedback: null,
        scheduled_at: null,
      })
      onMessage?.('Request rejected. Section locks released for editor.')
      setReviewSupportingFiles([])
    } catch (err) {
      onError?.(err.message || err.data?.message || 'Failed to reject request.')
    } finally {
      setBusy(null)
    }
  }

  const handleApproveWithFeedback = async () => {
    if (isRichTextEmpty(awfFeedback)) {
      onError?.('Please enter feedback before approving with feedback.')
      return
    }
    setBusy('awf')
    onError?.('')
    onMessage?.('')
    try {
      await snapshotBeforeDecision()
      const body = compliancePostBody({ feedback: awfFeedback }, reviewSupportingFiles)
      const data = await api.websiteComplianceApproveChangeRequestWithFeedback(request.id, body)
      onUpdated?.({
        ...request,
        status: 'approved_with_feedback',
        feedback: awfFeedback,
        scheduled_at: null,
        ...(data?.change_request || data || {}),
      })
      onMessage?.('Request approved with feedback. Editor can revise or confirm & publish.')
      setReviewSupportingFiles([])
    } catch (err) {
      onError?.(err.message || err.data?.message || 'Failed to approve with feedback.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="wc-panel wc-detail-card wc-review-actions">
      {showPickBanner ? (
        <div className="wc-review-pick">
          <div className="min-w-0">
            <p className="wc-review-pick__title">Available for review</p>
            <p className="wc-review-pick__text">
              Pick this request to start reviewing. No one else has claimed it yet.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!!busy}
            className="btn primary"
          >
            {busy === 'assign' ? (
              'Picking…'
            ) : (
              <>
                <FaHandPointer className="w-3.5 h-3.5" style={{ marginRight: 6 }} />
                Pick it
              </>
            )}
          </button>
        </div>
      ) : null}

      {showSchedulePanel ? (
        <div className={`wc-review-decision${showPickBanner ? ' wc-review-decision--spaced' : ''}`}>
          <div>
            <h2 className="wc-review-decision__heading">Publish schedule</h2>
            <p className="muted" style={{ marginTop: 4 }}>
              This request is approved but not live yet. Schedule a publish time, or publish now.
            </p>
          </div>

          <div className="wc-supporting-files-card" style={{ marginBottom: '1rem' }}>
            <p className="wc-supporting-files-card__title">Supporting files (optional)</p>
            <p className="wc-supporting-files-card__hint">
              Attach PDF, Office, images, or ZIP with your publish decision.
            </p>
            <SupportingFilesPicker
              id="wc-schedule-supporting-files"
              files={reviewSupportingFiles}
              onChange={setReviewSupportingFiles}
              label={null}
              hint={null}
            />
          </div>

          <div className="wc-review-pane wc-review-pane--approve">
            <label className="wc-review-pane__label">
              <FaCalendarAlt className="inline w-3 h-3 mr-1.5 text-purple-500" />
              Schedule publish
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </label>
            {scheduleDate ? (
              <p className="wc-review-schedule-note">
                Will publish at{' '}
                <DataGridDate
                  value={(() => {
                    const d = new Date(scheduleDate)
                    return Number.isNaN(d.getTime()) ? scheduleDate : d.toISOString()
                  })()}
                />{' '}
                <span className="muted">(your local time)</span>
              </p>
            ) : null}
            <div className="actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleSchedulePublish}
                disabled={!!busy || !scheduleDate}
                className="btn wc-review-btn--schedule"
              >
                {busy === 'schedule' ? (
                  'Scheduling…'
                ) : (
                  <>
                    <FaCalendarCheck className="w-3.5 h-3.5" style={{ marginRight: 6 }} />
                    Schedule Publish
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleApproveAndPublish}
                disabled={!!busy}
                className="btn primary"
              >
                {busy === 'publish' ? (
                  'Publishing…'
                ) : (
                  <>
                    <FaRocket className="w-3.5 h-3.5" style={{ marginRight: 6 }} />
                    Publish Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showReviewPanel ? (
        <div className={`wc-review-decision${showPickBanner ? ' wc-review-decision--spaced' : ''}`}>
          <div>
            <h2 className="wc-review-decision__heading">
              {canOverrideStatus && !isAssignedToMe ? 'Change request status' : 'Your decision'}
            </h2>
            <div className="wc-review-tabs">
              <button
                type="button"
                onClick={() => setDecision('approve')}
                disabled={!!busy}
                className={`wc-review-tab${decision === 'approve' ? ' is-approve' : ''}`}
              >
                <FaCheckCircle className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => setDecision('awf')}
                disabled={!!busy}
                className={`wc-review-tab${decision === 'awf' ? ' is-awf' : ''}`}
              >
                <FaCommentDots className="w-3.5 h-3.5" />
                <ComplianceStatusText
                  status="approved_with_feedback"
                  label={complianceStatusLabel('approved_with_feedback')}
                />
              </button>
              <button
                type="button"
                onClick={() => setDecision('reject')}
                disabled={!!busy}
                className={`wc-review-tab${decision === 'reject' ? ' is-reject' : ''}`}
              >
                <FaTimesCircle className="w-3.5 h-3.5" />
                Reject
              </button>
            </div>
          </div>

          <div className="wc-supporting-files-card" style={{ marginBottom: '1rem' }}>
            <p className="wc-supporting-files-card__title">Supporting files (optional)</p>
            <p className="wc-supporting-files-card__hint">
              Attach PDF, Office, images, or ZIP with your approve / reject decision.
            </p>
            <SupportingFilesPicker
              id="wc-review-supporting-files"
              files={reviewSupportingFiles}
              onChange={setReviewSupportingFiles}
              label={null}
              hint={null}
            />
          </div>

          {decision === 'approve' ? (
            <div className="wc-review-pane wc-review-pane--approve">
              <div>
                <p className="wc-review-pane__title">Approve</p>
                <p className="muted">
                  Approve &amp; publish goes live immediately. Approve only marks it approved so you
                  can schedule publish next.
                </p>
              </div>
              <div className="actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleApproveAndPublish}
                  disabled={!!busy}
                  className="btn primary"
                >
                  {busy === 'publish' ? (
                    'Publishing…'
                  ) : (
                    <>
                      <FaRocket className="w-3.5 h-3.5" style={{ marginRight: 6 }} />
                      Approve &amp; Publish
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleApproveOnly}
                  disabled={!!busy}
                  className="btn ghost"
                >
                  {busy === 'approve' ? (
                    'Approving…'
                  ) : (
                    <>
                      <FaCheckCircle className="w-3.5 h-3.5" style={{ marginRight: 6 }} />
                      Approve
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : decision === 'awf' ? (
            <div className="wc-review-pane wc-review-pane--awf">
              <div>
                <p className="wc-review-pane__title">Approve with feedback</p>
                <p className="muted">
                  Do not publish yet. Unlock sections so the editor can address your notes, then
                  confirm.
                </p>
              </div>
              <RichTextEditor
                rows={3}
                placeholder="Share required changes or notes before publishing…"
                value={awfFeedback}
                onChange={setAwfFeedback}
              />
              <button
                type="button"
                onClick={handleApproveWithFeedback}
                disabled={!!busy || isRichTextEmpty(awfFeedback)}
                className="btn wc-review-btn--awf"
              >
                {busy === 'awf' ? 'Saving…' : 'Approve with Feedback'}
              </button>
            </div>
          ) : (
            <div className="wc-review-pane wc-review-pane--reject">
              <div>
                <p className="wc-review-pane__title">Reject request</p>
                <p className="muted">
                  Send it back to the editor with clear feedback on what to change.
                </p>
              </div>
              <RichTextEditor
                rows={3}
                placeholder="Explain what needs to be changed…"
                value={rejectionReason}
                onChange={setRejectionReason}
              />
              <button
                type="button"
                onClick={handleReject}
                disabled={!!busy || isRichTextEmpty(rejectionReason)}
                className="btn wc-review-btn--reject"
              >
                {busy === 'reject' ? 'Rejecting…' : 'Reject Request'}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
