import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  FaArrowLeft,
  FaBuilding,
  FaClipboardCheck,
  FaClock,
  FaCodeBranch,
  FaLayerGroup,
  FaUser,
} from 'react-icons/fa'
import { api } from '../api/client'
import ComplianceStatusText from '../components/ComplianceStatusText'
import { DataGridDate } from '../components/DataGrid'
import DateTimeText from '../components/DateTimeText'
import RequiredMark from '../components/RequiredMark'
import RichTextDisplay from '../components/RichTextDisplay'
import SupportingFilesPicker from '../components/SupportingFilesPicker'
import WcStatusBadge, { WcVersionCard } from '../components/WebsiteComplianceUI'
import {
  compliancePostBody,
} from '../utils/complianceSupportingFiles'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import ChangeRequestPreviewPanel from '../websiteCompliance/components/ChangeRequestPreviewPanel'
import ChangeRequestReviewActions from '../websiteCompliance/components/ChangeRequestReviewActions'
import { isHistoricalRequest } from '../websiteCompliance/utils/changeRequestPreview'
import { reviewersForSubmitterFirm } from '../utils/firmAssigneeFilter'
import {
  wcSectionTitle,
} from '../utils/websiteCompliance'

function MetaItem({ icon: Icon, label, children }) {
  return (
    <div className="wc-detail-meta__item">
      <div className="wc-detail-meta__icon">
        <Icon />
      </div>
      <div className="min-w-0">
        <p className="wc-detail-meta__label">{label}</p>
        <div className="wc-detail-meta__value">{children}</div>
      </div>
    </div>
  )
}

