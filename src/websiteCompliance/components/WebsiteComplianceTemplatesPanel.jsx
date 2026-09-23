import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  FaCheckCircle,
  FaClock,
  FaCog,
  FaEdit,
  FaEyeSlash,
  FaGlobe,
  FaLayerGroup,
  FaPen,
  FaPlus,
  FaRocket,
  FaSearch,
  FaSync,
  FaThLarge,
  FaTimes,
  FaTimesCircle,
  FaTrash,
} from 'react-icons/fa'
import { useHub } from '../../context/HubContext'
import { defaultTemplatePreviewUrl, resolveHubPreviewBase } from '../utils/assetUrl'
import { sectionDisplayName } from '../utils/sectionDisplay'
import TemplateScrollPreview from './TemplateScrollPreview'
import api from '../wcApi'

function normalizeSiteUrl(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed.replace(/^\/+/, '')}`
}

function requestRequesterName(req, fallback = 'Unknown') {
  return req.requested_by?.name || req.requestedBy?.name || req.advisor?.name || fallback
}

function resolveAdvisorSiteUrl(req) {
  return normalizeSiteUrl(req.cpanel_domain || req.domain_name || req.domain || '')
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: FaClock,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  deployed: {
    label: 'Deployed',
    icon: FaCheckCircle,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    icon: FaTimesCircle,
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
}

function StatusBadge({ status }) {
  const { complianceStatusLabel } = useHub()
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = config.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${config.className}`}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      {complianceStatusLabel(status)}
    </span>
  )
}

const fieldLabelClass = 'block text-xs font-bold text-gray-700 mb-1.5'
const fieldInputClass =
  'w-full text-sm p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] focus:border-[var(--brand)] transition'

