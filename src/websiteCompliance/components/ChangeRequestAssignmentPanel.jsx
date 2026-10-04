import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { Link } from 'react-router-dom'
import {
  FaClock,
  FaTimes,
  FaTimesCircle,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaChevronDown,
  FaChevronUp,
  FaLayerGroup,
  FaSync,
  FaUserCheck,
  FaCommentDots,
  FaCodeBranch,
} from 'react-icons/fa'
import { api as hubApi } from '../../api/client'
import api from '../wcApi'
import { useHub } from '../../context/HubContext'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../../components/DataGrid'
import RichTextDisplay from '../../components/RichTextDisplay'
import WcStatusBadge from '../../components/WebsiteComplianceUI'
import { formatDateTime, complianceStatusChangedAt } from '../../utils/dateFormat'
import { gridActorName } from '../../utils/submissionAttribution'
import { parseJson } from '../utils/parseJson'
import {
  buildPreviewFromRequest,
  isHistoricalRequest,
  loadPreviewSnapshots,
  previewHasStoredSnapshot,
  resolveRequestPreview,
  savePreviewSnapshot,
} from '../utils/changeRequestPreview'
import SyncedSectionPreviewPair from './SyncedSectionPreviewPair'
import { reviewersForSubmitterFirm } from '../../utils/firmAssigneeFilter'
import OnBehalfAttribution from '../../components/OnBehalfAttribution'

const PENDING_STATUS = 'pending'
const PREVIOUS_STATUSES = new Set([
  'under_review',
  'scheduled',
  'approved',
  'rejected',
  'approved_with_feedback',
])

function getRequestSections(req) {
  if (req.section?.name) {
    return { type: 'single', names: [req.section.name] }
  }
  if (Array.isArray(req.section_edits) && req.section_edits.length > 0) {
    return {
      type: 'batch',
      names: req.section_edits.map((e) => e.section_name || 'Section'),
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

function AlertBanner({ type, message, onDismiss }) {
  const isSuccess = type === 'success'
  return (
    <div className={`alert${isSuccess ? ' success' : ''}`} role="alert" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onDismiss} className="btn ghost" aria-label="Dismiss">
        <FaTimes />
      </button>
    </div>
  )
}

const AssignmentRequestCard = memo(function AssignmentRequestCard({
  req,
  approvers,
  selectedApproverId,
  onSelectApprover,
  onAssign,
  assigning,
  canAssign,
  onMessage,
  onError,
  getCachedPreview,
  cachePreview,
}) {
  const { roleLabel } = useHub()
  const approverLabel = roleLabel('approver')
  const [previewData, setPreviewData] = useState(null)
  const [previewMode, setPreviewMode] = useState('visual')
  const [expandedPreviewSections, setExpandedPreviewSections] = useState(() => new Set())
  const [busy, setBusy] = useState(null)

  const isPending = req.status === PENDING_STATUS
  const isHistorical = isHistoricalRequest(req)
  const batchEdits = previewData?.is_batch && Array.isArray(previewData.edits) ? previewData.edits : null

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
      if (nextPreview && !isHistorical) {
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

  const handleAssign = () => {
    if (!selectedApproverId) {
      onError(`Please select an ${approverLabel.toLowerCase()} before assigning.`)
      return
    }
    onAssign(req.id, selectedApproverId)
  }

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
              <WcStatusBadge
                status={req.status}
                at={req.reviewed_at || req.scheduled_at || req.updated_at || req.created_at}
              />
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
                <DataGridDate value={req.created_at} />
              </span>
              {req.approver && (
                <span className="inline-flex items-center gap-1.5">
                  <FaUserCheck className="w-3 h-3 text-[var(--brand)]" />
                  <span>Assigned to <strong className="text-[var(--brand)]">{req.approver.name}</strong></span>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleTogglePreview}
            disabled={busy === 'preview'}
            className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-60 shrink-0 ${
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
        </div>
      </div>

      {isPending && canAssign && (
        <div className="bg-amber-50 border-b border-amber-100 px-5 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <FaUserCheck className="w-4 h-4 shrink-0" />
                {req.approver_id ? `Reassign ${approverLabel}` : `Assign to ${approverLabel}`}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Select an {approverLabel.toLowerCase()} from your team to review this request.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 sm:min-w-[320px]">
              <select
                value={selectedApproverId || ''}
                onChange={e => onSelectApprover(req.id, e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-dark)_20%,transparent)] focus:border-[var(--brand-dark)] bg-white"
              >
                <option value="">Choose {approverLabel.toLowerCase()}…</option>
                {approvers.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.email}){a.firm?.name ? ` — ${a.firm.name}` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAssign}
                disabled={assigning === req.id || !selectedApproverId}
                className="inline-flex items-center justify-center gap-2 bg-[var(--brand-dark)] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition shadow-sm disabled:opacity-50 shrink-0"
              >
                {assigning === req.id ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Assigning…
                  </>
                ) : (
                  <>
                    <FaUserCheck className="w-3.5 h-3.5" />
                    {req.approver_id ? 'Reassign' : 'Assign'}
                  </>
                )}
              </button>
            </div>
          </div>
          {approvers.length === 0 && (
            <p className="text-xs text-amber-800 mt-3 bg-amber-100/60 rounded-lg px-3 py-2">
              No {approverLabel.toLowerCase()}s found. Create an {approverLabel.toLowerCase()} account first.
            </p>
          )}
        </div>
      )}

      {req.rejection_reason && (
        <div className="bg-rose-50 px-5 sm:px-6 py-3 text-sm text-rose-800 border-b border-rose-100 flex items-start gap-2">
          <FaTimesCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <span className="font-bold">Rejection reason: </span>
            <RichTextDisplay html={req.rejection_reason} empty="" />
          </div>
        </div>
      )}

      {req.feedback && (
        <div className="bg-violet-50 px-5 sm:px-6 py-3 text-sm text-violet-900 border-b border-violet-100 flex items-start gap-2">
          <FaCommentDots className="w-4 h-4 shrink-0 mt-0.5 text-violet-600" />
          <div>
            <span className="font-bold">Approver feedback: </span>
            <RichTextDisplay html={req.feedback} empty="" />
          </div>
        </div>
      )}

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
                            currentLabel={isHistorical ? 'Live Published (at submission)' : 'Current Live Published'}
                            proposedLabel={isHistorical ? 'Proposed Draft (at submission)' : 'Proposed Draft'}
                          />
                        ) : (
                          <div className="grid lg:grid-cols-2 gap-4 font-mono text-xs">
                            <div className="bg-gray-50 border p-3 rounded-lg">
                              <span className="block font-sans font-bold text-gray-500 mb-1 text-[11px]">Current</span>
                              <pre className="whitespace-pre-wrap">{item.current_content || 'None'}</pre>
                            </div>
                            <div className="bg-emerald-50/50 border border-emerald-300 p-3 rounded-lg">
                              <span className="block font-sans font-bold text-emerald-800 mb-1 text-[11px]">Proposed</span>
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
              currentLabel={isHistorical ? 'Live Published (at submission)' : 'Current Live Published'}
              proposedLabel={isHistorical ? 'Proposed Draft (at submission)' : 'Proposed Draft'}
            />
          )}
        </div>
      )}
    </div>
  )
})