export default function WebsiteComplianceRequestDetail() {
  const { id } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const { can, loading: hubLoading, complianceStatusLabel, effectiveAdvisorId, roleLabel } = useHub()

  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [reviewers, setReviewers] = useState([])
  const [assignTo, setAssignTo] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [confirmSupportingFiles, setConfirmSupportingFiles] = useState([])

  const moduleOn = can('module_website_compliance')
  const canSubmit = can('wc_submit_change_requests') || can('wc_edit_sections')
  const canReview = can('wc_review_change_requests')
  const canAssign = can('wc_assign_change_requests')
  const canChangeStatus = can('wc_change_request_status')
  const canViewAll =
    can('wc_view_all_change_requests') && String(user?.role || '') !== 'approver'

  const backFrom = location.state?.from
  const backTo =
    backFrom === 'queue' || backFrom === 'review'
      ? '/my-dashboard/website-compliance/review'
      : backFrom === 'history'
        ? '/my-dashboard/website-compliance/history'
        : backFrom === 'assign'
          ? '/my-dashboard/website-compliance/assign'
          : '/my-dashboard/website-compliance/my-requests'
  const backLabel =
    backTo.endsWith('/review')
      ? 'Back to review queue'
      : backTo.endsWith('/history')
        ? 'Back to history'
        : backTo.endsWith('/assign')
          ? 'Back to assign'
          : 'Back to my requests'

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.websiteComplianceShowChangeRequest(id)
      const next = data?.change_request || data
      setRow(next)
      setAssignTo(next?.approver_id ? String(next.approver_id) : '')
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

  useEffect(() => {
    if (hubLoading || !moduleOn || !canAssign) return undefined
    let cancelled = false
    api
      .websiteComplianceReviewers()
      .then((data) => {
        if (!cancelled) setReviewers(Array.isArray(data) ? data : data?.data || [])
      })
      .catch(() => {
        if (!cancelled) setReviewers([])
      })
    return () => {
      cancelled = true
    }
  }, [hubLoading, moduleOn, canAssign])

  const isOwner =
    row &&
    user &&
    (Number(row.editor_id) === Number(user.id) ||
      (effectiveAdvisorId != null && Number(row.editor_id) === Number(effectiveAdvisorId)))

  const statusLocked = row?.status === 'approved' || row?.status === 'scheduled'
  const canShowReviewActions =
    (canReview || canChangeStatus) && row && !statusLocked
  const canShowAssign =
    canAssign &&
    row &&
    (row.status === 'pending' || row.status === 'under_review')
  const eligibleReviewers = reviewersForSubmitterFirm(reviewers, row?.editor?.firm)

  const confirmFeedback = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const body = compliancePostBody({}, confirmSupportingFiles)
      const data = await api.websiteComplianceConfirmChangeRequestFeedback(id, body)
      setRow(data?.change_request || data)
      setConfirmSupportingFiles([])
      setMessage('Request confirmed as Approved.')
    } catch (err) {
      setError(err.message || err.data?.message || 'Confirm failed.')
    } finally {
      setSaving(false)
    }
  }

  const saveAssign = async (e) => {
    e.preventDefault()
    if (!assignTo) {
      setError(`Please select an ${roleLabel('approver').toLowerCase()} before assigning.`)
      return
    }
    setAssigning(true)
    setError('')
    setMessage('')
    try {
      const data = await api.websiteComplianceAssignToApprover(id, {
        approver_id: Number(assignTo),
      })
      setRow(typeof data === 'object' && data?.id ? data : data?.change_request || data)
      setMessage(`Assigned to ${roleLabel('approver').toLowerCase()}.`)
    } catch (err) {
      setError(err.message || err.data?.message || 'Failed to assign request.')
    } finally {
      setAssigning(false)
    }
  }

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <p className="muted">Website Content Pre Approval module is off for this hub.</p>
      </section>
    )
  }

  if (loading) return <div className="state">Loading...</div>
  if (error && !row) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Content Pre Approval</p>
            <h1>Request</h1>
          </div>
          <Link to={backTo} className="btn ghost">
            ← {backLabel}
          </Link>
        </div>
        <div className="alert">{error}</div>
      </section>
    )
  }
  if (!row) return null

  const versions = [...(row.versions || [])].sort(
    (a, b) => Number(b.version_number || 0) - Number(a.version_number || 0)
  )
  const editorPath = `/my-dashboard/website-compliance/content-editor`
  const sectionLabel = wcSectionTitle(row) || '—'
  const submittedBy = row.attribution_label
    ? row.attribution_label
    : row.on_behalf_by?.name
      ? `${row.on_behalf_by.name} submitted on behalf of ${row.editor?.name || 'Advisor'}`
      : row.editor?.name || 'Advisor'

  return (
    <section className="wc-detail">
      <div className="page-head">
        <div>
          <p className="eyebrow">Website Content Pre Approval</p>
          <h1 className="wc-detail__title">
            <span>Request #{row.id}</span>
            <WcStatusBadge
              status={row.status}
              at={row.reviewed_at || row.scheduled_at || row.updated_at || row.created_at}
            />
          </h1>
          <p className="muted wc-detail__subtitle">
            {sectionLabel}
            <span aria-hidden="true"> · </span>
            v{row.current_version || 1}
            <span aria-hidden="true"> · </span>
            <DateTimeText value={row.created_at} />
          </p>
        </div>
        <Link to={backTo} className="btn ghost">
          <FaArrowLeft className="w-3.5 h-3.5" style={{ marginRight: 6 }} />
          {backLabel}
        </Link>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <div className="wc-detail-meta">
        <MetaItem icon={FaLayerGroup} label="Section">
          {sectionLabel}
        </MetaItem>
        <MetaItem icon={FaUser} label="Submitted by">
          {submittedBy}
        </MetaItem>
        <MetaItem icon={FaBuilding} label="Firm">
          {row.editor?.firm?.name || '—'}
        </MetaItem>
        <MetaItem icon={FaClipboardCheck} label="Approver">
          {row.approver?.name || <span className="muted">Unassigned</span>}
        </MetaItem>
        <MetaItem icon={FaCodeBranch} label="Version">
          v{row.current_version || 1}
        </MetaItem>
        <MetaItem icon={FaClock} label="Submitted">
          <DataGridDate value={row.created_at} />
        </MetaItem>
      </div>

      {row.feedback ? (
        <div className="wc-detail-callout wc-detail-callout--feedback">
          <p className="wc-detail-callout__title">Approver feedback</p>
          <RichTextDisplay html={row.feedback} className="wc-feedback" />
        </div>
      ) : null}

      {row.rejection_reason ? (
        <div className="wc-detail-callout wc-detail-callout--reject">
          <p className="wc-detail-callout__title">Rejection reason</p>
          <RichTextDisplay html={row.rejection_reason} className="wc-feedback" />
        </div>
      ) : null}

      {canShowReviewActions ? (
        <ChangeRequestReviewActions
          request={row}
          user={user}
          canViewAll={canViewAll}
          canOverrideStatus={canChangeStatus}
          onUpdated={(next) => setRow(next)}
          onMessage={setMessage}
          onError={setError}
        />
      ) : null}

      {canChangeStatus && statusLocked ? (
        <div className="admin-form wc-panel wc-detail-card">
          <h2>Change status</h2>
          <p className="muted">
            Status cannot be changed once this content is published to the website or a publish
            schedule is set.
          </p>
        </div>
      ) : null}

      {canShowAssign ? (
        <form className="admin-form wc-panel wc-detail-card" onSubmit={saveAssign}>
          <h2>Assign to {roleLabel('approver')}</h2>
          <p className="muted">
            Route this pending request to an {roleLabel('approver').toLowerCase()} for review.
            Firm visibility still applies.
          </p>
          <label>
            <RequiredMark>{roleLabel('approver')}</RequiredMark>
            <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} required>
              <option value="">Choose {roleLabel('approver').toLowerCase()}…</option>
              {(eligibleReviewers.length ? eligibleReviewers : reviewers).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.firm?.name ? ` (${r.firm.name})` : ''}
                </option>
              ))}
            </select>
          </label>
          {eligibleReviewers.length === 0 && reviewers.length === 0 ? (
            <p className="field-hint">
              No {roleLabel('approver').toLowerCase()}s available to assign.
            </p>
          ) : null}
          <div className="actions">
            <button
              className="btn primary"
              disabled={assigning || !assignTo}
            >
              {assigning ? 'Assigning…' : row.approver_id ? 'Reassign' : 'Assign'}
            </button>
          </div>
        </form>
      ) : null}

      {isOwner && canSubmit && row.status === 'approved_with_feedback' ? (
        <div className="admin-form wc-panel wc-detail-card">
          <h2>
            <ComplianceStatusText
              status="approved_with_feedback"
              label={
                complianceStatusLabel
                  ? complianceStatusLabel('approved_with_feedback')
                  : 'Approved with Feedback'
              }
            />
          </h2>
          <p className="muted">
            Confirm as approved without changes, or open the content editor to revise only the
            previous version&apos;s sections and publish.
          </p>
          <div className="wc-supporting-files-card" style={{ marginBottom: '1rem' }}>
            <p className="wc-supporting-files-card__title">Supporting files (optional)</p>
            <p className="wc-supporting-files-card__hint">
              Attach evidence when confirming this request as approved.
            </p>
            <SupportingFilesPicker
              id="wc-confirm-supporting-files"
              files={confirmSupportingFiles}
              onChange={setConfirmSupportingFiles}
              label={null}
              hint={null}
            />
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn primary"
              disabled={saving}
              onClick={confirmFeedback}
            >
              {saving ? 'Publishing…' : 'Confirm approved'}
            </button>
            <Link className="btn ghost" to={editorPath}>
              Edit sections &amp; publish
            </Link>
          </div>
        </div>
      ) : null}

      {isOwner && canSubmit && row.status === 'rejected' ? (
        <div className="admin-form wc-panel wc-detail-card">
          <h2>Rejected — resubmit</h2>
          <p className="muted">
            Only sections from the previous version can be edited. Open the content editor to revise
            those sections and resubmit.
          </p>
          <div className="actions">
            <Link className="btn primary" to={editorPath}>
              Open content editor to resubmit
            </Link>
          </div>
        </div>
      ) : null}

      {/* Tailwind WC utilities are scoped to `.wc-app` — required for preview components. */}
      <div className="wc-app wc-detail-body">
        <div className="wc-panel wc-detail-card wc-detail-preview">
          <div className="wc-detail-card__head">
            <h2>Content preview</h2>
            <p className="muted">Compare live published content with the proposed draft.</p>
          </div>
          <ChangeRequestPreviewPanel
            request={row}
            requestId={row.id}
            historical={isHistoricalRequest(row)}
            defaultOpen
          />
        </div>

        <div className="wc-panel wc-detail-card wc-detail-versions">
          <div className="wc-detail-card__head">
            <h2>Version history</h2>
            <p className="muted">
              {versions.length
                ? `${versions.length} version${versions.length === 1 ? '' : 's'} recorded for this request.`
                : 'No versions recorded for this request yet.'}
            </p>
          </div>
          <div className="wc-versions">
            {versions.length === 0 ? (
              <p className="muted">No versions recorded for this request yet.</p>
            ) : (
              versions.map((ver) => (
                <WcVersionCard
                  key={ver.id || ver.version_number}
                  version={ver}
                  isLatest={Number(ver.version_number) === Number(row.current_version || 1)}
                  requestId={row.id}
                  request={row}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
