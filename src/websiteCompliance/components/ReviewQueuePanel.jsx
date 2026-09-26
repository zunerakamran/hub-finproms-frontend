import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { Link } from 'react-router-dom'
import {
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaTimesCircle,
  FaEye,
  FaEyeSlash,
  FaHandPointer,
  FaCalendarAlt,
  FaSync,
  FaInbox,
  FaClipboardCheck,
  FaUser,
  FaCalendarCheck,
  FaChevronDown,
  FaChevronUp,
  FaLayerGroup,
  FaCommentDots,
  FaCodeBranch,
} from 'react-icons/fa'
import api from '../wcApi'
import { useAuth } from '../../context/AuthContext'
import { useHub } from '../../context/HubContext'
import DataGrid from '../../components/DataGrid'
import { resolveAdvisorLiveSiteUrl } from '../utils/assetUrl'
import { parseJson } from '../utils/parseJson'
import {
  buildPreviewFromRequest,
  capturePreviewSnapshot,
  isHistoricalRequest,
  loadPreviewSnapshots,
  previewHasStoredSnapshot,
  resolveRequestPreview,
  savePreviewSnapshot,
} from '../utils/changeRequestPreview'
import SyncedSectionPreviewPair from './SyncedSectionPreviewPair'
import { WcVersionCard } from '../../components/WebsiteComplianceUI'
import OnBehalfAttribution from '../../components/OnBehalfAttribution'
import { WC_CHANGE_STATUS_OPTIONS } from '../../utils/websiteCompliance'

const ACTIVE_STATUSES = new Set(['pending', 'under_review', 'scheduled'])