export default function ChangeRequestAssignmentPanel({
  variant = 'pending',
  onMessage: externalOnMessage,
  onError: externalOnError,
}) {
  const { can, roleLabel, complianceStatusLabel } = useHub()
  const canAssign = can('wc_assign_change_requests') && variant === 'pending'

  const [localMessage, setLocalMessage] = useState('')
  const [localError, setLocalError] = useState('')
  const [requests, setRequests] = useState([])
  const [users, setUsers] = useState([])
  const [selectedApprover, setSelectedApprover] = useState({})
  const [assigningId, setAssigningId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
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

  const useLocalBanners = externalOnMessage == null && externalOnError == null
  const reportMessage = useCallback((msg) => {
    if (externalOnMessage) externalOnMessage(msg)
    else setLocalMessage(msg)
  }, [externalOnMessage])
  const reportError = useCallback((msg) => {
    if (externalOnError) externalOnError(msg)
    else setLocalError(msg)
  }, [externalOnError])

  const approvers = useMemo(() => {
    // Backend already filters to roles that can review; keep all returned users.
    return Array.isArray(users) ? users : []
  }, [users])

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

  const fetchRequests = useCallback(async () => {
    const data = await hubApi.websiteComplianceChangeRequests({ per_page: 100 })
    const list = Array.isArray(data) ? data : data?.data || []
    setRequests(list)
    return list
  }, [])

  const fetchUsers = useCallback(async () => {
    const data = await hubApi.websiteComplianceReviewers()
    setUsers(Array.isArray(data) ? data : data?.data || [])
  }, [])

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    if (useLocalBanners) setLocalError('')
    try {
      await Promise.all([fetchRequests(), fetchUsers()])
    } catch (err) {
      reportError(err.message || err.data?.message || err.response?.data?.message || 'Failed to load change requests.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [fetchRequests, fetchUsers, reportError, useLocalBanners])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const filteredRequests = useMemo(() => {
    return variant === 'history'
      ? requests.filter((r) => PREVIOUS_STATUSES.has(r.status))
      : // Pending inbox for assign/reassign (include already-assigned pending).
        requests.filter(
          (r) => r.status === PENDING_STATUS || r.status === 'under_review'
        )
  }, [requests, variant])

  const selectedReq = useMemo(
    () => filteredRequests.find((r) => r.id === selectedId) || null,
    [filteredRequests, selectedId]
  )

  useEffect(() => {
    if (selectedId && !filteredRequests.some((r) => r.id === selectedId)) {
      setSelectedId(null)
    }
  }, [filteredRequests, selectedId])

  const handleAssign = async (requestId, approverId) => {
    setAssigningId(requestId)
    reportError('')
    reportMessage('')
    try {
      await hubApi.websiteComplianceAssignToApprover(requestId, {
        approver_id: Number(approverId),
      })
      reportMessage(`Request assigned to ${roleLabel('approver').toLowerCase()} successfully.`)
      await fetchRequests()
      setSelectedApprover((prev) => {
        const next = { ...prev }
        delete next[requestId]
        return next
      })
      if (selectedId === requestId) setSelectedId(null)
    } catch (err) {
      reportError(err.message || err.data?.message || err.response?.data?.message || 'Failed to assign request.')
    } finally {
      setAssigningId(null)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'id',
        label: '#',
        narrow: true,
        render: (row) => <strong>#{row.id}</strong>,
        filterValue: (row) => String(row.id),
        sortValue: (row) => Number(row.id) || 0,
      },
      {
        key: 'section',
        label: 'Section',
        grow: true,
        render: (row) => getSectionLabel(row),
        filterValue: (row) => getSectionLabel(row),
      },
      {
        key: 'editor',
        label: 'Submitted by',
        render: (row) => gridActorName(row, 'editor'),
        filterValue: (row) => gridActorName(row, 'editor'),
      },
      {
        key: 'firm',
        label: 'Firm',
        render: (row) => row.editor?.firm?.name || '—',
        filterValue: (row) => row.editor?.firm?.name || '',
      },
      {
        key: 'status',
        label: 'Status',
        fit: true,
        render: (row) => (
          <WcStatusBadge
            status={row.status}
            at={complianceStatusChangedAt(row) || row.updated_at || row.created_at}
          />
        ),
        filterValue: (row) =>
          [complianceStatusLabel(row.status) || row.status, formatDateTime(complianceStatusChangedAt(row), '')]
            .filter(Boolean)
            .join(' '),
        truncate: false,
      },
      {
        key: 'approver',
        label: 'Approver',
        render: (row) => row.approver?.name || <span className="muted">Unassigned</span>,
        filterValue: (row) => row.approver?.name || 'Unassigned',
      },
      {
        key: 'created_at',
        label: 'Submitted',
        date: true,
        render: (row) => <DataGridDate value={row.created_at} />,
        filterValue: (row) => formatDateTime(row.created_at, ''),
        sortValue: (row) => (row.created_at ? new Date(row.created_at).getTime() : 0),
        truncate: false,
      },
    ],
    [complianceStatusLabel]
  )

  const emptyTitle = variant === 'history' ? 'No history yet' : 'No pending requests to assign'

  return (
    <div>
      {useLocalBanners && localMessage ? (
        <AlertBanner type="success" message={localMessage} onDismiss={() => setLocalMessage('')} />
      ) : null}
      {useLocalBanners && localError ? (
        <AlertBanner type="error" message={localError} onDismiss={() => setLocalError('')} />
      ) : null}

      <div className="filters-row" style={{ justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button
          type="button"
          className="btn ghost"
          onClick={() => loadAll(true)}
          disabled={refreshing || loading}
        >
          <FaSync aria-hidden style={{ marginRight: 6 }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <DataGrid
        columns={columns}
        rows={filteredRequests}
        loading={loading}
        pageSize={10}
        emptyMessage={emptyTitle}
        actionsLabel="Actions"
        actions={(row) => {
          const isAssignable =
            row.status === PENDING_STATUS || row.status === 'under_review'
          const filtered = reviewersForSubmitterFirm(approvers, row.editor?.firm)
          const rowApprovers = filtered.length ? filtered : approvers

          return (
            <>
              {isAssignable && canAssign ? (
                <select
                  key={`${row.id}-${row.approver_id || 'none'}-${assigningId === row.id ? 'busy' : 'idle'}`}
                  className="data-grid__inline-select"
                  defaultValue=""
                  disabled={assigningId === row.id || rowApprovers.length === 0}
                  onChange={(e) => {
                    const value = e.target.value
                    if (!value) return
                    handleAssign(row.id, value)
                  }}
                  aria-label={`Assign ${roleLabel('approver').toLowerCase()}`}
                  title={
                    rowApprovers.length
                      ? `Assign ${roleLabel('approver').toLowerCase()}`
                      : `No ${roleLabel('approver').toLowerCase()}s available`
                  }
                >
                  <option value="">
                    {rowApprovers.length
                      ? row.approver_id
                        ? 'Reassign…'
                        : 'Assign…'
                      : 'No approvers'}
                  </option>
                  {rowApprovers.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <DataGridIconBtn
                as={Link}
                to={`/my-dashboard/website-compliance/my-requests/${row.id}`}
                state={{ from: 'assign' }}
                icon={FaEye}
                label="Open"
              />
            </>
          )
        }}
      />
    </div>
  )
}
