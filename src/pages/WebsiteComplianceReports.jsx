import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEye } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import {
  ComplianceAuditTrailCell,
  CompliancePersonCell,
  ComplianceReportAuditPanel,
} from '../components/ComplianceAuditTrail'
import CompliancePieChart, { statusPieSegments } from '../components/CompliancePieChart'
import WcStatusBadge from '../components/WebsiteComplianceUI'
import { useHub } from '../context/HubContext'
import PlatformSummaryReport from '../websiteCompliance/components/PlatformSummaryReport'
import { formatDateTime, complianceStatusChangedAt } from '../utils/dateFormat'

const emptyFilters = { status: '', from: '', to: '', q: '' }

function dayStamp(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function filterRows(rows, filters) {
  const q = (filters.q || '').trim().toLowerCase()
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    if (filters.status && String(row.status) !== String(filters.status)) return false
    const submitted = dayStamp(row.submission_date)
    if (filters.from && submitted && submitted < filters.from) return false
    if (filters.to && submitted && submitted > filters.to) return false
    if (q) {
      const hay = [
        row.id,
        row.submitted_by,
        row.on_behalf_by,
        row.submitter_email,
        row.firm_name,
        row.section_name,
        row.status,
        row.assigned_to,
        row.reviewed_by,
        row.audit_trail_summary,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

function summaryFromRows(rows) {
  const byStatus = {}
  for (const row of rows) {
    const status = String(row.status || 'unknown')
    byStatus[status] = (byStatus[status] || 0) + 1
  }
  return { total: rows.length, by_status: byStatus }
}

export default function WebsiteComplianceReports() {
  const { can, loading: hubLoading, complianceStatusLabel, actingHubId } = useHub()
  const moduleOn = can('module_website_compliance')
  const canView = can('wc_view_platform_report')
  const [tab, setTab] = useState('audit')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)

  useEffect(() => {
    if (hubLoading || !moduleOn || !canView || tab === 'summary') {
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .websiteComplianceChangeRequestReport()
      .then((data) => {
        if (!cancelled) setReport(data.report || null)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load change-request report.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hubLoading, moduleOn, canView, tab, actingHubId])

  const filteredRows = useMemo(
    () => filterRows(report?.rows || [], applied),
    [report?.rows, applied]
  )

  const filteredSummary = useMemo(() => summaryFromRows(filteredRows), [filteredRows])

  const filteredAuditEvents = useMemo(() => {
    const ids = new Set(filteredRows.map((row) => Number(row.id)))
    const events = Array.isArray(report?.audit_events) ? report.audit_events : []
    if (ids.size === 0) return []
    return events.filter((event) => ids.has(Number(event.subject_id)))
  }, [filteredRows, report?.audit_events])

  const statusOptions = useMemo(() => {
    const fromSummary = Object.keys(report?.summary?.by_status || {})
    if (fromSummary.length) return fromSummary
    return Array.from(new Set((report?.rows || []).map((row) => row.status).filter(Boolean)))
  }, [report])

  const reportColumns = [
    {
      key: 'id',
      label: 'ID',
      narrow: true,
      filterValue: (row) => String(row.id),
    },
    {
      key: 'submitted_by',
      label: 'Submitted by',
      render: (row) => (
        <CompliancePersonCell
          name={row.on_behalf_by || row.submitted_by}
          email={row.submitter_email}
          role={row.submitter_role}
        />
      ),
      filterValue: (row) =>
        [row.on_behalf_by, row.submitted_by, row.submitter_email, row.submitter_role]
          .filter(Boolean)
          .join(' '),
    },
    {
      key: 'firm',
      label: 'Firm',
      render: (row) => row.firm_name || '—',
      filterValue: (row) => row.firm_name || '',
    },
    {
      key: 'section',
      label: 'Section',
      render: (row) => row.section_name || '—',
      filterValue: (row) => row.section_name || '',
    },
    {
      key: 'version',
      label: 'Ver',
      narrow: true,
      render: (row) => <>v{row.current_version}</>,
      filterValue: (row) => String(row.current_version ?? ''),
    },
    {
      key: 'status',
      label: 'Status',
      fit: true,
      render: (row) => (
        <WcStatusBadge status={row.status} at={complianceStatusChangedAt(row)} />
      ),
      filterValue: (row) =>
        [row.status, formatDateTime(complianceStatusChangedAt(row), '')].filter(Boolean).join(' '),
      truncate: false,
    },
    {
      key: 'assigned_to',
      label: 'Assigned to',
      render: (row) => (
        <CompliancePersonCell
          name={row.assigned_to}
          email={row.assigned_to_email}
          role={row.assigned_to_role}
        />
      ),
      filterValue: (row) =>
        [row.assigned_to, row.assigned_to_email, row.assigned_to_role].filter(Boolean).join(' '),
    },
    {
      key: 'reviewed_by',
      label: 'Reviewed by',
      render: (row) => row.reviewed_by || '—',
      filterValue: (row) => row.reviewed_by || '',
    },
    {
      key: 'audit_trail',
      label: 'Audit trail',
      fit: true,
      render: (row) => (
        <ComplianceAuditTrailCell
          events={row.audit_trail}
          summary={row.audit_trail_summary}
          requestLabel="Change request"
          requestId={row.id}
        />
      ),
      filterValue: (row) => row.audit_trail_summary || '',
      truncate: false,
    },
    {
      key: 'submitted',
      label: 'Submitted',
      date: true,
      render: (row) => <DataGridDate value={row.submission_date} />,
      filterValue: (row) => formatDateTime(row.submission_date, ''),
      sortValue: (row) =>
        row.submission_date ? new Date(row.submission_date).getTime() : 0,
      truncate: false,
    },
  ]

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Content Pre Approval</p>
            <h1>Reports</h1>
            <p className="muted">
              Website Content Pre Approval is not enabled for this hub. Ask Power Admin to enable it
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
            <p className="eyebrow">Website Content Pre Approval</p>
            <h1>Reports</h1>
            <p className="muted">
              You do not have permission to view the Website Content Pre Approval platform report.
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
          <p className="eyebrow">Website Content Pre Approval</p>
          <h1>Reports</h1>
          <p className="muted">
            Full change-request audit trail (who submitted, assigned, reviewed) plus platform summary.
          </p>
        </div>
      </div>

      <div className="tab-row">
        <button
          type="button"
          className={`btn ghost ${tab === 'audit' ? 'active' : ''}`}
          onClick={() => setTab('audit')}
        >
          Audit trail
        </button>
        <button
          type="button"
          className={`btn ghost ${tab === 'summary' ? 'active' : ''}`}
          onClick={() => setTab('summary')}
        >
          Platform summary
        </button>
      </div>

      {tab === 'summary' ? (
        <div className="wc-app wc-surface">
          <PlatformSummaryReport />
        </div>
      ) : (
        <>
          <form
            className="filters-row"
            onSubmit={(e) => {
              e.preventDefault()
              setApplied({ ...filters })
            }}
          >
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
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {complianceStatusLabel(status) || status}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
            <button className="btn primary" type="submit">
              Filter
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setFilters(emptyFilters)
                setApplied(emptyFilters)
              }}
            >
              Reset
            </button>
          </form>

          {error ? <div className="alert">{error}</div> : null}
          {loading ? (
            <div className="state">Loading...</div>
          ) : (
            <>
              <div className="compliance-pie-row">
                <CompliancePieChart
                  title="By status"
                  total={filteredSummary.total}
                  segments={statusPieSegments(filteredSummary.by_status, complianceStatusLabel)}
                />
              </div>

              <ComplianceReportAuditPanel
                events={filteredAuditEvents}
                rows={filteredRows}
                hub={report?.hub}
                title="Full change-request audit history"
                requestLabel="Change request"
                requestPath={(id) => `/my-dashboard/website-compliance/my-requests/${id}`}
                LinkComponent={Link}
              />

              <div className="compliance-report-rows" style={{ marginTop: 16 }}>
                <div className="page-head" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Change request rows</h2>
                    <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                      Open a request’s audit trail from the column — it opens in a dialog, not inside
                      the table.
                    </p>
                  </div>
                </div>
                <DataGrid
                  columns={reportColumns}
                  rows={filteredRows}
                  emptyMessage="No change requests found."
                  pageSize={10}
                  actionsLabel="Actions"
                  actionsMinWidth="4.5rem"
                  actions={(row) => (
                    <DataGridIconBtn
                      as={Link}
                      to={`/my-dashboard/website-compliance/my-requests/${row.id}`}
                      state={{ from: 'reports' }}
                      icon={FaEye}
                      label="Open request"
                    />
                  )}
                />
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
