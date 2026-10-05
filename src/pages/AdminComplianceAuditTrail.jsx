import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FaSync } from 'react-icons/fa'
import { api } from '../api/client'
import { ComplianceReportAuditPanel } from '../components/ComplianceAuditTrail'
import { DataGridIconBtn } from '../components/DataGrid'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const TABS = [
  {
    key: 'smc',
    label: 'Social Media Compliance',
    shortLabel: 'SMC',
    moduleCapability: 'module_social_media_compliance',
    requestLabel: 'Request',
    requestPath: (id) => `/my-dashboard/social-media-compliance/${id}`,
  },
  {
    key: 'gc',
    label: 'General Compliance',
    shortLabel: 'GC',
    moduleCapability: 'module_general_compliance',
    requestLabel: 'Request',
    requestPath: (id) => `/my-dashboard/general-compliance/${id}`,
  },
  {
    key: 'wc',
    label: 'Website Content Pre Approval',
    shortLabel: 'WC',
    moduleCapability: 'module_website_compliance',
    requestLabel: 'Change request',
    requestPath: (id) => `/my-dashboard/website-compliance/my-requests/${id}`,
  },
]

const emptyFilters = { q: '', from: '', to: '' }

function tabFromSearch(params, available) {
  const raw = (params.get('tab') || '').toLowerCase()
  if (available.some((tab) => tab.key === raw)) return raw
  return available[0]?.key || 'smc'
}

export default function AdminComplianceAuditTrail({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub, isActingRemotely, actingHubId } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_view_compliance_audit_trail')
  const [searchParams, setSearchParams] = useSearchParams()

  const availableTabs = useMemo(
    () => TABS.filter((tab) => can(tab.moduleCapability)),
    // Hub capabilities change when acting hub switches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actingHubId, hubLoading, can]
  )

  const [tab, setTab] = useState(() => tabFromSearch(searchParams, TABS))
  const [events, setEvents] = useState([])
  const [meta, setMeta] = useState({ total: 0 })
  const [hubMeta, setHubMeta] = useState(null)
  const [filters, setFilters] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (hubLoading) return
    const pool = availableTabs.length ? availableTabs : TABS
    const next = tabFromSearch(searchParams, pool)
    setTab(next)
  }, [hubLoading, availableTabs, searchParams])

  const activeTab = TABS.find((item) => item.key === tab) || TABS[0]
  const moduleOn = can(activeTab.moduleCapability)

  const targetName = isActingRemotely
    ? actingHub?.name || hubMeta?.name || 'selected hub'
    : hubMeta?.name || 'this hub'

  const selectTab = (key) => {
    setTab(key)
    const next = new URLSearchParams(searchParams)
    next.set('tab', key)
    setSearchParams(next, { replace: true })
  }

  const load = useCallback(async () => {
    if (!enabled || !moduleOn) {
      setLoading(false)
      setEvents([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.complianceAuditEvents(
        {
          module: tab,
          q: applied.q || undefined,
          from: applied.from || undefined,
          to: applied.to || undefined,
          per_page: 200,
          page: 1,
        },
        { asPowerAdmin }
      )
      setEvents(data.events || [])
      setMeta(data.meta || { total: 0 })
      setHubMeta(data.hub || null)
    } catch (err) {
      setError(err.message || 'Failed to load compliance audit trail.')
      setEvents([])
      setMeta({ total: 0 })
    } finally {
      setLoading(false)
    }
  }, [asPowerAdmin, enabled, moduleOn, tab, applied])

  useEffect(() => {
    if (hubLoading) return
    if (!enabled) {
      setLoading(false)
      return
    }
    load()
  }, [hubLoading, enabled, load, actingHubId, isActingRemotely])

  if (!enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Hub</p>
            <h1>Audit trail</h1>
          </div>
        </div>
        <div className="empty-state">
          <h2>Capability disabled</h2>
          <p className="muted">
            Enable &quot;View compliance audit trail&quot; under Capabilities for your role on this
            hub.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Audit trail</h1>
          <p className="muted">
            Compliance lifecycle history for <strong>{targetName}</strong>
            {meta?.total != null ? ` · ${meta.total} events` : ''}. Choose a compliance type below.
          </p>
        </div>
        <div className="actions">
          <DataGridIconBtn icon={FaSync} label="Refresh" onClick={load} disabled={loading} />
        </div>
      </div>

      {availableTabs.length === 0 ? (
        <div className="empty-state">
          <h2>No compliance modules enabled</h2>
          <p className="muted">
            Turn on Social Media Compliance, General Compliance, or Website Content Pre Approval
            under Modules to see their audit trails.
          </p>
        </div>
      ) : (
        <>
          <div className="tab-row">
            {availableTabs.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`btn ghost ${tab === item.key ? 'active' : ''}`}
                onClick={() => selectTab(item.key)}
                title={item.label}
              >
                {item.shortLabel}
              </button>
            ))}
          </div>

          {error ? <div className="alert">{error}</div> : null}

          <form
            className="filters"
            onSubmit={(e) => {
              e.preventDefault()
              setApplied({ ...filters, q: filters.q.trim() })
            }}
          >
            <label>
              Search
              <input
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                placeholder="Actor, description, status…"
              />
            </label>
            <label>
              From
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              />
            </label>
            <button type="submit" className="btn primary" disabled={loading}>
              Apply
            </button>
          </form>

          {loading ? (
            <p className="muted">Loading audit trail…</p>
          ) : (
            <ComplianceReportAuditPanel
              events={events}
              hub={hubMeta}
              title={`${activeTab.label} — full audit history`}
              requestLabel={activeTab.requestLabel}
              requestPath={activeTab.requestPath}
              LinkComponent={Link}
              pageSize={10}
            />
          )}
        </>
      )}
    </section>
  )
}
