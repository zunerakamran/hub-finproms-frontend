import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEye } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import CompliancePieChart, { statusPieSegments } from '../components/CompliancePieChart'
import { SmcBarChart } from '../components/SocialMediaComplianceUI'
import StStatusBadge from '../components/SupportTicketsUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatDateTime } from '../utils/dateFormat'
import { ST_STATUSES, stPriorityClass } from '../utils/supportTickets'

const emptyFilters = {
  period: 'month',
  status: '',
  module_area: '',
  category: '',
  priority: '',
  firm_kind: '',
  from: '',
  to: '',
  q: '',
}

function chartMapToSegments(chart) {
  const labels = chart?.labels || []
  const data = chart?.datasets?.[0]?.data || []
  return labels.map((label, i) => ({
    key: String(label),
    label: String(label),
    value: Number(data[i]) || 0,
  }))
}

function deltaHint(delta) {
  const n = Number(delta) || 0
  return `Δ ${n >= 0 ? '+' : ''}${n} vs prior`
}

export default function SupportTicketsReports() {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHubId } = useHub()
  const [tab, setTab] = useState('overview')
  const [filters, setFilters] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [options, setOptions] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  const asPowerAdmin = isPowerAdmin
  const moduleOn = can('support_tickets')
  const enabled = moduleOn && can('st_view_reports')

  const filterParams = useMemo(
    () => ({
      period: applied.period || undefined,
      status: applied.status || undefined,
      module_area: applied.module_area || undefined,
      category: applied.category || undefined,
      priority: applied.priority || undefined,
      firm_kind: applied.firm_kind || undefined,
      from: applied.from || undefined,
      to: applied.to || undefined,
      q: applied.q || undefined,
    }),
    [applied]
  )

  const moreFilterCount = [
    filters.module_area,
    filters.category,
    filters.priority,
    filters.firm_kind,
  ].filter(Boolean).length

  useEffect(() => {
    if (hubLoading || !enabled) return
    api
      .supportTicketsOptions()
      .then((data) => setOptions(data || null))
      .catch(() => setOptions(null))
  }, [hubLoading, enabled, actingHubId])

  useEffect(() => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')

    api
      .supportTicketsReport(filterParams, { asPowerAdmin })
      .then((data) => {
        if (!cancelled) setReport(data.report || null)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load report.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [hubLoading, enabled, filterParams, asPowerAdmin, actingHubId])

  const exportCsv = async () => {
    setExporting(true)
    setError('')
    try {
      const blob = await api.supportTicketsReportExport(filterParams, { asPowerAdmin })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `support-tickets-report-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  const summary = report?.summary
  const charts = report?.charts
  const comparison = report?.period_comparison
  const comparisonLabels = comparison?.chart?.labels || ['Raised', 'Resolved', 'Pending']
  const comparisonCurrent = comparison?.chart?.datasets?.[0]?.data || [
    comparison?.current?.raised ?? 0,
    comparison?.current?.resolved ?? 0,
    comparison?.current?.pending ?? 0,
  ]
  const comparisonPrevious = comparison?.chart?.datasets?.[1]?.data || [
    comparison?.previous?.raised ?? 0,
    comparison?.previous?.resolved ?? 0,
    comparison?.previous?.pending ?? 0,
  ]

  const reportColumns = [
    {
      key: 'id',
      label: '#',
      narrow: true,
      render: (row) => <strong>#{row.id}</strong>,
      filterValue: (row) => String(row.id),
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (row) => row.subject || '-',
      filterValue: (row) => row.subject || '',
    },
    {
      key: 'submitter',
      label: 'Submitted by',
      render: (row) => (
        <div>
          <div>{row.submitted_by || '-'}</div>
          {row.submitter_email ? <div className="muted">{row.submitter_email}</div> : null}
        </div>
      ),
      filterValue: (row) =>
        [row.submitted_by, row.submitter_email, row.submitter_role].filter(Boolean).join(' '),
    },
    {
      key: 'firm',
      label: 'Firm / network',
      render: (row) =>
        row.firm_name ? (
          <div>
            <div>{row.firm_name}</div>
            {row.firm_kind ? (
              <div className="muted">{row.firm_kind === 'network' ? 'Network' : 'Firm'}</div>
            ) : null}
          </div>
        ) : (
          '-'
        ),
      filterValue: (row) => [row.firm_name, row.firm_kind].filter(Boolean).join(' '),
    },
    {
      key: 'module',
      label: 'Module',
      render: (row) => row.module_area_label || row.module_area || '-',
      filterValue: (row) => row.module_area_label || row.module_area || '',
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => (
        <span className={stPriorityClass(row.priority)}>
          {row.priority_label || row.priority || '-'}
        </span>
      ),
      filterValue: (row) => row.priority_label || row.priority || '',
    },
    {
      key: 'status',
      label: 'Status',
      fit: true,
      render: (row) => <StStatusBadge status={row.status} at={row.status_changed_at} />,
      filterValue: (row) => row.status || '',
      truncate: false,
    },
    {
      key: 'created',
      label: 'Raised',
      date: true,
      render: (row) => <DataGridDate value={row.created_at} />,
      filterValue: (row) => formatDateTime(row.created_at, ''),
      sortValue: (row) => (row.created_at ? new Date(row.created_at).getTime() : 0),
      truncate: false,
    },
  ]

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Support Tickets</p>
            <h1>Reports</h1>
            <p className="muted">
              {!moduleOn
                ? 'Support Tickets functionality is off for this hub.'
                : 'Enable “View support tickets report” for your role.'}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Support Tickets</p>
          <h1>Reports</h1>
          <p className="muted">
            Period stats, firm/network comparison, pie charts, graphs, and CSV export.
          </p>
        </div>
        <button className="btn ghost" onClick={exportCsv} disabled={exporting || loading}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <div className="tab-row">
        <button
          type="button"
          className={`btn ghost ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className={`btn ghost ${tab === 'comparison' ? 'active' : ''}`}
          onClick={() => setTab('comparison')}
        >
          Firm / network
        </button>
        <button
          type="button"
          className={`btn ghost ${tab === 'timeline' ? 'active' : ''}`}
          onClick={() => setTab('timeline')}
        >
          Timeline
        </button>
        <button
          type="button"
          className={`btn ghost ${tab === 'detail' ? 'active' : ''}`}
          onClick={() => setTab('detail')}
        >
          Detail
        </button>
      </div>

      <form
        className="filters-row st-report-filters"
        onSubmit={(e) => {
          e.preventDefault()
          setApplied({ ...filters })
        }}
      >
        <select
          value={filters.period}
          onChange={(e) => setFilters((f) => ({ ...f, period: e.target.value }))}
          aria-label="Period"
        >
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
          <option value="all">All time</option>
        </select>
        <input
          type="search"
          placeholder="Search…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All statuses</option>
          {ST_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, period: 'all' }))}
          aria-label="From"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, period: 'all' }))}
          aria-label="To"
        />
        <div className="filters-row__actions">
          <button
            className="btn ghost"
            type="button"
            aria-expanded={showMoreFilters}
            onClick={() => setShowMoreFilters((open) => !open)}
          >
            {showMoreFilters ? 'Less filters' : 'More filters'}
            {!showMoreFilters && moreFilterCount > 0 ? ` (${moreFilterCount})` : ''}
          </button>
          <button className="btn primary" type="submit">
            Filter
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              setFilters(emptyFilters)
              setApplied(emptyFilters)
              setShowMoreFilters(false)
            }}
          >
            Reset
          </button>
        </div>
        {showMoreFilters ? (
          <div className="st-report-filters__more">
            <select
              value={filters.module_area}
              onChange={(e) => setFilters((f) => ({ ...f, module_area: e.target.value }))}
            >
              <option value="">All modules</option>
              {(options?.modules || []).map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="">All categories</option>
              {(options?.categories || []).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
            >
              <option value="">All priorities</option>
              {(options?.priorities || []).map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
            <select
              value={filters.firm_kind}
              onChange={(e) => setFilters((f) => ({ ...f, firm_kind: e.target.value }))}
            >
              <option value="">Firm + network</option>
              <option value="firm">Firm only</option>
              <option value="network">Network only</option>
            </select>
          </div>
        ) : null}
      </form>

      {error && <div className="alert">{error}</div>}
      {loading ? (
        <div className="state">Loading...</div>
      ) : tab === 'overview' ? (
        <>
          {summary ? (
            <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
              <div className="stat-card">
                <strong>{summary.total ?? 0}</strong>
                <span>Total (filtered)</span>
              </div>
              <div className="stat-card">
                <strong>{summary.pending ?? 0}</strong>
                <span>Pending</span>
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  Open + in progress + waiting
                </span>
              </div>
              <div className="stat-card">
                <strong>{summary.resolved ?? 0}</strong>
                <span>Resolved</span>
              </div>
              <div className="stat-card">
                <strong>{summary.closed ?? 0}</strong>
                <span>Closed</span>
              </div>
              <div className="stat-card">
                <strong>{summary.raised_this_week ?? 0}</strong>
                <span>Raised this week</span>
              </div>
              <div className="stat-card">
                <strong>{summary.raised_this_month ?? 0}</strong>
                <span>Raised this month</span>
              </div>
              <div className="stat-card">
                <strong>{summary.resolved_this_week ?? 0}</strong>
                <span>Resolved this week</span>
              </div>
              <div className="stat-card">
                <strong>{summary.resolved_this_month ?? 0}</strong>
                <span>Resolved this month</span>
              </div>
              <div className="stat-card">
                <strong>{summary.avg_resolution_hours ?? '—'}</strong>
                <span>Avg resolution (hrs)</span>
              </div>
            </div>
          ) : null}

          {comparison?.current && comparison?.previous ? (
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem' }}>Period comparison</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Current {comparison.current.from} → {comparison.current.to} vs previous{' '}
                {comparison.previous.from} → {comparison.previous.to}
              </p>
              <div className="stat-grid" style={{ marginBottom: '1rem' }}>
                <div className="stat-card">
                  <strong>{comparison.current.raised ?? 0}</strong>
                  <span>Raised</span>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>
                    {deltaHint(comparison.delta?.raised)}
                  </span>
                </div>
                <div className="stat-card">
                  <strong>{comparison.current.resolved ?? 0}</strong>
                  <span>Resolved</span>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>
                    {deltaHint(comparison.delta?.resolved)}
                  </span>
                </div>
                <div className="stat-card">
                  <strong>{comparison.current.pending ?? 0}</strong>
                  <span>Pending</span>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>
                    {deltaHint(comparison.delta?.pending)}
                  </span>
                </div>
              </div>
              <div className="compliance-pie-row">
                <SmcBarChart
                  title="Current period"
                  labels={comparisonLabels}
                  data={comparisonCurrent}
                />
                <SmcBarChart
                  title="Previous period"
                  labels={comparisonLabels}
                  data={comparisonPrevious}
                />
              </div>
            </div>
          ) : null}

          <div className="compliance-pie-row">
            <CompliancePieChart
              title="By status"
              total={summary?.total}
              segments={statusPieSegments(summary?.by_status)}
            />
            <CompliancePieChart
              title="By priority"
              segments={chartMapToSegments(charts?.by_priority)}
            />
            <CompliancePieChart
              title="By category"
              segments={chartMapToSegments(charts?.by_category)}
            />
            <CompliancePieChart
              title="Firm vs network"
              segments={chartMapToSegments(charts?.by_firm_kind)}
            />
          </div>

          <SmcBarChart
            title={charts?.by_module?.title || 'Tickets by module'}
            labels={charts?.by_module?.labels || []}
            data={charts?.by_module?.datasets?.[0]?.data || []}
          />
        </>
      ) : tab === 'comparison' ? (
        <div className="compliance-pie-row">
          <SmcBarChart
            title={charts?.by_firm?.title || 'Tickets by firm / network'}
            labels={charts?.by_firm?.labels || []}
            data={charts?.by_firm?.datasets?.[0]?.data || []}
          />
          <SmcBarChart
            title={charts?.by_network?.title || 'Tickets by network'}
            labels={charts?.by_network?.labels || []}
            data={charts?.by_network?.datasets?.[0]?.data || []}
          />
          <CompliancePieChart
            title="Firm vs network"
            segments={chartMapToSegments(charts?.by_firm_kind)}
          />
        </div>
      ) : tab === 'timeline' ? (
        <div className="compliance-pie-row">
          <SmcBarChart
            title={charts?.raised_over_time?.title || 'Tickets raised over time'}
            labels={charts?.raised_over_time?.labels || []}
            data={charts?.raised_over_time?.datasets?.[0]?.data || []}
          />
          <SmcBarChart
            title={charts?.resolved_over_time?.title || 'Tickets resolved over time'}
            labels={charts?.resolved_over_time?.labels || []}
            data={charts?.resolved_over_time?.datasets?.[0]?.data || []}
          />
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem' }}>Ticket detail</h2>
          <DataGrid
            columns={reportColumns}
            rows={report?.rows || []}
            emptyMessage="No report rows for the current filters."
            pageSize={10}
            actions={(row) => (
              <DataGridIconBtn
                icon={FaEye}
                label="Open"
                as={Link}
                to={`/my-dashboard/support-tickets/${row.id}`}
                state={{ from: 'reports' }}
              />
            )}
          />
        </div>
      )}
    </section>
  )
}
