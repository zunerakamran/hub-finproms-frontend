import { useCallback, useEffect, useState } from 'react'
import {
  FaCheckCircle,
  FaClipboardList,
  FaCodeBranch,
  FaDownload,
  FaGlobe,
  FaLayerGroup,
  FaRocket,
  FaSync,
  FaTimesCircle,
  FaUserClock,
} from 'react-icons/fa'
import api from '../wcApi'

function StatCard({ label, value, icon: Icon, accent, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 sm:gap-4">
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-extrabold text-[var(--brand-dark)] leading-none">{value ?? 0}</p>
        <p className="text-[11px] sm:text-xs text-gray-500 font-semibold mt-1 truncate">{label}</p>
        {sub != null && sub !== '' && (
          <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate">{sub}</p>
        )}
      </div>
    </div>
  )
}

function SectionCard({ title, subtitle, icon: Icon, iconAccent, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconAccent}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[var(--brand-dark)] truncate">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  )
}

function BreakdownRow({ label, value, total, barClass }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="text-sm font-semibold text-gray-700 truncate">{label}</span>
        <span className="text-xs text-gray-500 font-bold shrink-0">
          {value} <span className="text-gray-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function formatStatusLabel(status) {
  return (status || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const STATUS_BAR = {
  pending: 'bg-amber-500',
  under_review: 'bg-blue-500',
  scheduled: 'bg-purple-500',
  approved: 'bg-emerald-500',
  deployed: 'bg-emerald-500',
  rejected: 'bg-rose-500',
  approved_with_feedback: 'bg-violet-500',
}

const CR_STATUS_ORDER = [
  'pending',
  'under_review',
  'scheduled',
  'approved_with_feedback',
  'approved',
  'rejected',
]

function exportSummaryToCsv(summary) {
  if (!summary) return

  const deployments = summary.deployments || summary.template_requests || {}
  const cr = summary.change_requests || {}

  const rows = [
    ['Section', 'Metric', 'Value'],
    ['Templates', 'Total', summary.templates?.total ?? 0],
    ['Templates', 'Active', summary.templates?.active ?? 0],
    ['Templates', 'Inactive', summary.templates?.inactive ?? 0],
    ['Deployments', 'Total', deployments.total ?? 0],
    ['Deployments', 'Pending', deployments.by_status?.pending ?? 0],
    ['Deployments', 'Live', deployments.by_status?.deployed ?? 0],
    ['Deployments', 'Rejected', deployments.by_status?.rejected ?? 0],
    ['Deployments', 'Awaiting advisor assignment', deployments.awaiting_advisor ?? 0],
  ]

  ;(deployments.by_template || []).forEach((row) => {
    rows.push(['Deployments by template', row.template_name, row.total])
  })

  rows.push(
    ['Change requests', 'Total', cr.total ?? 0],
    ['Change requests', 'Open', cr.open ?? 0],
    ['Change requests', 'Awaiting approver assignment', cr.awaiting_assignment ?? 0],
    ['Change requests', 'Average version', cr.avg_version ?? 1],
    ['Change requests', 'Resubmitted (v2+)', cr.resubmitted ?? 0]
  )

  CR_STATUS_ORDER.forEach((status) => {
    if (cr.by_status?.[status] != null) {
      rows.push(['Change requests', formatStatusLabel(status), cr.by_status[status]])
    }
  })

  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `website-compliance-report-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function PlatformSummaryReport({ onError }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/reports/summary')
      setSummary(res.data)
      onError?.('')
    } catch (err) {
      onError?.(err.response?.data?.message || 'Failed to load website compliance report.')
    } finally {
      setLoading(false)
    }
  }, [onError])

  const refreshSummary = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await api.post('/reports/summary/refresh')
      setSummary(res.data)
      onError?.('')
    } catch (err) {
      onError?.(err.response?.data?.message || 'Failed to refresh website compliance report.')
    } finally {
      setRefreshing(false)
    }
  }, [onError])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  if (loading && !summary) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center text-gray-500">
        <div className="w-10 h-10 mx-auto mb-4 rounded-full border-4 border-[var(--brand)] border-t-transparent animate-spin" />
        <p className="text-sm font-semibold">Loading website compliance report…</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
        <p className="text-sm text-gray-500 font-medium">Unable to load the website compliance report.</p>
        <button
          type="button"
          onClick={() => fetchSummary()}
          className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand)] hover:underline"
        >
          <FaSync className="w-3.5 h-3.5" />
          Try again
        </button>
      </div>
    )
  }

  const deployments = summary.deployments || summary.template_requests || {}
  const cr = summary.change_requests || {}
  const crStatusEntries = CR_STATUS_ORDER
    .filter((status) => cr.by_status?.[status] != null)
    .map((status) => [status, cr.by_status[status]])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--brand-dark)]">Website Compliance summary</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Templates, site deployments, and content change requests
            {summary.generated_at
              ? ` · Updated ${new Date(summary.generated_at).toLocaleString()}`
              : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshSummary()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition shadow-sm disabled:opacity-60"
          >
            <FaSync className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => exportSummaryToCsv(summary)}
            className="inline-flex items-center gap-2 bg-[var(--brand-dark)] text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition shadow-sm"
          >
            <FaDownload className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          label="Active templates"
          value={summary.templates?.active}
          sub={`${summary.templates?.total ?? 0} in catalog`}
          icon={FaLayerGroup}
          accent="bg-slate-100 text-slate-600"
        />
        <StatCard
          label="Pending deployments"
          value={deployments.by_status?.pending}
          sub={`${deployments.awaiting_advisor ?? 0} need advisor`}
          icon={FaRocket}
          accent="bg-amber-100 text-amber-600"
        />
        <StatCard
          label="Live sites"
          value={deployments.by_status?.deployed}
          sub={`${deployments.by_status?.rejected ?? 0} rejected`}
          icon={FaGlobe}
          accent="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          label="Open change requests"
          value={cr.open}
          sub={`${cr.awaiting_assignment ?? 0} unassigned`}
          icon={FaClipboardList}
          accent="bg-[var(--brand)]/10 text-[var(--brand)]"
        />
        <StatCard
          label="Avg. CR version"
          value={cr.avg_version ?? 1}
          sub={`${cr.resubmitted ?? 0} resubmitted`}
          icon={FaCodeBranch}
          accent="bg-violet-100 text-violet-600"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard
          title="Site deployments"
          subtitle="Showcase sites requested and deployed from templates"
          icon={FaRocket}
          iconAccent="bg-amber-50 text-amber-600"
        >
          <div className="grid grid-cols-1 gap-3 mb-5">
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-center">
              <p className="text-xl font-extrabold text-amber-700">{deployments.by_status?.pending ?? 0}</p>
              <p className="text-[11px] font-semibold text-amber-700/80 mt-1">Pending</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-center">
              <p className="text-xl font-extrabold text-emerald-700">{deployments.by_status?.deployed ?? 0}</p>
              <p className="text-[11px] font-semibold text-emerald-700/80 mt-1">Live</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-center">
              <p className="text-xl font-extrabold text-rose-700">{deployments.by_status?.rejected ?? 0}</p>
              <p className="text-[11px] font-semibold text-rose-700/80 mt-1">Rejected</p>
            </div>
          </div>

          {(deployments.awaiting_advisor ?? 0) > 0 && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-xs text-amber-900">
              <FaUserClock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p>
                <span className="font-bold">{deployments.awaiting_advisor}</span> pending deployment
                {deployments.awaiting_advisor === 1 ? '' : 's'} still need an advisor assigned.
              </p>
            </div>
          )}

          {(deployments.by_template || []).length > 0 && (
            <>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">By template</p>
              <div className="space-y-3">
                {deployments.by_template.map((row) => (
                  <BreakdownRow
                    key={row.template_name}
                    label={row.template_name}
                    value={row.total}
                    total={deployments.total ?? 0}
                    barClass="bg-slate-600"
                  />
                ))}
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard
          title="Content change requests"
          subtitle="Advisor edits waiting for or completed by compliance review"
          icon={FaClipboardList}
          iconAccent="bg-[var(--brand)]/10 text-[var(--brand)]"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            {crStatusEntries.map(([status, count]) => (
              <div key={status} className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-center">
                <p className="text-xl font-extrabold text-[var(--brand-dark)]">{count}</p>
                <p className="text-[11px] font-semibold text-gray-500 mt-1 capitalize">
                  {formatStatusLabel(status)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-3 mb-5">
            {crStatusEntries.map(([status, count]) => (
              <BreakdownRow
                key={status}
                label={formatStatusLabel(status)}
                value={count}
                total={cr.total ?? 0}
                barClass={STATUS_BAR[status] || 'bg-gray-500'}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
              <p className="text-[11px] font-bold text-violet-700 uppercase tracking-wide">Avg version</p>
              <p className="text-xl font-extrabold text-violet-800 mt-1">{cr.avg_version ?? 1}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Resubmitted</p>
              <p className="text-xl font-extrabold text-slate-800 mt-1">{cr.resubmitted ?? 0}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Template catalog"
          subtitle="Showcase templates available for deployment"
          icon={FaLayerGroup}
          iconAccent="bg-slate-100 text-slate-600"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <FaCheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-emerald-700 leading-none">
                  {summary.templates?.active ?? 0}
                </p>
                <p className="text-xs font-semibold text-emerald-700/80 mt-1">Active</p>
              </div>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <FaTimesCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-rose-700 leading-none">
                  {summary.templates?.inactive ?? 0}
                </p>
                <p className="text-xs font-semibold text-rose-700/80 mt-1">Inactive</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4 leading-relaxed">
            {summary.templates?.total ?? 0} template
            {(summary.templates?.total ?? 0) === 1 ? '' : 's'} in the Website Compliance catalog.
          </p>
        </SectionCard>
      </div>
    </div>
  )
}
