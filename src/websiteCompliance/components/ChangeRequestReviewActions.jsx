import { useState } from 'react'
import {
  FaCalendarAlt,
  FaCalendarCheck,
  FaCheckCircle,
  FaCommentDots,
  FaHandPointer,
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
import wcApi from '../wcApi'

/**
 * Pickup + approve / schedule / approve-with-feedback / reject for detail page.
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

  if (!request || !user) return null

  const isAssignedToMe = Number(request.approver_id) === Number(user.id)
  const isPendingLike =
    request.status === 'under_review' || request.status === 'pending'
  const isOverrideableTerminal =
    request.status === 'rejected' || request.status === 'approved_with_feedback'
  const isLocked =
    request.status === 'approved' || request.status === 'scheduled'
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

  if (!showPickBanner && !showReviewPanel) return null

  const snapshotBeforeDecision = async () => {
    try {
      const preview = await resolveRequestPreview(wcApi, request)
      await capturePreviewSnapshot(wcApi, request.id, preview)
    } catch {
      // Snapshot is best-effort; decision APIs still proceed.
    }
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

  const handleApprove = async (isScheduledPublish = false) => {
    setBusy('approve')
    onError?.('')
    onMessage?.('')

    let scheduledTime = null
    if (isScheduledPublish && scheduleDate) {
      // datetime-local is local wall-clock; convert explicitly to UTC ISO for the API.
      const local = new Date(scheduleDate)
      if (Number.isNaN(local.getTime())) {
        onError?.('Invalid schedule time. Please pick a valid date and time.')
        setBusy(null)
        return
      }
      if (local.getTime() <= Date.now() + 60_000) {
        onError?.(
          'Schedule time must be at least 1 minute in the future. Clear the schedule field to publish now.'
        )
        setBusy(null)
        return
      }
      scheduledTime = local.toISOString()
    }

    try {
      await snapshotBeforeDecision()
      const data = await api.websiteComplianceApproveChangeRequest(request.id, {
        scheduled_at: scheduledTime,
      })
      const status = data?.status || (scheduledTime ? 'scheduled' : 'approved')
      const savedScheduledAt = data?.scheduled_at || scheduledTime
      onUpdated?.({
        ...request,
        ...(data?.change_request || data || {}),
        status,
        scheduled_at: savedScheduledAt,
      })
      if (status === 'scheduled' && savedScheduledAt) {
        onMessage?.(
          `Request approved and scheduled for publication at ${formatDateTime(savedScheduledAt)}.`
        )
      } else {
        onMessage?.('Request approved. All sections in this request have been published live.')
      }
    } catch (err) {
      onError?.(err.message || err.data?.message || 'Failed to approve request.')
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
      await api.websiteComplianceRejectChangeRequest(request.id, {
        rejection_reason: rejectionReason,
      })
      onUpdated?.({
        ...request,
        status: 'rejected',
        rejection_reason: rejectionReason,
        feedback: null,
        scheduled_at: null,
      })
      onMessage?.('Request rejected. Section locks released for editor.')
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
      const data = await api.websiteComplianceApproveChangeRequestWithFeedback(request.id, {
        feedback: awfFeedback,
      })
      onUpdated?.({
        ...request,
        status: 'approved_with_feedback',
        feedback: awfFeedback,
        scheduled_at: null,
        ...(data?.change_request || data || {}),
      })
      onMessage?.('Request approved with feedback. Editor can revise or confirm & publish.')
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

          {decision === 'approve' ? (
            <div className="wc-review-pane wc-review-pane--approve">
              <div>
                <p className="wc-review-pane__title">Approve &amp; publish</p>
                <p className="muted">Publish now, or optionally schedule a later publish time.</p>
              </div>
              <label className="wc-review-pane__label">
                <FaCalendarAlt className="inline w-3 h-3 mr-1.5 text-purple-500" />
                Schedule publish <span className="muted">(optional)</span>
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
              <button
                type="button"
                onClick={() => handleApprove(!!scheduleDate)}
                disabled={!!busy}
                className={`btn${scheduleDate ? ' wc-review-btn--schedule' : ' primary'}`}
              >
                {busy === 'approve' ? (
                  'Processing…'
                ) : scheduleDate ? (
                  <>
                    <FaCalendarCheck className="w-3.5 h-3.5" style={{ marginRight: 6 }} />
                    Schedule Publish
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="w-3.5 h-3.5" style={{ marginRight: 6 }} />
                    Approve &amp; Publish Now
                  </>
                )}
              </button>
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
