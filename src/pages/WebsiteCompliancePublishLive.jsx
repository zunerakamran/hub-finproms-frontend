import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaGlobe, FaPen, FaRocket, FaSearch } from 'react-icons/fa'
import { useHub } from '../context/HubContext'
import api from '../websiteCompliance/wcApi'
import {
  isDeploymentLive,
  isDeploymentOnSite,
  isDeploymentStagingPhase,
} from '../websiteCompliance/utils/deploymentStatus'

function siteName(req) {
  return (
    req?.advisor?.name ||
    req?.assigned_advisor?.name ||
    req?.requested_by?.name ||
    `Deployment #${req?.id}`
  )
}

function statusBadge(req) {
  if (isDeploymentLive(req.status)) {
    return {
      label: 'Live',
      className: 'text-emerald-700 bg-emerald-50',
    }
  }
  if (String(req.status || '').toLowerCase() === 'ready_for_live') {
    return {
      label: 'Go-live requested',
      className: 'text-indigo-700 bg-indigo-50',
    }
  }
  if (isDeploymentStagingPhase(req.status)) {
    return {
      label: 'Staging',
      className: 'text-sky-700 bg-sky-50',
    }
  }
  return {
    label: req.status || 'Site',
    className: 'text-gray-700 bg-gray-100',
  }
}

export default function WebsiteCompliancePublishLive() {
  const { can, loading: hubLoading, roleLabel, complianceStatusLabel } = useHub()
  const moduleOn = can('module_website_compliance')
  const canPublish = can('wc_publish_live_content')
  const advisorLabel = roleLabel('advisor') || 'Advisor'

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all') // all | staging | live

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/template-requests')
      const list = Array.isArray(res.data) ? res.data : []
      // Power Admin can publish without approval on both staging and live sites.
      setRequests(list.filter((r) => isDeploymentOnSite(r.status)))
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load sites.')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hubLoading || !moduleOn || !canPublish) return undefined
    load()
    return undefined
  }, [hubLoading, moduleOn, canPublish, load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return requests.filter((req) => {
      if (phaseFilter === 'live' && !isDeploymentLive(req.status)) return false
      if (phaseFilter === 'staging' && !isDeploymentStagingPhase(req.status)) return false

      if (!q) return true
      const hay = [
        siteName(req),
        req.domain_name,
        req.cpanel_domain,
        req.staging_domain,
        req.template_name,
        complianceStatusLabel(req.status) || req.status,
        String(req.id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [requests, search, phaseFilter, complianceStatusLabel])

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Content Pre Approval</p>
            <h1>Publish content</h1>
            <p className="muted">
              Website Content Pre Approval is not enabled for this hub. Enable it under Modules.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (!hubLoading && !canPublish) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Content Pre Approval</p>
            <h1>Publish content</h1>
            <p className="muted">
              You do not have permission to publish website content without approver review.
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
          <h1>Publish content</h1>
          <p className="muted">
            Edit sections on staging or live sites and publish straight to that website — no approver review.
          </p>
        </div>
      </div>

      <div className="wc-app wc-surface space-y-4">
        <div className="rounded-2xl border border-[var(--brand)]/25 bg-[var(--brand-softer)] px-5 py-4">
          <p className="text-sm font-bold text-[var(--brand-dark)]">Direct publish</p>
          <p className="text-xs text-slate-600 mt-1">
            Works for both <strong>staging</strong> and <strong>live</strong> sites. Changes sync immediately
            to the active URL for that deployment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex-1 min-w-[200px]">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search by ${advisorLabel.toLowerCase()}, domain, or template…`}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white"
            />
          </label>
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl bg-white px-3 py-2.5"
          >
            <option value="all">All on-site</option>
            <option value="staging">Staging only</option>
            <option value="live">Live only</option>
          </select>
          <button type="button" className="btn ghost" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && <div className="alert">{error}</div>}

        {loading ? (
          <div className="state">Loading sites…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
            <FaRocket className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-[var(--brand-dark)]">
              {requests.length === 0 ? 'No staging or live sites yet' : 'No sites match your filters'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {requests.length === 0 ? (
                <>
                  Deploy a site to staging from{' '}
                  <Link to="/my-dashboard/website-compliance/deployments" className="font-bold text-[var(--brand)]">
                    Site operations
                  </Link>{' '}
                  first, then return here to publish content.
                </>
              ) : (
                'Try a different search or filter.'
              )}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((req) => {
              const domain = req.cpanel_domain || req.staging_domain || req.domain_name || req.domain || '—'
              const badge = statusBadge(req)
              return (
                <article
                  key={req.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-3 hover:border-[var(--brand)]/40 hover:shadow-md transition"
                >
                  <div>
                    <p className={`text-[10px] font-extrabold uppercase tracking-wider inline-block px-2 py-0.5 rounded-full mb-2 ${badge.className}`}>
                      {badge.label}
                    </p>
                    <h2 className="text-base font-extrabold text-[var(--brand-dark)]">{siteName(req)}</h2>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                      <FaGlobe className="w-3 h-3 shrink-0" />
                      <span className="font-mono truncate">{domain}</span>
                    </p>
                    {req.template_name && (
                      <p className="text-xs text-gray-400 mt-1">Template: {req.template_name}</p>
                    )}
                    {isDeploymentStagingPhase(req.status) && req.domain_name && req.domain_name !== domain ? (
                      <p className="text-[11px] text-gray-400 mt-1">
                        Intended live: <span className="font-mono">{req.domain_name}</span>
                      </p>
                    ) : null}
                  </div>
                  <Link
                    to={`/my-dashboard/website-compliance/publish/${req.id}`}
                    className="mt-auto inline-flex items-center justify-center gap-2 btn primary w-full"
                  >
                    <FaPen className="w-3.5 h-3.5" />
                    Edit &amp; publish
                  </Link>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
