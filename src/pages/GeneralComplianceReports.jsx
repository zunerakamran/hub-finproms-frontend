import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEye } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import GcStatusBadge, { GcBarChart } from '../components/GeneralComplianceUI'
import {
  ComplianceAuditTrailCell,
  CompliancePersonCell,
  ComplianceReportAuditPanel,
} from '../components/ComplianceAuditTrail'
import ComplianceStatusText from '../components/ComplianceStatusText'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatDateTime, complianceStatusChangedAt } from '../utils/dateFormat'

const emptyFilters = { status: '', from: '', to: '', q: '' }

export default function GeneralComplianceReports() {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, complianceStatusLabel, actingHubId } = useHub()
  const [tab, setTab] = useState('audit')
  const [filters, setFilters] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [report, setReport] = useState(null)
  const [workload, setWorkload] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const asPowerAdmin = isPowerAdmin
  const moduleOn = can('module_general_compliance')
  const enabled = moduleOn && can('gc_view_reports')

  useEffect(() => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')

    const params = {
      status: applied.status || undefined,
      from: applied.from || undefined,
      to: applied.to || undefined,
      q: applied.q || undefined,
    }

    const load = async () => {
      try {
        if (tab === 'report' || tab === 'audit') {
          const data = await api.generalComplianceReport(params, { asPowerAdmin })
          if (!cancelled) setReport(data.report || null)
        } else if (tab === 'workload') {
          const data = await api.generalComplianceApproverWorkload(
            { from: params.from, to: params.to },
            { asPowerAdmin }
          )
          if (!cancelled) setWorkload(data.chart || null)
        } else {
          const data = await api.generalComplianceAdvisorComparison(params, { asPowerAdmin })
          if (!cancelled) setComparison(data.chart || null)
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load report.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [hubLoading, enabled, tab, applied, asPowerAdmin, actingHubId])

  const exportCsv = async () => {
    setExporting(true)
    setError('')
    try {
      const blob = await api.generalComplianceReportExport(
        {
          status: applied.status || undefined,
          from: applied.from || undefined,
          to: applied.to || undefined,
          q: applied.q || undefined,
        },
        { asPowerAdmin }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `general-compliance-report-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

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
          name={
            row.on_behalf_by || row.on_behalf_of
              ? row.on_behalf_by || row.submitted_by
              : row.submitted_by
          }
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
      key: 'files',
      label: 'Files',
      render: (row) => row.attachment_count ?? '—',
      filterValue: (row) => String(row.attachment_count ?? ''),
    },
    {
      key: 'version',
      label: 'Ver',
      narrow: true,
      render: (row) => (
        <>
          v{row.current_version} / {row.version_count}
        </>
      ),
      filterValue: (row) => `${row.current_version} ${row.version_count}`,
    },
    {
      key: 'content_type',
      label: 'Content type',
      fit: true,
      render: (row) => row.content_type || '—',
      filterValue: (row) => row.content_type || '',
    },
    {
      key: 'status',
      label: 'Status',
      fit: true,
      render: (row) => (
        <GcStatusBadge status={row.status} at={complianceStatusChangedAt(row)} />
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
      key: 'assigned_by',
      label: 'Assigned by',
      render: (row) => (
        <CompliancePersonCell
          name={row.assigned_by}
          email={row.assigned_by_email}
          role={row.assigned_by_role}
        />
      ),
      filterValue: (row) =>
        [row.assigned_by, row.assigned_by_email, row.assigned_by_role].filter(Boolean).join(' '),
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
      render: (row) => (
        <ComplianceAuditTrailCell
          events={row.audit_trail}
          summary={row.audit_trail_summary}
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

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">General Compliance</p>
            <h1>Reports</h1>
            <p className="muted">
              {!moduleOn
                ? 'Enable the Generic Content Pre Approval module first.'
                : 'Enable “View general compliance reports & charts” for your role.'}
            </p>
          </div>
        </div>
      </section>
    )
  }

  const summary = report?.summary

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">General Compliance</p>
          <h1>Reports</h1>
          <p className="muted">
            Filterable report with full audit trail, CSV export, and workload charts.
          </p>
        </div>
        {(tab === 'report' || tab === 'audit') && (
          <button className="btn ghost" onClick={exportCsv} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        )}
      </div>

      <div className="tab-row">
        <button
          type="button"
          className={`btn ghost ${tab === 'report' ? 'active' : ''}`}
          onClick={() => setTab('report')}
        >
          Report
        </button>
        <button
          type="button"
          className={`btn ghost ${tab === 'audit' ? 'active' : ''}`}
          onClick={() => setTab('audit')}
        >
          Audit trail
        </button>
        <button
          type="button"
          className={`btn ghost ${tab === 'workload' ? 'active' : ''}`}
          onClick={() => setTab('workload')}
        >
          Approver workload
        </button>
        <button
          type="button"
          className={`btn ghost ${tab === 'comparison' ? 'active' : ''}`}
          onClick={() => setTab('comparison')}
        >
          Advisor comparison
        </button>
      </div>

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
          <option value="Pending">{complianceStatusLabel('Pending')}</option>
          <option value="Approved">{complianceStatusLabel('Approved')}</option>
          <option value="Approved with Feedback">{complianceStatusLabel('Approved with Feedback')}</option>
          <option value="Rejected">{complianceStatusLabel('Rejected')}</option>
          <option value="Approved (Right First Time)">Approved (Right First Time)</option>
          <option value="Approved (Multiple Attempts)">Approved (Multiple Attempts)</option>
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

      {error && <div className="alert">{error}</div>}
      {loading ? (
        <div className="state">Loading...</div>
      ) : tab === 'report' || tab === 'audit' ? (
        <>
          {tab === 'report' && summary ? (
            <div className="stat-grid">
              <div className="stat-card">
                <strong>{summary.total}</strong>
                <span>Total</span>
              </div>
              {Object.entries(summary.by_status || {}).map(([status, count]) => (
                <div className="stat-card" key={status}>
                  <strong>{count}</strong>
                  <span>
                    <ComplianceStatusText status={status} label={complianceStatusLabel(status)} />
                  </span>
                </div>
              ))}
              <div className="stat-card">
                <strong>{summary.approved_right_first_time}</strong>
                <span>Right first time</span>
              </div>
              <div className="stat-card">
                <strong>{summary.approved_multiple_attempts}</strong>
                <span>Multiple attempts</span>
              </div>
            </div>
          ) : null}

          <ComplianceReportAuditPanel
            events={report?.audit_events}
            rows={report?.rows || []}
            hub={report?.hub}
            title="Full audit history"
            requestLabel="Request"
            requestPath={(id) => `/my-dashboard/general-compliance/${id}`}
            LinkComponent={Link}
          />

          {tab === 'report' ? (
            <div style={{ marginTop: 16 }}>
              <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem' }}>Request rows</h2>
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
                    to={`/my-dashboard/general-compliance/${row.id}`}
                    state={{ from: 'reports' }}
                  />
                )}
              />
            </div>
          ) : null}
        </>
      ) : tab === 'workload' ? (
        <GcBarChart
          title="Approver workload"
          labels={workload?.labels || []}
          data={workload?.datasets?.[0]?.data || []}
        />
      ) : (
        <GcBarChart
          title="Advisor comparison"
          labels={comparison?.labels || []}
          data={comparison?.datasets?.[0]?.data || []}
        />
      )}
    </section>
  )
}
