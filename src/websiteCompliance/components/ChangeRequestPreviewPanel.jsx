import { useEffect, useMemo, useState } from 'react'
import { FaChevronDown, FaEye, FaEyeSlash, FaSync } from 'react-icons/fa'
import api from '../wcApi'
import { resolveAdvisorLiveSiteUrl } from '../utils/assetUrl'
import { parseJson } from '../utils/parseJson'
import {
  buildPreviewFromVersion,
  isHistoricalRequest,
  previewHasStoredSnapshot,
  resolveRequestPreview,
  resolveVersionPreview,
} from '../utils/changeRequestPreview'
import SectionIframePreview from './SectionIframePreview'

/**
 * Collapsible side-by-side section preview for a change request and/or a specific version.
 */
export default function ChangeRequestPreviewPanel({
  request,
  requestId,
  version = null,
  historical = null,
  defaultOpen = false,
  className = '',
  compact = false,
}) {
  const id = requestId || request?.id
  const isHistorical = historical ?? (request ? isHistoricalRequest(request) : Boolean(version))
  const [open, setOpen] = useState(defaultOpen)
  const [previewData, setPreviewData] = useState(null)
  const [previewMode, setPreviewMode] = useState('visual')
  const [expanded, setExpanded] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const batchEdits = previewData?.is_batch && Array.isArray(previewData.edits) ? previewData.edits : null
  const siteUrl = useMemo(
    () => resolveAdvisorLiveSiteUrl({ siteUrl: previewData?.site_url || null }),
    [previewData?.site_url]
  )

  const title = useMemo(() => {
    if (version?.version_number != null) return `Version ${version.version_number} preview`
    return isHistorical ? 'Submission preview' : 'Request preview'
  }, [version, isHistorical])

  const loadPreview = async () => {
    if (!id) return
    setBusy(true)
    setError('')
    try {
      let next = null
      if (version) {
        next = await resolveVersionPreview(api, id, version, { brandingRequest: request })
        if (!next) next = buildPreviewFromVersion(version)
      } else if (request) {
        next = await resolveRequestPreview(api, request)
      } else {
        const res = await api.get(`/change-requests/${id}/preview`)
        next = res.data
      }

      if (!next || (!previewHasStoredSnapshot(next) && !next.is_batch && !next.proposed_content)) {
        setError('No preview content available for this request.')
        setPreviewData(null)
        return
      }

      setPreviewData(next)
      if (next.is_batch && Array.isArray(next.edits) && next.edits.length === 1) {
        setExpanded(new Set([0]))
      }
    } catch (err) {
      const fallback = version ? buildPreviewFromVersion(version) : null
      if (fallback) {
        setPreviewData(fallback)
      } else {
        setError(err.response?.data?.message || err.message || 'Could not load preview.')
        setPreviewData(null)
      }
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!open) return
    loadPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id, version?.id, version?.version_number])

  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
  }

  const toggleSection = (idx) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const expandAll = () => {
    if (!batchEdits) return
    setExpanded(new Set(batchEdits.map((_, idx) => idx)))
  }

  const collapseAll = () => setExpanded(new Set())

  const currentLabel = isHistorical
    ? 'Live Published Content (at submission)'
    : 'Current Live Published Content'
  const proposedLabel = isHistorical
    ? 'Proposed Draft Content (at submission)'
    : 'Proposed Draft Content'

  return (
    <div className={`wc-preview-panel ${compact ? 'wc-preview-panel--compact' : ''} ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggle}
          disabled={busy && !open}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[var(--brand-dark)] transition disabled:opacity-60"
        >
          {busy ? (
            <FaSync className="w-3.5 h-3.5 animate-spin" />
          ) : open ? (
            <FaEyeSlash className="w-3.5 h-3.5" />
          ) : (
            <FaEye className="w-3.5 h-3.5" />
          )}
          {busy ? 'Loading preview…' : open ? `Hide ${title}` : `Show ${title}`}
          <FaChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && batchEdits && (
          <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
            <button
              type="button"
              onClick={expandAll}
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 transition"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 transition"
            >
              Collapse all
            </button>
          </div>
        )}
      </div>

      {error && open && <p className="text-xs text-rose-700 mt-2">{error}</p>}

      {open && previewData && (
        <div className="mt-3 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3 flex-wrap gap-3">
            <div>
              <h4 className="text-xs font-extrabold uppercase text-gray-500 tracking-wider">
                {isHistorical
                  ? 'Submission Snapshot: Live Published vs Proposed Draft'
                  : 'Side-by-Side Comparison: Current Live vs Proposed'}
              </h4>
              {isHistorical && (
                <p className="text-[11px] text-gray-500 mt-1">
                  Showing content as it existed for this version.
                </p>
              )}
              {siteUrl && (
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[var(--brand)] font-bold underline mt-1 inline-block hover:opacity-80"
                >
                  View deployed advisor site ↗
                </a>
              )}
            </div>

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
          </div>

          {batchEdits ? (
            <div className="space-y-2">
              {batchEdits.map((item, idx) => {
                const curParsed = parseJson(item.current_content)
                const propParsed = parseJson(item.proposed_content)
                const isExpanded = expanded.has(idx)

                return (
                  <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection(idx)}
                      className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-slate-50 transition"
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
                      <div className="px-4 sm:px-5 pb-5 border-t border-gray-100 pt-4">
                        {previewMode === 'visual' ? (
                          <div className="grid lg:grid-cols-2 gap-6">
                            <SectionIframePreview
                              sectionName={item.section_name}
                              data={curParsed}
                              branding={previewData}
                              templateSlug={previewData?.template_name || 'template4'}
                              siteUrl={siteUrl}
                              cpanelDomain={siteUrl}
                              height={compact ? 360 : 480}
                              label={currentLabel}
                              borderColor="border-gray-300"
                            />
                            <SectionIframePreview
                              sectionName={item.section_name}
                              data={propParsed}
                              branding={previewData}
                              templateSlug={previewData?.template_name || 'template4'}
                              siteUrl={siteUrl}
                              cpanelDomain={siteUrl}
                              height={compact ? 360 : 480}
                              label={proposedLabel}
                              borderColor="border-emerald-500"
                            />
                          </div>
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
            <div className="grid lg:grid-cols-2 gap-6">
              <SectionIframePreview
                sectionName={request?.section?.name || 'Section'}
                data={parseJson(previewData.current_content)}
                branding={previewData}
                templateSlug={previewData?.template_name || 'template4'}
                siteUrl={siteUrl}
                cpanelDomain={siteUrl}
                height={compact ? 360 : 480}
                label={currentLabel}
                borderColor="border-gray-300"
              />
              <SectionIframePreview
                sectionName={request?.section?.name || 'Section'}
                data={parseJson(previewData.proposed_content)}
                branding={previewData}
                templateSlug={previewData?.template_name || 'template4'}
                siteUrl={siteUrl}
                cpanelDomain={siteUrl}
                height={compact ? 360 : 480}
                label={proposedLabel}
                borderColor="border-emerald-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
