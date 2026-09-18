import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FaChevronDown, FaChevronUp, FaCodeBranch, FaEdit, FaExternalLinkAlt } from 'react-icons/fa'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  under_review: 'bg-sky-50 text-sky-800 border-sky-200',
  scheduled: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
  approved_with_feedback: 'bg-violet-50 text-violet-800 border-violet-200',
}

function statusLabel(status) {
  return (
    {
      pending: 'Pending',
      under_review: 'Under review',
      scheduled: 'Scheduled',
      approved: 'Approved',
      rejected: 'Rejected',
      approved_with_feedback: 'Approved with feedback',
    }[status] || status
  )
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full border ${
        STATUS_STYLES[status] || 'bg-slate-50 text-slate-700 border-slate-200'
      }`}
    >
      {statusLabel(status)}
    </span>
  )
}

function formatWhen(value) {
  if (!value) return null
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function sectionTitle(cr) {
  return (
    cr.section?.display_name ||
    cr.section?.name ||
    (cr.section_id ? `Section #${cr.section_id}` : 'Website change')
  )
}

function RequestCard({ request, expanded, onToggle, versions, versionsLoading, highlight }) {
  return (
    <article
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
        highlight ? 'border-[var(--brand)] ring-2 ring-[color-mix(in_srgb,var(--brand)_20%,transparent)]' : 'border-gray-200'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-3 hover:bg-slate-50/80 transition"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <strong className="text-sm text-[var(--brand-dark)]">#{request.id}</strong>
            <span className="text-xs font-bold text-slate-500">v{request.current_version || 1}</span>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{sectionTitle(request)}</p>
          <p className="text-xs text-slate-500 mt-1">
            Submitted {formatWhen(request.created_at) || '—'}
            {request.approver?.name ? ` · Reviewer: ${request.approver.name}` : ''}
          </p>
          {request.status === 'rejected' && request.rejection_reason && (
            <p className="text-xs text-rose-700 mt-2">
              <span className="font-bold">Rejection:</span> {request.rejection_reason}
            </p>
          )}
          {request.status === 'approved_with_feedback' && request.feedback && (
            <p className="text-xs text-violet-800 mt-2">
              <span className="font-bold">Feedback:</span> {request.feedback}
            </p>
          )}
        </div>
        <span className="shrink-0 text-slate-400 mt-1">
          {expanded ? <FaChevronUp className="w-3.5 h-3.5" /> : <FaChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-slate-50/60 px-4 sm:px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Link
              to="/my-dashboard/website-compliance/content-editor"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-[var(--brand-dark)] text-white hover:opacity-90"
            >
              <FaEdit className="w-3 h-3" />
              Open content editor
            </Link>
            {(request.status === 'rejected' || request.status === 'approved_with_feedback') && (
              <Link
                to="/my-dashboard/website-compliance/content-editor"
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-900"
              >
                <FaExternalLinkAlt className="w-3 h-3" />
                Take action on this request
              </Link>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <FaCodeBranch className="w-3.5 h-3.5 text-slate-500" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Version history</h3>
            </div>
            {versionsLoading ? (
              <p className="text-xs text-slate-500">Loading versions…</p>
            ) : !versions || versions.length === 0 ? (
              <p className="text-xs text-slate-500">No versions recorded for this request yet.</p>
            ) : (
              <div className="space-y-2">
                {versions.map((v) => (
                  <div
                    key={v.id || v.version_number}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700"
                  >
                    <div className="flex flex-wrap items-center gap-2 font-bold">
                      <span>Version {v.version_number}</span>
                      <StatusBadge status={v.status} />
                      {v.submitted_at && (
                        <span className="font-medium text-slate-500">{formatWhen(v.submitted_at)}</span>
                      )}
                    </div>
                    {v.feedback ? (
                      <p className="mt-1.5 text-slate-600">
                        <span className="font-semibold">Feedback:</span> {v.feedback}
                      </p>
                    ) : null}
                    {v.reviewed_at && (
                      <p className="mt-1 text-slate-500">Reviewed {formatWhen(v.reviewed_at)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

export default function WebsiteComplianceMyRequests() {
  const { user } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [versionsById, setVersionsById] = useState({})
  const [versionsLoadingId, setVersionsLoadingId] = useState(null)
  const versionsByIdRef = useRef(versionsById)
  versionsByIdRef.current = versionsById

  const moduleOn = can('module_website_compliance')
  const canView =
    can('wc_submit_change_requests') ||
    can('wc_edit_sections') ||
    can('wc_publish_live_content')
  const highlightId = Number(searchParams.get('highlight') || 0) || null

  const load = useCallback(() => {
    if (hubLoading || !moduleOn || !canView) {
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .websiteComplianceChangeRequests()
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        const mine = list.filter((cr) => Number(cr.editor_id) === Number(user?.id))
        setItems(mine)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load change requests.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hubLoading, moduleOn, canView, user?.id])

  useEffect(() => load(), [load])

  useEffect(() => {
    if (highlightId) setExpandedId(highlightId)
  }, [highlightId])

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)),
    [items]
  )

  const loadVersions = useCallback(async (id) => {
    if (!id || versionsByIdRef.current[id]) return
    setVersionsLoadingId(id)
    try {
      const detail = await api.websiteComplianceShowChangeRequest(id)
      const versions = detail?.versions || detail?.change_request?.versions || []
      setVersionsById((prev) => ({ ...prev, [id]: versions }))
    } catch (err) {
      setError(err.message || 'Could not load version history.')
      setVersionsById((prev) => ({ ...prev, [id]: [] }))
    } finally {
      setVersionsLoadingId((current) => (current === id ? null : current))
    }
  }, [])

  const toggleExpand = (id) => {
    const next = expandedId === id ? null : id
    setExpandedId(next)
    if (highlightId && next !== highlightId) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('highlight')
      setSearchParams(nextParams, { replace: true })
    }
    if (next) loadVersions(next)
  }

  useEffect(() => {
    if (!highlightId || !sorted.some((r) => r.id === highlightId)) return
    loadVersions(highlightId)
  }, [highlightId, sorted, loadVersions])

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>My change requests</h1>
            <p className="muted">
              Website Compliance is not enabled for this hub. Ask Power Admin to enable Website Compliance
              under Modules.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (!hubLoading && !canView) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>My change requests</h1>
            <p className="muted">You do not have permission to view your website change requests.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Website Compliance</p>
          <h1>My change requests</h1>
          <p className="muted">Review every content change you submitted, including previous versions.</p>
        </div>
        <Link className="btn primary" to="/my-dashboard/website-compliance/content-editor">
          Open content editor
        </Link>
      </div>

      <div className="wc-app wc-surface">
        {error && <div className="alert mb-4">{error}</div>}
        {loading ? (
          <div className="state">Loading…</div>
        ) : sorted.length === 0 ? (
          <p className="muted text-sm">
            You have not submitted any website change requests yet. Edit a section in the{' '}
            <Link to="/my-dashboard/website-compliance/content-editor">content editor</Link> to create one.
          </p>
        ) : (
          <div className="space-y-3">
            {sorted.map((row) => (
              <RequestCard
                key={row.id}
                request={row}
                expanded={expandedId === row.id}
                onToggle={() => toggleExpand(row.id)}
                versions={versionsById[row.id]}
                versionsLoading={versionsLoadingId === row.id}
                highlight={highlightId === row.id}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
