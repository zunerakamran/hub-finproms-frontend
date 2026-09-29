import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaGlobe, FaPen, FaRocket, FaSearch } from 'react-icons/fa'
import { useHub } from '../context/HubContext'
import api from '../websiteCompliance/wcApi'

function siteName(req) {
  return (
    req?.advisor?.name ||
    req?.assigned_advisor?.name ||
    req?.requested_by?.name ||
    `Deployment #${req?.id}`
  )
}

export default function WebsiteCompliancePublishLive() {
  const { can, loading: hubLoading, roleLabel } = useHub()
  const moduleOn = can('module_website_compliance')
  const canPublish = can('wc_publish_live_content')
  const advisorLabel = roleLabel('advisor') || 'Advisor'

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/template-requests')
      const list = Array.isArray(res.data) ? res.data : []
      setRequests(list.filter((r) => String(r.status || '').toLowerCase() === 'deployed'))
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load live sites.')
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
    if (!q) return requests
    return requests.filter((req) => {
      const hay = [
        siteName(req),
        req.domain_name,
        req.cpanel_domain,
        req.template_name,
        String(req.id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [requests, search])

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Website Compliance</p>
            <h1>Publish live content</h1>
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
            <p className="eyebrow">Website Compliance</p>
            <h1>Publish live content</h1>
            <p className="muted">
              You do not have permission to publish live website content without approver review.
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
          <p className="eyebrow">Website Compliance</p>
          <h1>Publish live content</h1>
          <p className="muted">
            Pick a live site, edit sections, and publish straight to the website — no approver review.
          </p>
        </div>
      </div>

      <div className="wc-app wc-surface space-y-4">
        <div className="rounded-2xl border border-[var(--brand)]/25 bg-[var(--brand-softer)] px-5 py-4">
          <p className="text-sm font-bold text-[var(--brand-dark)]">Direct publish</p>
          <p className="text-xs text-slate-600 mt-1">
            Changes go live immediately. Use this when you need to update a {advisorLabel.toLowerCase()}{' '}
            site without creating a change request.
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
          <button type="button" className="btn ghost" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && <div className="alert">{error}</div>}

        {loading ? (
          <div className="state">Loading live sites…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
            <FaRocket className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-[var(--brand-dark)]">
              {requests.length === 0 ? 'No live sites yet' : 'No sites match your search'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {requests.length === 0 ? (
                <>
                  Deploy a site from{' '}
                  <Link to="/my-dashboard/website-compliance/deployments" className="font-bold text-[var(--brand)]">
                    Site operations
                  </Link>{' '}
                  first, then return here to publish content.
                </>
              ) : (
                'Try a different search term.'
              )}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((req) => {
              const domain = req.cpanel_domain || req.domain_name || req.domain || '—'
              return (
                <article
                  key={req.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-3 hover:border-[var(--brand)]/40 hover:shadow-md transition"
                >
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 inline-block px-2 py-0.5 rounded-full mb-2">
                      Live
                    </p>
                    <h2 className="text-base font-extrabold text-[var(--brand-dark)]">{siteName(req)}</h2>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                      <FaGlobe className="w-3 h-3 shrink-0" />
                      <span className="font-mono truncate">{domain}</span>
                    </p>
                    {req.template_name && (
                      <p className="text-xs text-gray-400 mt-1">Template: {req.template_name}</p>
                    )}
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