function ModalShell({ title, subtitle, onClose, children, maxWidth = 'max-w-lg' }) {
  return createPortal(
    <div className="wc-app wc-portal-root">
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--brand-dark)_60%,transparent)] backdrop-blur-sm">
        <div
          className={`bg-white rounded-2xl shadow-2xl border border-gray-200 w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
          role="dialog"
          aria-modal="true"
        >
          <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-[var(--brand-dark)]">{title}</h3>
              {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition shrink-0"
              aria-label="Close"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/**
 * Template catalog + Power Admin deploy / section management (from content-flow PowerAdminDashboard).
 */
export default function WebsiteComplianceTemplatesPanel() {
  const { can, hub, actingHub } = useHub()
  const previewBase = resolveHubPreviewBase({ hub, actingHub })
  const canManageTemplates = can('wc_manage_templates')
  const canDeployWebsites = can('wc_deploy_websites')
  const canPublishLive = can('wc_publish_live_content')
  const canManageSections = can('wc_manage_deployment_sections')
  const canViewDeployments =
    canDeployWebsites || can('wc_view_all_deployments') || canPublishLive

  const [activeTab, setActiveTab] = useState(
    canManageTemplates ? 'templates' : canViewDeployments ? 'deployments' : 'templates'
  )
  const [templates, setTemplates] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [templateSearch, setTemplateSearch] = useState('')
  const [requestSearch, setRequestSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [templateName, setTemplateName] = useState('')
  const [templateSlug, setTemplateSlug] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState('')
  const [templateIsActive, setTemplateIsActive] = useState(true)
  const [regeneratePreview, setRegeneratePreview] = useState(false)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

  const hubPreviewPlaceholder = useMemo(
    () => defaultTemplatePreviewUrl(templateSlug || 'template4', previewBase),
    [templateSlug, previewBase]
  )

  const [selectedRequest, setSelectedRequest] = useState(null)
  const [cpanelDomain, setCpanelDomain] = useState('')
  const [cpanelDbHost, setCpanelDbHost] = useState('localhost')
  const [cpanelDbName, setCpanelDbName] = useState('')
  const [cpanelDbUser, setCpanelDbUser] = useState('')
  const [cpanelDbPass, setCpanelDbPass] = useState('')
  const [cpanelApiKey, setCpanelApiKey] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)

  const [sectionManageRequest, setSectionManageRequest] = useState(null)
  const [deploymentSections, setDeploymentSections] = useState([])
  const [sectionDrafts, setSectionDrafts] = useState({})
  const [isLoadingSections, setIsLoadingSections] = useState(false)
  const [isSavingSections, setIsSavingSections] = useState(false)

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const [reqRes, tplRes] = await Promise.all([
          canViewDeployments ? api.get('/template-requests') : Promise.resolve({ data: [] }),
          canManageTemplates ? api.get('/templates?all=1') : Promise.resolve({ data: [] }),
        ])
        setRequests(Array.isArray(reqRes.data) ? reqRes.data : [])
        setTemplates(Array.isArray(tplRes.data) ? tplRes.data : [])
      } catch {
        setError('Failed to load templates / deployments.')
      } finally {
        setLoading(false)
      }
    },
    [canViewDeployments, canManageTemplates]
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase()
    if (!q) return templates
    return templates.filter(
      (tpl) =>
        tpl.name?.toLowerCase().includes(q) ||
        tpl.slug?.toLowerCase().includes(q) ||
        tpl.description?.toLowerCase().includes(q)
    )
  }, [templates, templateSearch])

  const filteredRequests = useMemo(() => {
    const q = requestSearch.trim().toLowerCase()
    return requests.filter((req) => {
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter
      const matchesSearch =
        !q ||
        [requestRequesterName(req, ''), req.template_name, req.domain_name, req.domain]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      return matchesStatus && matchesSearch
    })
  }, [requests, requestSearch, statusFilter])

  const openCreateTemplateModal = () => {
    setEditingTemplate(null)
    setTemplateName('')
    setTemplateSlug('')
    setTemplateDesc('')
    setTemplatePreviewUrl('')
    setRegeneratePreview(false)
    setTemplateIsActive(true)
    setShowTemplateModal(true)
  }

  const openEditTemplateModal = (tpl) => {
    setEditingTemplate(tpl)
    setTemplateName(tpl.name || '')
    setTemplateSlug(tpl.slug || '')
    setTemplateDesc(tpl.description || '')
    setTemplatePreviewUrl(tpl.preview_url || defaultTemplatePreviewUrl(tpl.slug, previewBase))
    setRegeneratePreview(false)
    setTemplateIsActive(Boolean(tpl.is_active))
    setShowTemplateModal(true)
  }

  const handleSaveTemplate = async (e) => {
    e.preventDefault()
    if (!templateName) return
    setIsSavingTemplate(true)
    setMessage('')
    setError('')
    try {
      const payload = {
        name: templateName,
        slug: templateSlug,
        description: templateDesc,
        preview_url: templatePreviewUrl || defaultTemplatePreviewUrl(templateSlug, previewBase),
        is_active: templateIsActive,
      }
      if (editingTemplate) {
        if (regeneratePreview) payload.regenerate_preview = true
        await api.put(`/templates/${editingTemplate.id}`, payload)
        setMessage(`Showcase template "${templateName}" updated.`)
      } else {
        await api.post('/templates', payload)
        setMessage(`Showcase template "${templateName}" created.`)
      }
      setShowTemplateModal(false)
      fetchData(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save template.')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const handleDeleteTemplate = async (tpl) => {
    if (!window.confirm(`Delete template "${tpl.name}"?`)) return
    try {
      await api.delete(`/templates/${tpl.id}`)
      setMessage(`Deleted template "${tpl.name}".`)
      fetchData(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete template.')
    }
  }

  const openDeployModal = (req) => {
    setSelectedRequest(req)
    setCpanelDomain(resolveAdvisorSiteUrl(req))
    setCpanelDbHost(req.cpanel_db_host || 'localhost')
    setCpanelDbName(req.cpanel_db_name || '')
    setCpanelDbUser(req.cpanel_db_user || '')
    setCpanelDbPass(req.cpanel_db_pass || '')
    setCpanelApiKey(req.cpanel_api_key || '')
  }

  const handleDeploySubmit = async (e) => {
    e.preventDefault()
    if (!selectedRequest) return
    setIsDeploying(true)
    setMessage('')
    setError('')
    try {
      await api.post(`/template-requests/${selectedRequest.id}/deploy`, {
        cpanel_domain: cpanelDomain,
        cpanel_db_host: cpanelDbHost,
        cpanel_db_name: cpanelDbName,
        cpanel_db_user: cpanelDbUser,
        cpanel_db_pass: cpanelDbPass,
        cpanel_api_key: cpanelApiKey,
      })
      setMessage(
        selectedRequest.status === 'deployed'
          ? `Deployment settings updated for ${cpanelDomain}.`
          : `Template deployed to ${cpanelDomain}.`
      )
      setSelectedRequest(null)
      fetchData(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deploy template.')
    } finally {
      setIsDeploying(false)
    }
  }

  const openSectionManageModal = async (req) => {
    setSectionManageRequest(req)
    setDeploymentSections([])
    setSectionDrafts({})
    setIsLoadingSections(true)
    setError('')
    try {
      const res = await api.get(`/template-requests/${req.id}/sections`)
      const list = Array.isArray(res.data?.sections) ? res.data.sections : []
      setDeploymentSections(list)
      const drafts = {}
      list.forEach((section) => {
        drafts[section.id] = {
          display_name: section.display_name || section.name || '',
          is_visible: section.is_visible !== false,
        }
      })
      setSectionDrafts(drafts)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load deployment sections.')
      setSectionManageRequest(null)
    } finally {
      setIsLoadingSections(false)
    }
  }

  const handleSaveDeploymentSections = async (e) => {
    e.preventDefault()
    if (!sectionManageRequest) return
    setIsSavingSections(true)
    setError('')
    try {
      const payload = deploymentSections.map((section) => {
        const draft = sectionDrafts[section.id] || {}
        return {
          id: section.id,
          display_name: draft.display_name?.trim() || section.name,
          is_visible: draft.is_visible !== false,
        }
      })
      await api.put(`/template-requests/${sectionManageRequest.id}/sections`, { sections: payload })
      setMessage(`Section settings saved for ${sectionManageRequest.domain_name || sectionManageRequest.domain}.`)
      setSectionManageRequest(null)
    } catch (err) {
      const apiMessage = err.response?.data?.message
      const synced = err.response?.data?.cpanel_synced
      if (err.response?.status === 502 && apiMessage) {
        setError(apiMessage)
        // Hub saved; keep modal open so the admin can retry after fixing cPanel.
      } else {
        setError(apiMessage || 'Failed to save section settings.')
      }
    } finally {
      setIsSavingSections(false)
    }
  }

  if (!canManageTemplates && !canViewDeployments) {
    return (
      <p className="muted text-sm">
        You do not have template or deployment management capabilities for Website Compliance.
      </p>
    )
  }

  const tabs = [
    canManageTemplates && { id: 'templates', label: 'Templates' },
    canViewDeployments && { id: 'deployments', label: 'Deploy hub' },
  ].filter(Boolean)

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm px-4 py-3">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm px-4 py-3">{error}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === tab.id ? 'bg-[var(--brand-dark)] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => fetchData(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"
        >
          <FaSync className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : activeTab === 'templates' && canManageTemplates ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--brand-dark)]">Showcase templates</h2>
              <p className="text-xs text-gray-500 mt-0.5">Register and edit templates available for deployments.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="wc-icon-field w-full sm:w-64">
                <FaSearch className="wc-icon-field__icon" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search templates…"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)]"
                />
              </div>
              <button
                type="button"
                onClick={openCreateTemplateModal}
                className="inline-flex items-center gap-1.5 bg-[var(--brand-dark)] text-white text-xs font-bold px-3 py-2 rounded-lg"
              >
                <FaPlus className="w-3 h-3" />
                Register
              </button>
            </div>
          </div>
          <div className="p-5">
            {filteredTemplates.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">No templates yet.</div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredTemplates.map((tpl) => (
                  <article key={tpl.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white flex flex-col hover:border-[color-mix(in_srgb,var(--brand-dark)_25%,transparent)] hover:shadow-md transition-all duration-300">
                    <TemplateScrollPreview
                      template={tpl}
                      className="h-40 w-full"
                      overlay={
                        <>
                          <div className="absolute top-3 left-3 bg-[color-mix(in_srgb,var(--brand-dark)_90%,transparent)] text-white font-mono text-[10px] font-bold px-2 py-1 rounded-md z-10 pointer-events-none">
                            {tpl.slug}
                          </div>
                          <div className="absolute top-3 right-3 z-10 pointer-events-none">
                            {tpl.is_active ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-full uppercase">
                                <FaCheckCircle className="w-2.5 h-2.5" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-gray-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-full uppercase">
                                <FaEyeSlash className="w-2.5 h-2.5" /> Disabled
                              </span>
                            )}
                          </div>
                        </>
                      }
                    />
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-extrabold text-[var(--brand-dark)]">{tpl.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 flex-1">{tpl.description || 'No description.'}</p>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => openEditTemplateModal(tpl)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--brand-dark)] bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg transition"
                        >
                          <FaEdit className="w-3 h-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl)}
                          className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-lg transition"
                          aria-label={`Delete ${tpl.name}`}
                        >
                          <FaTrash className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === 'deployments' && canViewDeployments ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 space-y-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--brand-dark)]">Deployment hub</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {canDeployWebsites
                  ? 'Deploy templates to cPanel and manage live section visibility.'
                  : 'View deployment requests across the hub.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="wc-icon-field flex-1">
                <FaSearch className="wc-icon-field__icon" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search domain, template, requester…"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="deployed">Deployed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              <FaThLarge className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              No deployment requests.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-gray-500 text-[10px] font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Requested by</th>
                    <th className="px-5 py-3">Template</th>
                    <th className="px-5 py-3">Domain</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3 font-bold text-[var(--brand-dark)]">{requestRequesterName(req, 'Advisor')}</td>
                      <td className="px-5 py-3">
                        <span className="font-bold text-xs bg-blue-50 text-[var(--brand-dark)] px-2 py-1 rounded-lg">
                          {req.template_name || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          <FaGlobe className="w-3 h-3 text-gray-400" />
                          {req.domain_name || req.domain || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {req.status === 'deployed' && canPublishLive && (
                            <Link
                              to={`/my-dashboard/website-compliance/publish/${req.id}`}
                              className="inline-flex items-center gap-1.5 bg-[var(--brand)] text-white text-xs font-bold px-3 py-2 rounded-lg"
                            >
                              <FaPen className="w-3 h-3" /> Edit &amp; publish
                            </Link>
                          )}
                          {req.status === 'deployed' && canManageSections && (
                            <button
                              type="button"
                              onClick={() => openSectionManageModal(req)}
                              className="inline-flex items-center gap-1.5 bg-white border border-[var(--brand-dark)] text-[var(--brand-dark)] text-xs font-bold px-3 py-2 rounded-lg"
                            >
                              <FaLayerGroup className="w-3 h-3" /> Sections
                            </button>
                          )}
                          {canDeployWebsites && (
                            <button
                              type="button"
                              onClick={() => openDeployModal(req)}
                              className="inline-flex items-center gap-1.5 bg-[var(--brand-dark)] text-white text-xs font-bold px-3 py-2 rounded-lg"
                            >
                              {req.status === 'deployed' ? (
                                <>
                                  <FaCog className="w-3 h-3" /> Update
                                </>
                              ) : (
                                <>
                                  <FaRocket className="w-3 h-3" /> Deploy
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {showTemplateModal && (
        <ModalShell
          title={editingTemplate ? 'Edit template' : 'Register template'}
          subtitle={
            editingTemplate
              ? 'Update catalog details for this showcase template.'
              : 'Add a showcase template to this hub’s Website Compliance catalog.'
          }
          onClose={() => setShowTemplateModal(false)}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveTemplate} className="space-y-5">
            <div>
              <label className={fieldLabelClass} htmlFor="wc-tpl-name">
                Name
              </label>
              <input
                id="wc-tpl-name"
                className={fieldInputClass}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template 4 (Complete Financial Centre)"
                required
              />
            </div>
            <div>
              <label className={fieldLabelClass} htmlFor="wc-tpl-slug">
                Slug
              </label>
              <input
                id="wc-tpl-slug"
                className={`${fieldInputClass} font-mono`}
                value={templateSlug}
                onChange={(e) => setTemplateSlug(e.target.value)}
                placeholder="template4"
              />
            </div>
            <div>
              <label className={fieldLabelClass} htmlFor="wc-tpl-desc">
                Description
              </label>
              <textarea
                id="wc-tpl-desc"
                className={fieldInputClass}
                rows={3}
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="Short summary shown in the template catalog"
              />
            </div>
            <div>
              <label className={fieldLabelClass} htmlFor="wc-tpl-preview">
                Preview URL
              </label>
              <input
                id="wc-tpl-preview"
                className={fieldInputClass}
                value={templatePreviewUrl}
                onChange={(e) => setTemplatePreviewUrl(e.target.value)}
                placeholder={hubPreviewPlaceholder}
              />
              <p className="text-[11px] text-gray-500 mt-1.5">
                Defaults to this hub’s site URL
                {previewBase ? (
                  <>
                    {' '}
                    (<span className="font-mono text-gray-600">{previewBase}</span>)
                  </>
                ) : null}
                .
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={templateIsActive}
                onChange={(e) => setTemplateIsActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              Active
            </label>
            {editingTemplate && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={regeneratePreview}
                  onChange={(e) => setRegeneratePreview(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Regenerate preview thumbnail
              </label>
            )}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingTemplate}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[var(--brand-dark)] text-white rounded-xl hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition disabled:opacity-50 shadow-md"
              >
                {isSavingTemplate ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {selectedRequest && (
        <ModalShell title="Deploy to cPanel" subtitle={requestRequesterName(selectedRequest)} onClose={() => setSelectedRequest(null)} maxWidth="max-w-xl">
          <form onSubmit={handleDeploySubmit} className="space-y-5">
            <div>
              <label className={fieldLabelClass} htmlFor="wc-deploy-domain">
                Site URL / domain
              </label>
              <input
                id="wc-deploy-domain"
                className={fieldInputClass}
                value={cpanelDomain}
                onChange={(e) => setCpanelDomain(e.target.value)}
                placeholder={hubPreviewPlaceholder}
                required
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={fieldLabelClass} htmlFor="wc-deploy-db-host">
                  DB host
                </label>
                <input
                  id="wc-deploy-db-host"
                  className={fieldInputClass}
                  value={cpanelDbHost}
                  onChange={(e) => setCpanelDbHost(e.target.value)}
                />
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="wc-deploy-db-name">
                  DB name
                </label>
                <input
                  id="wc-deploy-db-name"
                  className={fieldInputClass}
                  value={cpanelDbName}
                  onChange={(e) => setCpanelDbName(e.target.value)}
                />
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="wc-deploy-db-user">
                  DB user
                </label>
                <input
                  id="wc-deploy-db-user"
                  className={fieldInputClass}
                  value={cpanelDbUser}
                  onChange={(e) => setCpanelDbUser(e.target.value)}
                />
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="wc-deploy-db-pass">
                  DB pass
                </label>
                <input
                  id="wc-deploy-db-pass"
                  type="password"
                  className={fieldInputClass}
                  value={cpanelDbPass}
                  onChange={(e) => setCpanelDbPass(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={fieldLabelClass} htmlFor="wc-deploy-api-key">
                cPanel API key
              </label>
              <input
                id="wc-deploy-api-key"
                className={fieldInputClass}
                value={cpanelApiKey}
                onChange={(e) => setCpanelApiKey(e.target.value)}
              />
            </div>
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDeploying}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[var(--brand-dark)] text-white rounded-xl hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition disabled:opacity-50 shadow-md"
              >
                {isDeploying ? 'Deploying…' : 'Deploy'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {sectionManageRequest && (
        <ModalShell
          title="Manage sections"
          subtitle={sectionManageRequest.domain_name || sectionManageRequest.domain}
          onClose={() => setSectionManageRequest(null)}
          maxWidth="max-w-2xl"
        >
          {isLoadingSections ? (
            <p className="text-sm text-gray-500">Loading sections…</p>
          ) : (
            <form onSubmit={handleSaveDeploymentSections} className="space-y-3">
              {deploymentSections.map((section) => {
                const draft = sectionDrafts[section.id] || {}
                return (
                  <div key={section.id} className="flex flex-col sm:flex-row sm:items-center gap-2 border border-gray-100 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 font-mono">{section.name}</p>
                      <input
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                        value={draft.display_name ?? sectionDisplayName(section)}
                        onChange={(e) =>
                          setSectionDrafts((prev) => ({
                            ...prev,
                            [section.id]: { ...prev[section.id], display_name: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm shrink-0">
                      <input
                        type="checkbox"
                        checked={draft.is_visible !== false}
                        onChange={(e) =>
                          setSectionDrafts((prev) => ({
                            ...prev,
                            [section.id]: { ...prev[section.id], is_visible: e.target.checked },
                          }))
                        }
                      />
                      Visible
                    </label>
                  </div>
                )
              })}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSectionManageRequest(null)} className="text-xs font-bold px-3 py-2 rounded-lg border">
                  Cancel
                </button>
                <button type="submit" disabled={isSavingSections} className="text-xs font-bold px-3 py-2 rounded-lg bg-[var(--brand-dark)] text-white disabled:opacity-60">
                  {isSavingSections ? 'Saving…' : 'Save sections'}
                </button>
              </div>
            </form>
          )}
        </ModalShell>
      )}
    </div>
  )
}