const STATUS_CONFIG = {
  pending: {
    label: 'Awaiting Pickup',
    icon: FaInbox,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  under_review: {
    label: 'Under Review',
    icon: FaClipboardCheck,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  scheduled: {
    label: 'Scheduled',
    icon: FaCalendarCheck,
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
  approved: {
    label: 'Approved & Published',
    icon: FaCheckCircle,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    icon: FaTimesCircle,
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
  approved_with_feedback: {
    label: 'Approved with Feedback',
    icon: FaCommentDots,
    className: 'bg-violet-50 text-violet-800 border-violet-200',
    dot: 'bg-amber-500',
  },
}

function getRequestSections(req) {
  if (req.section?.name) {
    return { type: 'single', names: [req.section.name] }
  }
  if (Array.isArray(req.section_edits) && req.section_edits.length > 0) {
    return {
      type: 'batch',
      names: req.section_edits.map(e => e.section_name || 'Section'),
    }
  }
  return { type: 'unknown', names: [] }
}

function getSectionLabel(req) {
  const { type, names } = getRequestSections(req)
  if (type === 'single') return names[0] || '—'
  if (type === 'batch') {
    const preview = names.slice(0, 3).join(', ')
    const extra = names.length > 3 ? ` +${names.length - 3} more` : ''
    return `${preview}${extra}` || '—'
  }
  return '—'
}

function RequestTitle({ req }) {
  const [expanded, setExpanded] = useState(false)
  const { type, names } = useMemo(() => getRequestSections(req), [req.id, req.section, req.section_edits, req.proposed_content])

  if (type === 'single') {
    return (
      <h3 className="text-base sm:text-lg font-bold text-[var(--brand-dark)]">
        Section: {names[0]}
      </h3>
    )
  }

  if (type === 'batch') {
    const count = names.length
    const previewLimit = 3
    const preview = names.slice(0, previewLimit).join(', ')
    const hiddenCount = count - previewLimit

    return (
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base sm:text-lg font-bold text-[var(--brand-dark)]">Request #{req.id}</h3>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <FaLayerGroup className="w-3 h-3" />
            {count} {count === 1 ? 'section' : 'sections'}
          </span>
        </div>

        {!expanded ? (
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            <span className="line-clamp-1 sm:line-clamp-2">
              {preview}
              {hiddenCount > 0 && ` + ${hiddenCount} more`}
            </span>
            {count > previewLimit && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex items-center gap-1 ml-1.5 text-[var(--brand)] font-bold hover:underline shrink-0"
              >
                Show all
                <FaChevronDown className="w-2.5 h-2.5" />
              </button>
            )}
          </p>
        ) : (
          <div className="mt-2">
            <div className="flex flex-wrap gap-1.5">
              {names.map((name, idx) => (
                <span
                  key={`${name}-${idx}`}
                  className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200"
                >
                  {name}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex items-center gap-1 mt-2 text-xs text-[var(--brand)] font-bold hover:underline"
            >
              Show less
              <FaChevronUp className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <h3 className="text-base sm:text-lg font-bold text-[var(--brand-dark)]">
      Change Request #{req.id}
    </h3>
  )
}

function StatusBadge({ status, scheduledAt }) {
  const { complianceStatusLabel } = useHub()
  const config = STATUS_CONFIG[status]
  if (!config) return null
  const Icon = config.icon
  const statusLabel = complianceStatusLabel(status)
  const label = status === 'scheduled' && scheduledAt
    ? `${statusLabel} · ${new Date(scheduledAt).toLocaleString()}`
    : statusLabel
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </span>
  )
}

function AlertBanner({ type, message, onDismiss }) {
  const isSuccess = type === 'success'
  return (
    <div
      className={`${
        isSuccess ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-rose-50 border-rose-500 text-rose-800'
      } border-l-4 p-4 mb-6 rounded-lg shadow-sm flex items-start justify-between gap-3 text-sm font-medium`}
      role="alert"
    >
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-1 rounded hover:bg-black/5 transition"
        aria-label="Dismiss"
      >
        <FaTimes className="w-4 h-4" />
      </button>
    </div>
  )
}

const RequestCard = memo(function RequestCard({
  req,
  user,
  onStatusChange,
  onMessage,
  onError,
  getCachedPreview,
  cachePreview,
  canChangeStatus = false,
}) {
  const [previewData, setPreviewData] = useState(null)
  const [previewMode, setPreviewMode] = useState('visual')
  const [expandedPreviewSections, setExpandedPreviewSections] = useState(() => new Set())
  const [rejectionReason, setRejectionReason] = useState('')
  const [awfFeedback, setAwfFeedback] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [decision, setDecision] = useState('approve') // 'approve' | 'reject' | 'awf'
  const [busy, setBusy] = useState(null)
  const [versions, setVersions] = useState(null)
  const { complianceStatusLabel } = useHub()
  const deployedSiteUrl = useMemo(
    () => resolveAdvisorLiveSiteUrl({ siteUrl: previewData?.site_url || null }),
    [previewData?.site_url]
  )
  const statusLocked = ['approved', 'scheduled'].includes(String(req.status || '').toLowerCase())
  const showChangeStatus = canChangeStatus && !statusLocked
  const [changeStatus, setChangeStatus] = useState(
    WC_CHANGE_STATUS_OPTIONS.includes(req.status) ? req.status : 'pending'
  )
  const [changeComment, setChangeComment] = useState('')

  useEffect(() => {
    setChangeStatus(WC_CHANGE_STATUS_OPTIONS.includes(req.status) ? req.status : 'pending')
    setChangeComment('')
  }, [req.id, req.status])

  const isAssignedToMe = req.approver_id === user?.id

  const handleChangeStatus = async (event) => {
    event.preventDefault()
    setBusy('change-status')
    onError('')
    onMessage('')
    try {
      const res = await api.post(`/change-requests/${req.id}/change-status`, {
        status: changeStatus,
        comment: changeComment,
      })
      const updated = res.data?.change_request || res.data
      onStatusChange(req.id, {
        status: updated?.status || changeStatus,
        current_version: updated?.current_version || req.current_version,
        feedback: updated?.feedback ?? (changeComment || req.feedback),
        rejection_reason: updated?.rejection_reason ?? req.rejection_reason,
        scheduled_at: updated?.scheduled_at ?? null,
      })
      setChangeComment('')
      setVersions(null)
      onMessage(`Request #${req.id} status updated (new version created).`)
    } catch (err) {
      const validation =
        err.response?.data?.errors?.status?.[0]
        || err.response?.data?.errors?.capability?.[0]
      onError(validation || err.response?.data?.message || err.message || 'Could not change status.')
    } finally {
      setBusy(null)
    }
  }

  const handleAssign = async () => {
    setBusy('assign')
    onError('')
    onMessage('')
    try {
      await api.post(`/change-requests/${req.id}/assign`)
      onStatusChange(req.id, {
        status: 'pending',
        approver_id: user.id,
        approver: user,
      })
      onMessage('Request picked up. You can now review and approve or reject.')
    } catch (err) {
      onError(err.response?.data?.message || 'Could not pick up this request.')
    } finally {
      setBusy(null)
    }
  }

  const handleTogglePreview = async () => {
    if (previewData) {
      setPreviewData(null)
      setExpandedPreviewSections(new Set())
      return
    }

    setBusy('preview')
    onError('')
    try {
      const cachedPreview = getCachedPreview(req.id)
      const nextPreview = await resolveRequestPreview(api, req, { cachedPreview })
      setPreviewData(nextPreview)
      if (nextPreview && !isHistoricalRequest(req)) {
        cachePreview(req.id, nextPreview)
      }
    } catch {
      const cachedPreview = getCachedPreview(req.id)
      const storedPreview = buildPreviewFromRequest(req)
      if (cachedPreview) {
        setPreviewData(cachedPreview)
      } else if (previewHasStoredSnapshot(storedPreview)) {
        setPreviewData(storedPreview)
      } else {
        onError('Could not fetch request preview.')
      }
    } finally {
      setBusy(null)
    }
  }

  const handleApprove = async (isScheduled = false) => {
    setBusy('approve')
    onError('')
    onMessage('')
    // datetime-local is local wall time; send UTC ISO so backend (APP_TIMEZONE=UTC) compares correctly
    const scheduledTime = isScheduled && scheduleDate
      ? new Date(scheduleDate).toISOString()
      : null
    try {
      const snapshot = await capturePreviewSnapshot(api, req.id, previewData)
      cachePreview(req.id, snapshot)

      const res = await api.post(`/change-requests/${req.id}/approve`, {
        scheduled_at: scheduledTime,
      })
      const status = res.data?.status
      const savedScheduledAt = res.data?.scheduled_at || scheduledTime
      if (status === 'scheduled' && savedScheduledAt) {
        onMessage(`Request approved and scheduled for publication at ${new Date(savedScheduledAt).toLocaleString()}.`)
        onStatusChange(req.id, { status: 'scheduled', scheduled_at: savedScheduledAt })
      } else {
        onMessage('Request approved. All sections in this request have been published live.')
        onStatusChange(req.id, { status: 'approved', scheduled_at: null })
      }
      setPreviewData(null)
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to approve request.')
    } finally {
      setBusy(null)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      onError('Please enter a rejection reason before rejecting.')
      return
    }
    setBusy('reject')
    onError('')
    onMessage('')
    try {
      const snapshot = await capturePreviewSnapshot(api, req.id, previewData)
      cachePreview(req.id, snapshot)

      await api.post(`/change-requests/${req.id}/reject`, {
        rejection_reason: rejectionReason,
      })
      onMessage('Request rejected. Section locks released for editor.')
      onStatusChange(req.id, {
        status: 'rejected',
        rejection_reason: rejectionReason,
        feedback: null,
      })
      setPreviewData(null)
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to reject request.')
    } finally {
      setBusy(null)
    }
  }

  const handleApproveWithFeedback = async () => {
    if (!awfFeedback.trim()) {
      onError('Please enter feedback before approving with feedback.')
      return
    }
    setBusy('awf')
    onError('')
    onMessage('')
    try {
      const snapshot = await capturePreviewSnapshot(api, req.id, previewData)
      cachePreview(req.id, snapshot)

      const res = await api.post(`/change-requests/${req.id}/approve-with-feedback`, {
        feedback: awfFeedback,
      })
      onMessage('Request approved with feedback. Editor can revise or confirm & publish.')
      onStatusChange(req.id, {
        status: 'approved_with_feedback',
        feedback: awfFeedback,
        ...(res.data?.change_request || {}),
      })
      setPreviewData(null)
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to approve with feedback.')
    } finally {
      setBusy(null)
    }
  }

  const handleLoadVersions = async () => {
    if (versions) {
      setVersions(null)
      return
    }
    setBusy('versions')
    onError('')
    try {
      const res = await api.get(`/change-requests/${req.id}`)
      const list = res.data?.versions || res.data?.change_request?.versions || []
      setVersions(Array.isArray(list) ? list : [])
    } catch (err) {
      onError(err.response?.data?.message || 'Could not load version history.')
    } finally {
      setBusy(null)
    }
  }

  const isHistorical = isHistoricalRequest(req)
  const canPreview = req.status === 'under_review' || req.status === 'pending' || isAssignedToMe || isHistorical
  const showReviewPanel =
    isAssignedToMe && (req.status === 'under_review' || req.status === 'pending')
  const showPickBanner = req.status === 'pending' && !req.approver_id
  const batchEdits = previewData?.is_batch && Array.isArray(previewData.edits) ? previewData.edits : null

  const togglePreviewSection = (idx) => {
    setExpandedPreviewSections(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const expandAllPreviewSections = () => {
    if (!batchEdits) return
    setExpandedPreviewSections(new Set(batchEdits.map((_, idx) => idx)))
  }

  const collapseAllPreviewSections = () => {
    setExpandedPreviewSections(new Set())
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5 sm:p-6 border-b border-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2 flex-wrap">
              <RequestTitle req={req} />
              <StatusBadge status={req.status} scheduledAt={req.scheduled_at} />
              {req.current_version ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  <FaCodeBranch className="w-3 h-3" />
                  v{req.current_version}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <FaUser className="w-3 h-3 text-gray-400" />
                <span>
                  {req.attribution_label || req.on_behalf_by?.name ? (
                    <OnBehalfAttribution row={req} ownerKey="editor" flush />
                  ) : (
                    <>
                      Submitted by{' '}
                      <strong className="text-gray-700">{req.editor?.name || 'Editor'}</strong>
                    </>
                  )}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FaClock className="w-3 h-3 text-gray-400" />
                <span>{new Date(req.created_at).toLocaleString()}</span>
              </span>
              {req.approver && (
                <span className="inline-flex items-center gap-1.5">
                  <FaClipboardCheck className="w-3 h-3 text-[var(--brand)]" />
                  <span>Assigned to <strong className="text-[var(--brand)]">{req.approver.name}</strong></span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              to={`/my-dashboard/website-compliance/my-requests/${req.id}`}
              state={{ from: 'history' }}
              className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-[var(--brand-dark)] hover:bg-gray-50 transition"
            >
              Open request →
            </Link>
            {canPreview && (
              <button
                type="button"
                onClick={handleTogglePreview}
                disabled={busy === 'preview'}
                className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-60 ${
                  previewData
                    ? 'bg-[var(--brand-dark)] text-white hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {busy === 'preview' ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Loading…
                  </>
                ) : previewData ? (
                  <>
                    <FaEyeSlash className="w-3.5 h-3.5" />
                    Hide Preview
                  </>
                ) : (
                  <>
                    <FaEye className="w-3.5 h-3.5" />
                    Preview Changes
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {showChangeStatus && (
        <form onSubmit={handleChangeStatus} className="admin-form wc-panel" style={{ margin: '0 0 0', borderRadius: 0, borderLeft: 0, borderRight: 0 }}>
          <h2>Change status</h2>
          <p className="muted">
            Creates a new version with the selected status and optional comment. Firm visibility still
            applies. Not available once content is scheduled or published.
          </p>
          <fieldset className="wc-status-group">
            <legend>New status</legend>
            {WC_CHANGE_STATUS_OPTIONS.map((status) => (
              <label key={status} className="wc-radio">
                <input
                  type="radio"
                  name={`change-status-${req.id}`}
                  value={status}
                  checked={changeStatus === status}
                  onChange={() => setChangeStatus(status)}
                />
                {complianceStatusLabel(status)}
              </label>
            ))}
          </fieldset>
          <label>
            Comment (optional)
            <textarea
              rows={3}
              value={changeComment}
              onChange={(e) => setChangeComment(e.target.value)}
              placeholder="Reason for changing status…"
            />
          </label>
          <div className="actions">
            <button type="submit" className="btn primary" disabled={busy === 'change-status'}>
              {busy === 'change-status' ? 'Saving…' : 'Update status'}
            </button>
            <Link
              to={`/my-dashboard/website-compliance/my-requests/${req.id}`}
              state={{ from: 'history' }}
              className="btn ghost"
            >
              Open full request →
            </Link>
          </div>
        </form>
      )}

      {canChangeStatus && statusLocked && (
        <div className="px-5 sm:px-6 py-3 border-b border-slate-100 bg-slate-50 text-xs text-slate-600">
          Status cannot be changed because this content is scheduled or already published.{' '}
          <Link
            to={`/my-dashboard/website-compliance/my-requests/${req.id}`}
            state={{ from: 'history' }}
            className="font-bold text-[var(--brand)] hover:underline"
          >
            Open request
          </Link>
        </div>
      )}

      {showPickBanner && (
        <div className="bg-amber-50 border-b border-amber-100 px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-900">Available for review</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Pick this request to start reviewing. No one else has claimed it yet.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!!busy}
            className="inline-flex items-center gap-2 bg-[var(--brand-dark)] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition shadow-sm disabled:opacity-60 shrink-0"
          >
            {busy === 'assign' ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Picking…
              </>
            ) : (
              <>
                <FaHandPointer className="w-3.5 h-3.5" />
                Pick it
              </>
            )}
          </button>
        </div>
      )}

      {showReviewPanel && (
        <div className="bg-slate-50 border-b border-gray-100 px-5 sm:px-6 py-5">
          <div className="max-w-xl mx-auto space-y-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Your decision</p>
              <div className="flex flex-col sm:flex-row rounded-xl border border-gray-200 bg-white p-1 shadow-sm gap-1">
                <button
                  type="button"
                  onClick={() => setDecision('approve')}
                  disabled={!!busy}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition ${
                    decision === 'approve'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FaCheckCircle className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('awf')}
                  disabled={!!busy}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition ${
                    decision === 'awf'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FaCommentDots className="w-3.5 h-3.5" />
                  Approved with Feedback
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('reject')}
                  disabled={!!busy}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition ${
                    decision === 'reject'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FaTimesCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>

            {decision === 'approve' ? (
              <div className="bg-white rounded-xl border border-emerald-200 p-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-[var(--brand-dark)]">Approve &amp; publish</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Publish now, or optionally schedule a later publish time.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-600">
                    <FaCalendarAlt className="inline w-3 h-3 mr-1.5 text-purple-500" />
                    Schedule publish <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 bg-white"
                  />
                  {scheduleDate && (
                    <p className="text-[11px] text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                      Will publish at {new Date(scheduleDate).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleApprove(!!scheduleDate)}
                  disabled={!!busy}
                  className={`w-full inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 rounded-xl transition shadow-sm disabled:opacity-60 ${
                    scheduleDate
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {busy === 'approve' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing…
                    </>
                  ) : scheduleDate ? (
                    <>
                      <FaCalendarCheck className="w-3.5 h-3.5" />
                      Schedule Publish
                    </>
                  ) : (
                    <>
                      <FaCheckCircle className="w-3.5 h-3.5" />
                      Approve &amp; Publish Now
                    </>
                  )}
                </button>
              </div>
            ) : decision === 'awf' ? (
              <div className="bg-white rounded-xl border border-violet-200 p-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-[var(--brand-dark)]">Approve with feedback</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Do not publish yet. Unlock sections so the editor can address your notes, then confirm.
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor={`awf-feedback-${req.id}`} className="block text-xs font-semibold text-gray-600">
                    Feedback <span className="text-violet-600">*</span>
                  </label>
                  <textarea
                    id={`awf-feedback-${req.id}`}
                    rows={3}
                    placeholder="Share required changes or notes before publishing…"
                    value={awfFeedback}
                    onChange={e => setAwfFeedback(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 bg-white resize-y min-h-[5rem]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApproveWithFeedback}
                  disabled={!!busy || !awfFeedback.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 bg-violet-600 text-white text-sm font-bold px-4 py-3 rounded-xl hover:bg-violet-700 transition shadow-sm disabled:opacity-50"
                >
                  {busy === 'awf' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <FaCommentDots className="w-3.5 h-3.5" />
                      Approve with Feedback
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-rose-200 p-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-[var(--brand-dark)]">Reject request</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Send it back to the editor with clear feedback on what to change.
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor={`reject-reason-${req.id}`} className="block text-xs font-semibold text-gray-600">
                    Rejection reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id={`reject-reason-${req.id}`}
                    rows={3}
                    placeholder="Explain what needs to be changed…"
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 bg-white resize-y min-h-[5rem]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={!!busy || !rejectionReason.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 bg-rose-600 text-white text-sm font-bold px-4 py-3 rounded-xl hover:bg-rose-700 transition shadow-sm disabled:opacity-50"
                >
                  {busy === 'reject' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Rejecting…
                    </>
                  ) : (
                    <>
                      <FaTimesCircle className="w-3.5 h-3.5" />
                      Reject Request
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {req.rejection_reason && (
        <div className="bg-rose-50 px-5 sm:px-6 py-3 text-sm text-rose-800 border-b border-rose-100 flex items-start gap-2">
          <FaTimesCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <span className="font-bold">Rejection reason: </span>
            {req.rejection_reason}
          </div>
        </div>
      )}

      {req.feedback && (
        <div className="bg-violet-50 px-5 sm:px-6 py-3 text-sm text-violet-900 border-b border-violet-100 flex items-start gap-2">
          <FaCommentDots className="w-4 h-4 shrink-0 mt-0.5 text-violet-600" />
          <div>
            <span className="font-bold">Approver feedback: </span>
            {req.feedback}
          </div>
        </div>
      )}

      <div className="px-5 sm:px-6 py-3 border-b border-gray-100 bg-white">
        <button
          type="button"
          onClick={handleLoadVersions}
          disabled={busy === 'versions'}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[var(--brand-dark)] transition disabled:opacity-60"
        >
          <FaCodeBranch className="w-3.5 h-3.5" />
          {versions ? 'Hide version history' : 'Show version history'}
        </button>
        {versions && (
          <div className="mt-3 wc-versions" style={{ marginBottom: 0 }}>
            {versions.length === 0 ? (
              <p className="text-xs text-gray-500">No versions recorded.</p>
            ) : (
              [...versions]
                .sort((a, b) => Number(b.version_number || 0) - Number(a.version_number || 0))
                .map((v) => (
                  <WcVersionCard
                    key={v.id || v.version_number}
                    version={v}
                    isLatest={Number(v.version_number) === Number(req.current_version || 1)}
                    requestId={req.id}
                    request={req}
                  />
                ))
            )}
          </div>
        )}
      </div>

      {previewData && (
        <div className="p-5 sm:p-6 bg-slate-50 border-t space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4 flex-wrap gap-3">
            <div>
              <h4 className="text-xs font-extrabold uppercase text-gray-500 tracking-wider">
                {isHistorical
                  ? 'Submission Snapshot: Live Published vs Proposed Draft'
                  : 'Side-by-Side Comparison: Current Live vs Proposed'}
              </h4>
              {isHistorical && (
                <p className="text-[11px] text-gray-500 mt-1">
                  Showing content as it existed when this request was submitted.
                </p>
              )}
              {deployedSiteUrl ? (
                <a
                  href={deployedSiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[var(--brand)] font-bold underline mt-1 inline-block hover:opacity-80"
                >
                  View deployed advisor site ↗
                </a>
              ) : null}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                <button
                  type="button"
                  onClick={() => setPreviewMode('visual')}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${
                    previewMode === 'visual' ? 'bg-[var(--brand-dark)] text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Visual Preview
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('json')}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${
                    previewMode === 'json' ? 'bg-[var(--brand-dark)] text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  JSON Diff
                </button>
              </div>

              {batchEdits && (
                <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                  <button
                    type="button"
                    onClick={expandAllPreviewSections}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                  >
                    Expand all
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllPreviewSections}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                  >
                    Collapse all
                  </button>
                </div>
              )}
            </div>
          </div>

          {batchEdits ? (
            <div className="space-y-2">
              {batchEdits.map((item, idx) => {
                const curParsed = parseJson(item.current_content)
                const propParsed = parseJson(item.proposed_content)
                const isExpanded = expandedPreviewSections.has(idx)

                return (
                  <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => togglePreviewSection(idx)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-slate-50 transition"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          {idx + 1}
                        </span>
                        <h5 className="font-extrabold text-[var(--brand-dark)] text-sm truncate">
                          {item.section_name}
                        </h5>
                      </div>
                      <FaChevronDown
                        className={`w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                        {previewMode === 'visual' ? (
                          <SyncedSectionPreviewPair
                            sectionName={item.section_name}
                            currentData={curParsed}
                            proposedData={propParsed}
                            branding={previewData}
                            templateSlug={previewData?.template_name || 'template4'}
                            siteUrl={previewData?.site_url || null}
                            cpanelDomain={previewData?.site_url || null}
                            height={480}
                            currentLabel={isHistorical ? 'Live Published Content (at submission)' : 'Current Live Published Content'}
                            proposedLabel={isHistorical ? 'Proposed Draft Content (at submission)' : 'Proposed Draft Content'}
                          />
                        ) : (
                          <div className="grid lg:grid-cols-2 gap-4 font-mono text-xs">
                            <div className="bg-gray-50 border p-3 rounded-lg">
                              <span className="block font-sans font-bold text-gray-500 mb-1 text-[11px]">Current (Raw)</span>
                              <pre className="whitespace-pre-wrap">{item.current_content || 'None'}</pre>
                            </div>
                            <div className="bg-emerald-50/50 border border-emerald-300 p-3 rounded-lg">
                              <span className="block font-sans font-bold text-emerald-800 mb-1 text-[11px]">Proposed (Raw)</span>
                              <pre className="whitespace-pre-wrap">{item.proposed_content}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <SyncedSectionPreviewPair
              sectionName={req.section?.name}
              currentData={parseJson(previewData.current_content)}
              proposedData={parseJson(previewData.proposed_content)}
              branding={previewData}
              templateSlug={previewData?.template_name || 'template4'}
              siteUrl={previewData?.site_url || null}
              cpanelDomain={previewData?.site_url || null}
              height={480}
              currentLabel={isHistorical ? 'Live Published Content (at submission)' : 'Current Live Published Content'}
              proposedLabel={isHistorical ? 'Proposed Draft Content (at submission)' : 'Proposed Draft Content'}
            />
          )}
        </div>
      )}
    </div>
  )
})

export default function ReviewQueuePanel({ variant = 'active' } = {}) {
  const { user } = useAuth()
  const { can, complianceStatusLabel } = useHub()
  // Hub-wide list when view-all or change-status is granted. Approver role must never
  // inherit hub-wide history from a stale matrix default — only requests they picked.
  const canChangeStatus = can('wc_change_request_status')
  const canViewAll =
    (can('wc_view_all_change_requests') || canChangeStatus)
    && String(user?.role || '') !== 'approver'
  const [requests, setRequests] = useState([])
  const previewSnapshotsRef = useRef({})
  const snapshotsLoadedRef = useRef(false)
  const [previewSnapshots, setPreviewSnapshots] = useState({})
  const ensurePreviewSnapshotsLoaded = useCallback(() => {
    if (snapshotsLoadedRef.current) return previewSnapshotsRef.current
    const loaded = loadPreviewSnapshots()
    previewSnapshotsRef.current = loaded
    setPreviewSnapshots(loaded)
    snapshotsLoadedRef.current = true
    return loaded
  }, [])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [pickingId, setPickingId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const cachePreview = useCallback((requestId, preview) => {
    if (!preview) return
    const baseSnapshots = ensurePreviewSnapshotsLoaded()
    const next = savePreviewSnapshot(baseSnapshots, requestId, preview)
    previewSnapshotsRef.current = next
    setPreviewSnapshots(next)
  }, [ensurePreviewSnapshotsLoaded])

  const getCachedPreview = useCallback(
    (requestId) => {
      ensurePreviewSnapshotsLoaded()
      return previewSnapshotsRef.current[requestId] || null
    },
    [ensurePreviewSnapshotsLoaded]
  )

  const fetchRequests = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const res = await api.get('/change-requests')
      setRequests(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load requests.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleStatusChange = useCallback((id, updates) => {
    setRequests(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)))
  }, [])

  const filteredRequests = useMemo(() => {
    let list = variant === 'history'
      ? requests.filter(r => !ACTIVE_STATUSES.has(r.status))
      : requests.filter(r => ACTIVE_STATUSES.has(r.status))

    // Approvers without view-all only see their own completed/assigned work in history.
    if (variant === 'history' && !canViewAll) {
      list = list.filter(r => Number(r.approver_id) === Number(user?.id))
    }

    // Active queue without view-all: pickup pool (unassigned pending) + assigned to me.
    if (variant === 'active' && !canViewAll) {
      list = list.filter(r => {
        const mine = Number(r.approver_id) === Number(user?.id)
        const pickup = r.status === 'pending' && !r.approver_id
        return mine || pickup
      })
    }

    return list
  }, [requests, variant, canViewAll, user?.id])

  const selectedReq = useMemo(
    () => filteredRequests.find((r) => r.id === selectedId) || null,
    [filteredRequests, selectedId]
  )

  useEffect(() => {
    if (selectedId && !filteredRequests.some((r) => r.id === selectedId)) {
      setSelectedId(null)
    }
  }, [filteredRequests, selectedId])

  const handlePick = useCallback(async (req) => {
    setPickingId(req.id)
    setError('')
    setMessage('')
    try {
      await api.post(`/change-requests/${req.id}/assign`)
      handleStatusChange(req.id, {
        status: 'pending',
        approver_id: user.id,
        approver: user,
      })
      setSelectedId(req.id)
      setMessage('Request picked up. You can now review and approve or reject.')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not pick up this request.')
    } finally {
      setPickingId(null)
    }
  }, [handleStatusChange, user])

  const columns = useMemo(() => [
    {
      key: 'id',
      label: 'ID',
      render: (row) => `#${row.id}`,
      filterValue: (row) => String(row.id),
    },
    {
      key: 'section',
      label: 'Section',
      render: (row) => {
        const { type, names } = getRequestSections(row)
        return (
          <span>
            {getSectionLabel(row)}
            {type === 'batch' ? (
              <span className="muted" style={{ display: 'block', fontSize: 11 }}>
                {names.length} sections
              </span>
            ) : null}
          </span>
        )
      },
      filterValue: (row) => getSectionLabel(row),
    },
    {
      key: 'editor',
      label: 'Editor',
      render: (row) =>
        row.attribution_label || row.on_behalf_by?.name ? (
          <OnBehalfAttribution row={row} ownerKey="editor" flush />
        ) : (
          row.editor?.name || '—'
        ),
      filterValue: (row) =>
        [row.editor?.name, row.on_behalf_by?.name, row.attribution_label].filter(Boolean).join(' '),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} scheduledAt={row.scheduled_at} />,
      filterValue: (row) => complianceStatusLabel(row.status) || row.status || '',
    },
    {
      key: 'approver',
      label: 'Approver',
      render: (row) => row.approver?.name || '—',
      filterValue: (row) => row.approver?.name || '',
    },
    {
      key: 'created_at',
      label: 'Submitted',
      render: (row) => (row.created_at ? new Date(row.created_at).toLocaleString() : '—'),
      filterValue: (row) => (row.created_at ? new Date(row.created_at).toLocaleString() : ''),
    },
    {
      key: 'version',
      label: 'Version',
      render: (row) => (row.current_version ? `v${row.current_version}` : '—'),
      filterValue: (row) => String(row.current_version || ''),
    },
  ], [complianceStatusLabel])

  return (
    <div>
      {message && <AlertBanner type="success" message={message} onDismiss={() => setMessage('')} />}
      {error && <AlertBanner type="error" message={error} onDismiss={() => setError('')} />}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 justify-end">
        <button
          type="button"
          onClick={() => fetchRequests(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition shadow-sm disabled:opacity-60 shrink-0"
        >
          <FaSync className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <DataGrid
        columns={columns}
        rows={filteredRequests}
        loading={loading}
        pageSize={10}
        emptyMessage={
          variant === 'history'
            ? (canViewAll ? 'No history yet' : 'No reviews assigned to you yet')
            : 'No change requests found'
        }
        actions={(row) => {
          const canPick = row.status === 'pending' && !row.approver_id
          const isAssignedToMe = Number(row.approver_id) === Number(user?.id)
          const canReview =
            isAssignedToMe && (row.status === 'under_review' || row.status === 'pending')
          const isSelected = selectedId === row.id

          return (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/my-dashboard/website-compliance/my-requests/${row.id}`}
                state={{ from: variant === 'history' ? 'history' : 'queue' }}
                className="btn ghost"
              >
                Open
              </Link>
              {canPick ? (
                <button
                  type="button"
                  className="btn primary"
                  disabled={pickingId === row.id}
                  onClick={() => handlePick(row)}
                >
                  {pickingId === row.id ? 'Picking…' : 'Pick it'}
                </button>
              ) : null}
              {canReview ? (
                <button
                  type="button"
                  className={`btn ${isSelected ? 'ghost' : 'primary'}`}
                  onClick={() => setSelectedId(isSelected ? null : row.id)}
                >
                  {isSelected ? 'Hide review' : 'Approve / Reject'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setSelectedId(isSelected ? null : row.id)}
                >
                  {isSelected ? 'Hide' : 'Details'}
                </button>
              )}
            </div>
          )
        }}
      />

      {selectedReq ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-[var(--brand-dark)]">
              Reviewing request #{selectedReq.id}
            </h3>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setSelectedId(null)}
            >
              Close
            </button>
          </div>
          <RequestCard
            req={selectedReq}
            user={user}
            onStatusChange={handleStatusChange}
            onMessage={setMessage}
            onError={setError}
            getCachedPreview={getCachedPreview}
            cachePreview={cachePreview}
            canChangeStatus={canChangeStatus && variant !== 'history'}
          />
        </div>
      ) : null}
    </div>
  )
}
