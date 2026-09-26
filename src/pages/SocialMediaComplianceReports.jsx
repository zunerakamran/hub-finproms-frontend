import { useEffect, useState } from 'react'
import { api } from '../api/client'
import DataGrid from '../components/DataGrid'
import SmcStatusBadge, { SmcBarChart } from '../components/SocialMediaComplianceUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const emptyFilters = { status: '', from: '', to: '', q: '' }

export default function SocialMediaComplianceReports() {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, complianceStatusLabel, actingHubId } = useHub()
  const [tab, setTab] = useState('report')
  const [filters, setFilters] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [report, setReport] = useState(null)
  const [workload, setWorkload] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const asPowerAdmin = isPowerAdmin
  const moduleOn = can('module_social_media_compliance')
  const enabled = moduleOn && can('smc_view_reports')

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
        if (tab === 'report') {
          const data = await api.socialMediaComplianceReport(params, { asPowerAdmin })
          if (!cancelled) setReport(data.report || null)
        } else if (tab === 'workload') {
          const data = await api.socialMediaComplianceApproverWorkload(
            { from: params.from, to: params.to },
            { asPowerAdmin }
          )
          if (!cancelled) setWorkload(data.chart || null)
        } else {
          const data = await api.socialMediaComplianceAdvisorComparison(params, { asPowerAdmin })
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
      const blob = await api.socialMediaComplianceReportExport(
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
      a.download = `social-media-compliance-report-${new Date().toISOString().slice(0, 10)}.csv`
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
      filterValue: (row) => String(row.id),
    },
    {
      key: 'submitted_by',
      label: 'Submitted by',
      render: (row) => (
        <>
          {row.on_behalf_of ? (
            <p className="attribution-highlight attribution-highlight--flush">{row.submitted_by}</p>
          ) : (
            row.submitted_by
          )}
          <br />
          <small className="muted">{row.submitter_email}</small>
        </>
      ),
      filterValue: (row) => [row.submitted_by, row.submitter_email].filter(Boolean).join(' '),
    },
    {
      key: 'post',
      label: 'Post',
      render: (row) => row.post_title || row.post_id || '—',
      filterValue: (row) => String(row.post_title || row.post_id || ''),
    },
    {
      key: 'version',
      label: 'Ver',
      render: (row) => (
        <>
          v{row.current_version} / {row.version_count}
        </>
      ),
      filterValue: (row) => `${row.current_version} ${row.version_count}`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <SmcStatusBadge status={row.status} />,
      filterValue: (row) => row.status || '',
    },
    {
      key: 'assigned_to',
      label: 'Assigned',
      render: (row) => row.assigned_to || '—',
      filterValue: (row) => row.assigned_to || '',
    },
    {
      key: 'reviewed_by',
      label: 'Reviewed by',
      render: (row) => row.reviewed_by || '—',
      filterValue: (row) => row.reviewed_by || '',
    },
    {
      key: 'submission_date',
      label: 'Submitted',
      render: (row) => row.submission_date || '—',
      filterValue: (row) => row.submission_date || '',
    },
  ]

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Social Media Compliance</p>
            <h1>Reports</h1>
            <p className="muted">
              {!moduleOn
                ? 'Enable the Social Media Pre Approval module first.'
                : 'Enable “View social media compliance reports & charts” for your role.'}
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
          <p className="eyebrow">Social Media Compliance</p>
          <h1>Reports</h1>
          <p className="muted">Filterable report, CSV export, and workload charts.</p>
        </div>
        {tab === 'report' && (
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
          <option value="Rejected">{complianceStatusLabel('Rejected')}</option>
          <option value="Approved with Feedback">{complianceStatusLabel('Approved with Feedback')}</option>
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
      ) : tab === 'report' ? (
        <>
          {summary && (
            <div className="stat-grid">
              <div className="stat-card">
                <strong>{summary.total}</strong>
                <span>Total</span>
              </div>
              {Object.entries(summary.by_status || {}).map(([status, count]) => (
                <div className="stat-card" key={status}>
                  <strong>{count}</strong>
                  <span>{complianceStatusLabel(status)}</span>
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
          )}
          <div style={{ marginTop: 16 }}>
            <DataGrid
              columns={reportColumns}
              rows={report?.rows || []}
              emptyMessage="No report rows for the current filters."
              pageSize={10}
            />
          </div>
        </>
      ) : tab === 'workload' ? (
        <SmcBarChart
          title="Approver workload"
          labels={workload?.labels || []}
          data={workload?.datasets?.[0]?.data || []}
        />
      ) : (
        <SmcBarChart
          title="Advisor comparison"
          labels={comparison?.labels || []}
          data={comparison?.datasets?.[0]?.data || []}
        />
      )}
    </section>
  )
}
