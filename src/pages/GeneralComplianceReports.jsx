import { useEffect, useState } from 'react'
import { api } from '../api/client'
import GcStatusBadge, { GcBarChart } from '../components/GeneralComplianceUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const emptyFilters = { status: '', from: '', to: '', q: '' }

export default function GeneralComplianceReports() {
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
        if (tab === 'report') {
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

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">General Compliance</p>
            <h1>Reports</h1>
            <p className="muted">
              {!moduleOn
                ? 'Enable the General Compliance module first.'
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
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Submitted by</th>
                  <th>Files</th>
                  <th>Ver</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>Reviewed by</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {(report?.rows || []).map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>
                      {row.submitted_by}
                      {row.on_behalf_of ? (
                        <>
                          <br />
                          <small className="muted">Advisor: {row.on_behalf_of}</small>
                        </>
                      ) : null}
                      <br />
                      <small className="muted">{row.submitter_email}</small>
                    </td>
                    <td>{row.attachment_count ?? '—'}</td>
                    <td>
                      v{row.current_version} / {row.version_count}
                    </td>
                    <td>
                      <GcStatusBadge status={row.status} />
                    </td>
                    <td>{row.assigned_to || '—'}</td>
                    <td>{row.reviewed_by || '—'}</td>
                    <td>{row.submission_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
