import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import {
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaTimesCircle,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaCalendarCheck,
  FaChevronDown,
  FaChevronUp,
  FaLayerGroup,
  FaInbox,
  FaClipboardCheck,
  FaSearch,
  FaSync,
  FaUserCheck,
  FaCommentDots,
  FaCodeBranch,
} from 'react-icons/fa'
import api from '../wcApi'
import { useHub } from '../../context/HubContext'
import { parseJson } from '../utils/parseJson'
import {
  buildPreviewFromRequest,
  isHistoricalRequest,
  loadPreviewSnapshots,
  previewHasStoredSnapshot,
  resolveRequestPreview,
  savePreviewSnapshot,
} from '../utils/changeRequestPreview'
import SectionIframePreview from './SectionIframePreview'

const PENDING_STATUS = 'pending'
const PREVIOUS_STATUSES = new Set(['under_review', 'scheduled', 'approved', 'rejected', 'approved_with_feedback'])

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Assignment',
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

function getRequestSearchText(req) {
  const { type, names } = getRequestSections(req)
  const idText = `request ${req.id}`
  if (type === 'single') return `${names[0]} ${idText}`
  if (type === 'batch') return `${names.join(' ')} ${idText}`
  // Fallback for search only: some requests may not include `section` / `section_edits`
  // and instead store section data inside `proposed_content` (JSON). We avoid parsing
  // during initial render for performance, but do it here when the user is searching.
  try {
    const parsed = JSON.parse(req.proposed_content)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const derivedNames = parsed.map(p => p.section_name || 'Section')
      return `${derivedNames.join(' ')} ${idText}`
    }
  } catch { /* ignore */ }

  return `Change Request ${req.id}`
}

