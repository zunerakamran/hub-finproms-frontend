import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEye } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import {
  ComplianceAuditTrailCell,
  CompliancePersonCell,
  ComplianceReportAuditPanel,
} from '../components/ComplianceAuditTrail'
import ComplianceStatusText from '../components/ComplianceStatusText'
import WcStatusBadge from '../components/WebsiteComplianceUI'
import { useHub } from '../context/HubContext'
import PlatformSummaryReport from '../websiteCompliance/components/PlatformSummaryReport'
import { formatDateTime, complianceStatusChangedAt } from '../utils/dateFormat'

export default function WebsiteComplianceReports() {
  const { can, loading: hubLoading, complianceStatusLabel, actingHubId } = useHub()
  const moduleOn = can('module_website_compliance')
  const canView = can('wc_view_platform_report')
  const [tab, setTab] = useState('audit')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const summary = report?.summary

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
          {error ? <div className="alert">{error}</div> : null}
          {loading ? (
            <div className="state">Loading...</div>
          ) : (
            <>
              {summary ? (
                <div className="stat-grid">
                  <div className="stat-card">
                    <strong>{summary.total}</strong>
                    <span>Total</span>
                  </div>
                  {Object.entries(summary.by_status || {}).map(([status, count]) => (
                    <div className="stat-card" key={status}>
                      <strong>{count}</strong>
                      <span>
                        <ComplianceStatusText
                          status={status}
                          label={complianceStatusLabel(status)}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              <ComplianceReportAuditPanel
                events={report?.audit_events}
                rows={report?.rows || []}
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
                  rows={report?.rows || []}
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
