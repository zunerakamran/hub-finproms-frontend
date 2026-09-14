import { useCallback, useEffect, useState } from 'react'
import {
  FaBuilding,
  FaCheckCircle,
  FaClipboardList,
  FaDownload,
  FaLayerGroup,
  FaRocket,
  FaSync,
  FaTimesCircle,
  FaUserCheck,
  FaUserEdit,
  FaUsers,
  FaUserShield,
  FaUserTie,
} from 'react-icons/fa'
import api from '../wcApi'

function StatCard({ label, value, icon: Icon, accent, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 sm:gap-4">
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-extrabold text-[#0B1B3D] leading-none">{value ?? 0}</p>
        <p className="text-[11px] sm:text-xs text-gray-500 font-semibold mt-1 truncate">{label}</p>
        {sub != null && sub !== '' && (
          <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate">{sub}</p>
        )}
      </div>
    </div>
  )
}

function SectionCard({ title, subtitle, icon: Icon, iconAccent, children, action }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconAccent}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#0B1B3D] truncate">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {action}
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
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function formatStatusLabel(status) {
  return (status || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function exportSummaryToCsv(summary, getRoleLabel) {
  if (!summary) return

  const rows = [
    ['Section', 'Metric', 'Value'],
    ['Templates', 'Total', summary.templates?.total ?? 0],
    ['Templates', 'Active', summary.templates?.active ?? 0],
    ['Templates', 'Inactive', summary.templates?.inactive ?? 0],
    ['Firms', 'Total', summary.firms?.total ?? 0],
    ['Users', 'Total', summary.users?.total ?? 0],
  ]

  Object.entries(summary.users?.by_role || {}).forEach(([role, count]) => {
    rows.push(['Users', getRoleLabel(role), count])
  })

  rows.push(
    ['Template Requests', 'Total', summary.template_requests?.total ?? 0],
    ['Template Requests', 'Pending', summary.template_requests?.by_status?.pending ?? 0],
    ['Template Requests', 'Deployed', summary.template_requests?.by_status?.deployed ?? 0],
    ['Template Requests', 'Rejected', summary.template_requests?.by_status?.rejected ?? 0],
    ['Template Requests', 'Advisor Websites', summary.template_requests?.by_type?.advisor_website ?? 0],
    ['Template Requests', 'Hub Main Websites', summary.template_requests?.by_type?.hub_main_website ?? 0],
  );

  (summary.template_requests?.by_template || []).forEach(row => {
    rows.push(['Template Requests by Template', row.template_name, row.total])
  })

  rows.push(
    ['Change Requests', 'Total', summary.change_requests?.total ?? 0],
  )

  Object.entries(summary.change_requests?.by_status || {}).forEach(([status, count]) => {
    rows.push(['Change Requests', formatStatusLabel(status), count])
  })

  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `platform-summary-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const ROLE_META = [
  { key: 'advisor', icon: FaUserEdit, accent: 'bg-indigo-100 text-indigo-600' },
  { key: 'approver', icon: FaUserCheck, accent: 'bg-teal-100 text-teal-600' },
  { key: 'manager', icon: FaUserTie, accent: 'bg-violet-100 text-violet-600' },
  { key: 'client_admin', icon: FaUserShield, accent: 'bg-slate-100 text-slate-600' },
  { key: 'power_admin', icon: FaUsers, accent: 'bg-orange-100 text-orange-600' },
]

const STATUS_BAR = {
  pending: 'bg-amber-500',
  under_review: 'bg-blue-500',
  scheduled: 'bg-purple-500',
  approved: 'bg-emerald-500',
  deployed: 'bg-emerald-500',
  rejected: 'bg-rose-500',
}

export default function PlatformSummaryReport({ onError }) {
  const getRoleLabel = (k) => ({ power_admin: 'Power Admin', advisor: 'Advisor', approver: 'Approver', manager: 'Manager', client_admin: 'Client Admin' }[k] || k)
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
      onError?.(err.response?.data?.message || 'Failed to load platform summary report.')
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
      onError?.(err.response?.data?.message || 'Failed to refresh platform summary report.')
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
        <div className="w-10 h-10 mx-auto mb-4 rounded-full border-4 border-[#C8102E] border-t-transparent animate-spin" />
        <p className="text-sm font-semibold">Loading platform summary…</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
        <p className="text-sm text-gray-500 font-medium">Unable to load the platform summary.</p>
        <button
          type="button"
          onClick={() => fetchSummary()}
          className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#C8102E] hover:underline"
        >
          <FaSync className="w-3.5 h-3.5" />
          Try again
        </button>
      </div>
    )
  }

  const tr = summary.template_requests || {}
  const cr = summary.change_requests || {}
  const byRole = summary.users?.by_role || {}

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#0B1B3D]">Platform Summary</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Templates, team roles, and request volume
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
            onClick={() => exportSummaryToCsv(summary, getRoleLabel)}
            className="inline-flex items-center gap-2 bg-[#0B1B3D] text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-slate-800 transition shadow-sm"
          >
            <FaDownload className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          label="Templates"
          value={summary.templates?.total}
          sub={`${summary.templates?.active ?? 0} active`}
          icon={FaLayerGroup}
          accent="bg-slate-100 text-slate-600"
        />
        <StatCard
          label="Team Users"
          value={summary.users?.total}
          icon={FaUsers}
          accent="bg-indigo-100 text-indigo-600"
        />
        <StatCard
          label="Firms"
          value={summary.firms?.total}
          icon={FaBuilding}
          accent="bg-blue-100 text-blue-600"
        />
        <StatCard
          label="Template Requests"
          value={tr.total}
          sub={`${tr.by_status?.pending ?? 0} pending`}
          icon={FaRocket}
          accent="bg-amber-100 text-amber-600"
        />
        <StatCard
          label="Change Requests"
          value={cr.total}
          sub={`${cr.by_status?.pending ?? 0} pending`}
          icon={FaClipboardList}
          accent="bg-[#C8102E]/10 text-[#C8102E]"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard
          title="Users by Role"
          subtitle="Headcount across the platform"
          icon={FaUsers}
          iconAccent="bg-indigo-50 text-indigo-600"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {ROLE_META.map(({ key, icon: Icon, accent }) => (
              <div
                key={key}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-3"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-[#0B1B3D] leading-none">{byRole[key] ?? 0}</p>
                  <p className="text-[11px] text-gray-500 font-semibold mt-1 truncate">
                    {getRoleLabel(key)}s
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {ROLE_META.map(({ key }) => (
              <BreakdownRow
                key={key}
                label={getRoleLabel(key)}
                value={byRole[key] ?? 0}
                total={summary.users?.total ?? 0}
                barClass="bg-[#0B1B3D]"
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Template Requests"
          subtitle="Advisor and hub deployment requests"
          icon={FaRocket}
          iconAccent="bg-amber-50 text-amber-600"
        >
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-center">
              <p className="text-xl font-extrabold text-amber-700">{tr.by_status?.pending ?? 0}</p>
              <p className="text-[11px] font-semibold text-amber-700/80 mt-1">Pending</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-center">
              <p className="text-xl font-extrabold text-emerald-700">{tr.by_status?.deployed ?? 0}</p>
              <p className="text-[11px] font-semibold text-emerald-700/80 mt-1">Deployed</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-center">
              <p className="text-xl font-extrabold text-rose-700">{tr.by_status?.rejected ?? 0}</p>
              <p className="text-[11px] font-semibold text-rose-700/80 mt-1">Rejected</p>
            </div>
          </div>

          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">By request type</p>
          <div className="space-y-3 mb-5">
            <BreakdownRow
              label={`${getRoleLabel('advisor')} websites`}
              value={tr.by_type?.advisor_website ?? 0}
              total={tr.total ?? 0}
              barClass="bg-indigo-500"
            />
            <BreakdownRow
              label="Hub main websites"
              value={tr.by_type?.hub_main_website ?? 0}
              total={tr.total ?? 0}
              barClass="bg-[#C8102E]"
            />
          </div>

          {(tr.by_template || []).length > 0 && (
            <>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">By template</p>
              <div className="space-y-3">
                {tr.by_template.map(row => (
                  <BreakdownRow
                    key={row.template_name}
                    label={row.template_name}
                    value={row.total}
                    total={tr.total ?? 0}
                    barClass="bg-slate-600"
                  />
                ))}
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard
          title="Change Requests"
          subtitle="Content review pipeline"
          icon={FaClipboardList}
          iconAccent="bg-[#C8102E]/10 text-[#C8102E]"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            {Object.entries(cr.by_status || {}).map(([status, count]) => (
              <div
                key={status}
                className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-center"
              >
                <p className="text-xl font-extrabold text-[#0B1B3D]">{count}</p>
                <p className="text-[11px] font-semibold text-gray-500 mt-1 capitalize">
                  {formatStatusLabel(status)}
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {Object.entries(cr.by_status || {}).map(([status, count]) => (
              <BreakdownRow
                key={status}
                label={formatStatusLabel(status)}
                value={count}
                total={cr.total ?? 0}
                barClass={STATUS_BAR[status] || 'bg-gray-500'}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Templates Catalog"
          subtitle="Showcase templates available for deployment"
          icon={FaLayerGroup}
          iconAccent="bg-slate-100 text-slate-600"
        >
          <div className="grid grid-cols-2 gap-3 mb-2">
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
            {summary.templates?.total ?? 0} template{(summary.templates?.total ?? 0) === 1 ? '' : 's'} in the
            catalog. Advisors and managers can request deployments against these templates.
          </p>
        </SectionCard>
      </div>
    </div>
  )
}