function RequestTitle({ req }) {
  const [expanded, setExpanded] = useState(false)
  const { type, names } = useMemo(() => getRequestSections(req), [req.id, req.section, req.section_edits, req.proposed_content])

  if (type === 'single') {
    return (
      <h3 className="text-base sm:text-lg font-bold text-[#0B1B3D]">
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
          <h3 className="text-base sm:text-lg font-bold text-[#0B1B3D]">Request #{req.id}</h3>
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
                className="inline-flex items-center gap-1 ml-1.5 text-[#C8102E] font-bold hover:underline shrink-0"
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
              className="inline-flex items-center gap-1 mt-2 text-xs text-[#C8102E] font-bold hover:underline"
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
    <h3 className="text-base sm:text-lg font-bold text-[#0B1B3D]">
      Change Request #{req.id}
    </h3>
  )
}

function StatusBadge({ status, scheduledAt }) {
  const config = STATUS_CONFIG[status]
  if (!config) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border bg-gray-50 text-gray-700 border-gray-200">
        {status}
      </span>
    )
  }
  const Icon = config.icon
  const label = status === 'scheduled' && scheduledAt
    ? `${config.label} · ${new Date(scheduledAt).toLocaleString()}`
    : config.label
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
  const getRoleLabel = (k) => ({ power_admin: 'Power Admin', advisor: 'Advisor', approver: 'Approver', manager: 'Manager', client_admin: 'Client Admin' }[k] || k)
  const approverLabel = getRoleLabel('approver')
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
                <span>Submitted by <strong className="text-gray-700">{req.editor?.name || 'Editor'}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FaClock className="w-3 h-3 text-gray-400" />
                <span>{new Date(req.created_at).toLocaleString()}</span>
              </span>
              {req.approver && (
                <span className="inline-flex items-center gap-1.5">
                  <FaUserCheck className="w-3 h-3 text-[#C8102E]" />
                  <span>Assigned to <strong className="text-[#C8102E]">{req.approver.name}</strong></span>
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
                ? 'bg-[#0B1B3D] text-white hover:bg-slate-800'
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
                Assign to {approverLabel}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Select an {approverLabel.toLowerCase()} from your team to review this request.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 sm:min-w-[320px]">
              <select
                value={selectedApproverId || ''}
                onChange={e => onSelectApprover(req.id, e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1B3D]/20 focus:border-[#0B1B3D] bg-white"
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
                className="inline-flex items-center justify-center gap-2 bg-[#0B1B3D] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition shadow-sm disabled:opacity-50 shrink-0"
              >
                {assigning === req.id ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Assigning…
                  </>
                ) : (
                  <>
                    <FaUserCheck className="w-3.5 h-3.5" />
                    Assign
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
                    previewMode === 'visual' ? 'bg-[#0B1B3D] text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Visual Preview
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('json')}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${
                    previewMode === 'json' ? 'bg-[#0B1B3D] text-white' : 'text-gray-600 hover:bg-gray-50'
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
                        <h5 className="font-extrabold text-[#0B1B3D] text-sm truncate">
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
                          <div className="grid lg:grid-cols-2 gap-6">
                            <SectionIframePreview
                              sectionName={item.section_name}
                              data={curParsed}
                              height={480}
                              label={isHistorical ? 'Live Published (at submission)' : 'Current Live Published'}
                              borderColor="border-gray-300"
                            />
                            <SectionIframePreview
                              sectionName={item.section_name}
                              data={propParsed}
                              height={480}
                              label={isHistorical ? 'Proposed Draft (at submission)' : 'Proposed Draft'}
                              borderColor="border-emerald-500"
                            />
                          </div>
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
            <div className="grid lg:grid-cols-2 gap-6">
              <SectionIframePreview
                sectionName={req.section?.name}
                data={parseJson(previewData.current_content)}
                height={480}
                label={isHistorical ? 'Live Published (at submission)' : 'Current Live Published'}
                borderColor="border-gray-300"
              />
              <SectionIframePreview
                sectionName={req.section?.name}
                data={parseJson(previewData.proposed_content)}
                height={480}
                label={isHistorical ? 'Proposed Draft (at submission)' : 'Proposed Draft'}
                borderColor="border-emerald-500"
              />
            </div>
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
  const getRoleLabel = (k) => ({ power_admin: 'Power Admin', advisor: 'Advisor', approver: 'Approver', manager: 'Manager', client_admin: 'Client Admin' }[k] || k)
  const { can } = useHub()
  const canAssign = can('wc_assign_change_requests') && variant === 'pending'

  const [localMessage, setLocalMessage] = useState('')
  const [localError, setLocalError] = useState('')
  const [requests, setRequests] = useState([])
  const [users, setUsers] = useState([])
  const [selectedApprover, setSelectedApprover] = useState({})
  const [assigningId, setAssigningId] = useState(null)
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
  const [requestSearch, setRequestSearch] = useState('')

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
    const res = await api.get('/change-requests')
    setRequests(res.data)
    return res.data
  }, [])

  const fetchUsers = useCallback(async () => {
    const res = await api.get('/reviewers')
    setUsers(Array.isArray(res.data) ? res.data : res.data?.data || [])
  }, [])

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    if (useLocalBanners) setLocalError('')
    try {
      await Promise.all([fetchRequests(), fetchUsers()])
    } catch (err) {
      reportError(err.response?.data?.message || 'Failed to load change requests.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [fetchRequests, fetchUsers, reportError, useLocalBanners])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const filteredRequests = useMemo(() => {
    const list = variant === 'history'
      ? requests.filter(r => PREVIOUS_STATUSES.has(r.status))
      : requests.filter(r => r.status === PENDING_STATUS)

    if (!requestSearch.trim()) return list
    const q = requestSearch.trim().toLowerCase()
    return list.filter(r => {
      const searchText = getRequestSearchText(r).toLowerCase()
      const editor = (r.editor?.name || '').toLowerCase()
      const approver = (r.approver?.name || '').toLowerCase()
      return searchText.includes(q) || editor.includes(q) || approver.includes(q) || String(r.id).includes(q)
    })
  }, [requests, variant, requestSearch])

  const handleAssign = async (requestId, approverId) => {
    setAssigningId(requestId)
    reportError('')
    reportMessage('')
    try {
      await api.post(`/change-requests/${requestId}/assign-to-approver`, {
        approver_id: Number(approverId),
      })
      reportMessage(`Request assigned to ${getRoleLabel('approver').toLowerCase()} successfully.`)
      await fetchRequests()
      setSelectedApprover(prev => {
        const next = { ...prev }
        delete next[requestId]
        return next
      })
    } catch (err) {
      reportError(err.response?.data?.message || 'Failed to assign request.')
    } finally {
      setAssigningId(null)
    }
  }

  const renderRequestList = (list, emptyTitle, emptyHint) => {
    if (loading) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center text-gray-500">
          <div className="w-10 h-10 mx-auto mb-4 rounded-full border-4 border-[#C8102E] border-t-transparent animate-spin" />
          <p className="text-sm font-semibold">Loading requests…</p>
        </div>
      )
    }

    if (list.length === 0) {
      const isSearching = requestSearch.trim().length > 0
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <FaInbox className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-[#0B1B3D]">
            {isSearching ? 'No matching requests' : emptyTitle}
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            {isSearching ? 'Try a different search term or clear the filter.' : emptyHint}
          </p>
          {isSearching && (
            <button
              type="button"
              onClick={() => setRequestSearch('')}
              className="mt-4 text-sm font-bold text-[#C8102E] hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-5">
        {list.map(req => (
          <AssignmentRequestCard
            key={req.id}
            req={req}
            approvers={approvers}
            selectedApproverId={selectedApprover[req.id]}
            onSelectApprover={(id, approverId) => setSelectedApprover(prev => ({ ...prev, [id]: approverId }))}
            onAssign={handleAssign}
            assigning={assigningId}
            canAssign={canAssign}
            onMessage={reportMessage}
            onError={reportError}
            getCachedPreview={getCachedPreview}
            cachePreview={cachePreview}
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      {useLocalBanners && localMessage && (
        <AlertBanner type="success" message={localMessage} onDismiss={() => setLocalMessage('')} />
      )}
      {useLocalBanners && localError && (
        <AlertBanner type="error" message={localError} onDismiss={() => setLocalError('')} />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="relative flex-1 sm:max-w-md">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search by section, editor, approver, or ID…"
            value={requestSearch}
            onChange={e => setRequestSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#C8102E]/30 focus:border-[#C8102E] transition"
          />
        </div>

        <button
          type="button"
          onClick={() => loadAll(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition shadow-sm disabled:opacity-60 shrink-0"
        >
          <FaSync className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {renderRequestList(
        filteredRequests,
        variant === 'history' ? 'No history yet' : 'No pending requests',
        variant === 'history'
          ? 'Completed, rejected, and in-review requests will appear here.'
          : canAssign
            ? 'Incoming requests you can assign will appear here.'
            : 'Pending change requests will appear here when available.'
      )}
    </div>
  )
}
