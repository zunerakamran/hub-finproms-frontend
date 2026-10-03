import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  FaCheckCircle,
  FaEdit,
  FaEyeSlash,
  FaFileAlt,
  FaGlobe,
  FaImage,
  FaPalette,
  FaPlus,
  FaSearch,
  FaSync,
  FaTimes,
  FaTrash,
} from 'react-icons/fa'
import { useHub } from '../../context/HubContext'
import DataGrid, { DataGridDate } from '../../components/DataGrid'
import FileDropzone from '../../components/FileDropzone'
import RequiredMark from '../../components/RequiredMark'
import RichTextEditor from '../../components/RichTextEditor'
import WcStatusBadge from '../../components/WebsiteComplianceUI'
import { websiteComplianceAssetUrl } from '../../api/client'
import { formatDateTime } from '../../utils/dateFormat'
import { truncateRichText } from '../../utils/richText'
import { defaultTemplatePreviewUrl, resolveHubPreviewBase } from '../utils/assetUrl'
import { sectionDisplayName } from '../utils/sectionDisplay'
import TemplateScrollPreview from './TemplateScrollPreview'
import { ColorSchemesEditor, normalizeColorSchemes } from './ColorSchemeFields'
import {
  AvailablePagesEditor,
  normalizeAvailablePages,
  TemplateRequestDetailsView,
} from './TemplateRequestContentFields'
import {
  AssignAdvisorModal,
  CreateDeploymentModal,
  isRequestedByAdvisor,
} from './DeploymentRequestPanel'
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

const fieldLabelClass = 'block text-xs font-bold text-gray-700 mb-1.5'
const fieldInputClass = 'wc-field-input'

function storedUploadPath(data) {
  const path = data?.relative_url || data?.url || ''
  if (!path || /^data:/i.test(path)) return ''
  const name = String(path).split('/').pop().split('?')[0]
  if (!name) return ''
  if (path.includes('/website-compliance/uploaded-images') || path.includes('/uploaded-images') || path.includes('/uploads/')) {
    return `/website-compliance/uploaded-images/${name}`
  }
  return path.startsWith('/') ? path : `/website-compliance/uploaded-images/${name}`
}

function BrandingUploadField({
  id,
  label,
  accept,
  hint,
  value,
  previewUrl,
  uploading,
  onUpload,
  onClear,
  darkPreview = false,
}) {
  const [localFile, setLocalFile] = useState(null)
  const displaySrc = previewUrl || (value ? websiteComplianceAssetUrl(value) : '')

  useEffect(() => {
    if (!uploading) setLocalFile(null)
  }, [value, uploading])

  return (
    <div>
      <div className="flex items-start gap-3">
        <div
          className={`w-14 h-14 rounded-xl border overflow-hidden shrink-0 flex items-center justify-center ${
            darkPreview ? 'border-gray-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
          }`}
        >
          {displaySrc ? (
            <img src={displaySrc} alt="" className="w-full h-full object-contain p-1" />
          ) : (
            <FaImage className={`w-5 h-5 ${darkPreview ? 'text-gray-500' : 'text-gray-300'}`} aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <FileDropzone
            id={id}
            label={
              <>
                {label} <span className="text-gray-400 font-normal">(optional)</span>
              </>
            }
            accept={accept}
            hint={hint}
            disabled={uploading}
            files={localFile ? [localFile] : []}
            onChange={(next) => {
              const file = next[0] || null
              setLocalFile(file)
              if (file) onUpload(file)
            }}
          />
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="block text-[11px] font-semibold text-rose-600 hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

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
export default function WebsiteComplianceTemplatesPanel({ includeRequestActions = false }) {
  const { can, hub, actingHub, complianceStatusLabel } = useHub()
  const previewBase = resolveHubPreviewBase({ hub, actingHub })
  const canManageTemplates = can('wc_manage_templates')
  const canDeployWebsites = can('wc_deploy_websites')
  const canPublishLive = can('wc_publish_live_content')
  const canManageSections = can('wc_manage_deployment_sections')
  const canRequest = includeRequestActions && (can('wc_request_deployments') || can('wc_assign_website_templates'))
  const canAssignAdvisor = includeRequestActions && can('wc_assign_website_templates')
  const canViewDeployments =
    canDeployWebsites || can('wc_view_all_deployments') || canPublishLive

  const [activeTab, setActiveTab] = useState(
    canManageTemplates ? 'templates' : canViewDeployments ? 'deployments' : 'templates'
  )
  const [templates, setTemplates] = useState([])
  const [requests, setRequests] = useState([])
  const [advisors, setAdvisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [templateSearch, setTemplateSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [appliedStatus, setAppliedStatus] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)
  const [detailsRequest, setDetailsRequest] = useState(null)
  const [showDeployRequestDetails, setShowDeployRequestDetails] = useState(true)

  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [templateName, setTemplateName] = useState('')
  const [templateSlug, setTemplateSlug] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState('')
  const [templateIsActive, setTemplateIsActive] = useState(true)
  const [templateColorSchemes, setTemplateColorSchemes] = useState([])
  const [templateAvailablePages, setTemplateAvailablePages] = useState([])
  const [regeneratePreview, setRegeneratePreview] = useState(false)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

  const hubPreviewPlaceholder = useMemo(
    () => defaultTemplatePreviewUrl(templateSlug || 'template4', previewBase),
    [templateSlug, previewBase]
  )

  const [selectedRequest, setSelectedRequest] = useState(null)
  const [brandingOnlyRequest, setBrandingOnlyRequest] = useState(null)
  const [cpanelDomain, setCpanelDomain] = useState('')
  const [cpanelDbHost, setCpanelDbHost] = useState('localhost')
  const [cpanelDbName, setCpanelDbName] = useState('')
  const [cpanelDbUser, setCpanelDbUser] = useState('')
  const [cpanelDbPass, setCpanelDbPass] = useState('')
  const [cpanelApiKey, setCpanelApiKey] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [whiteLogoUrl, setWhiteLogoUrl] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [whiteLogoPreview, setWhiteLogoPreview] = useState('')
  const [faviconPreview, setFaviconPreview] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingWhiteLogo, setUploadingWhiteLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#0B1B3D')
  const [secondaryColor, setSecondaryColor] = useState('#C8102E')
  const [isSavingBranding, setIsSavingBranding] = useState(false)

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

      if (!canAssignAdvisor) {
        setAdvisors([])
        return
      }

      try {
        const usersRes = await api.get('/advisors')
        const users = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data || []
        setAdvisors(users.filter((u) => u.role === 'advisor' || u.role === 'editor'))
      } catch {
        try {
          const usersRes = await api.get('/users')
          const users = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data || []
          setAdvisors(users.filter((u) => u.role === 'advisor' || u.role === 'editor'))
        } catch {
          setAdvisors([])
        }
      }
    },
    [canViewDeployments, canManageTemplates, canAssignAdvisor]
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
    if (!appliedStatus) return requests
    return requests.filter(
      (req) => String(req.status || '').toLowerCase() === appliedStatus.toLowerCase()
    )
  }, [requests, appliedStatus])

  const deploymentColumns = useMemo(
    () => [
      {
        key: 'id',
        label: '#',
        narrow: true,
        render: (row) => <strong>#{row.id}</strong>,
        filterValue: (row) => String(row.id),
        sortValue: (row) => Number(row.id) || 0,
      },
      {
        key: 'requester',
        label: 'Requested by',
        render: (row) => requestRequesterName(row, 'Advisor'),
        filterValue: (row) => requestRequesterName(row, ''),
      },
      {
        key: 'template_name',
        label: 'Template',
        render: (row) => row.template_name || '—',
        filterValue: (row) => row.template_name || '',
      },
      {
        key: 'domain_name',
        label: 'Domain',
        grow: true,
        render: (row) => (
          <span className="inline-flex items-center gap-1.5">
            <FaGlobe className="w-3 h-3 text-gray-400 shrink-0" aria-hidden="true" />
            {row.domain_name || row.domain || '—'}
          </span>
        ),
        filterValue: (row) => row.domain_name || row.domain || '',
      },
      {
        key: 'status',
        label: 'Status',
        fit: true,
        render: (row) => (
          <WcStatusBadge
            status={row.status}
            at={row.deployed_at || row.updated_at || row.created_at}
          />
        ),
        filterValue: (row) =>
          [
            complianceStatusLabel(row.status) || row.status || '',
            formatDateTime(row.deployed_at || row.updated_at || row.created_at, ''),
          ]
            .filter(Boolean)
            .join(' '),
        truncate: false,
      },
      {
        key: 'created_at',
        label: 'Created',
        date: true,
        render: (row) => <DataGridDate value={row.created_at} />,
        filterValue: (row) => formatDateTime(row.created_at, ''),
        sortValue: (row) => (row.created_at ? new Date(row.created_at).getTime() : 0),
        truncate: false,
      },
    ],
    [complianceStatusLabel]
  )

  const openCreateTemplateModal = () => {
    setEditingTemplate(null)
    setTemplateName('')
    setTemplateSlug('')
    setTemplateDesc('')
    setTemplatePreviewUrl('')
    setRegeneratePreview(false)
    setTemplateIsActive(true)
    setTemplateColorSchemes([])
    setTemplateAvailablePages([])
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
    setTemplateColorSchemes(normalizeColorSchemes(tpl.color_schemes))
    setTemplateAvailablePages(normalizeAvailablePages(tpl.available_pages))
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
        color_schemes: normalizeColorSchemes(templateColorSchemes),
        available_pages: normalizeAvailablePages(templateAvailablePages),
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

  const fillBrandingFromRequest = (req) => {
    setLogoUrl(req?.logo_url || '')
    setWhiteLogoUrl(req?.white_logo_url || '')
    setFaviconUrl(req?.favicon_url || '')
    setLogoPreview('')
    setWhiteLogoPreview('')
    setFaviconPreview('')
    setPrimaryColor(req?.primary_color || '#0B1B3D')
    setSecondaryColor(req?.secondary_color || '#C8102E')
  }

  const uploadBrandingAsset = async (file, kind) => {
    if (!file) return
    const setters = {
      logo: { setUploading: setUploadingLogo, setUrl: setLogoUrl, setPreview: setLogoPreview },
      white_logo: { setUploading: setUploadingWhiteLogo, setUrl: setWhiteLogoUrl, setPreview: setWhiteLogoPreview },
      favicon: { setUploading: setUploadingFavicon, setUrl: setFaviconUrl, setPreview: setFaviconPreview },
    }
    const active = setters[kind] || setters.logo
    active.setUploading(true)
    setError('')
    active.setPreview(URL.createObjectURL(file))
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('upload-image', formData)
      const uploadedUrl = storedUploadPath(res.data)
      if (!uploadedUrl) throw new Error('Upload succeeded but no path was returned.')
      active.setUrl(uploadedUrl)
    } catch (err) {
      active.setPreview('')
      active.setUrl('')
      setError(err.response?.data?.message || err.message || `Failed to upload ${kind.replace('_', ' ')}.`)
    } finally {
      active.setUploading(false)
    }
  }

  const brandingPayload = () => ({
    logo_url: logoUrl.trim() || null,
    white_logo_url: whiteLogoUrl.trim() || null,
    favicon_url: faviconUrl.trim() || null,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
  })

  const openDeployModal = (req) => {
    setBrandingOnlyRequest(null)
    setDetailsRequest(null)
    setSelectedRequest(req)
    setShowDeployRequestDetails(true)
    setCpanelDomain(resolveAdvisorSiteUrl(req))
    setCpanelDbHost(req.cpanel_db_host || 'localhost')
    setCpanelDbName(req.cpanel_db_name || '')
    setCpanelDbUser(req.cpanel_db_user || '')
    setCpanelDbPass(req.cpanel_db_pass || '')
    setCpanelApiKey(req.cpanel_api_key || '')
    fillBrandingFromRequest(req)
  }

  const openBrandingModal = (req) => {
    setSelectedRequest(null)
    setBrandingOnlyRequest(req)
    fillBrandingFromRequest(req)
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
        ...brandingPayload(),
      })
      setMessage(
        selectedRequest.status === 'deployed'
          ? `Deployment settings and branding updated for ${cpanelDomain}.`
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

  const handleBrandingSubmit = async (e) => {
    e.preventDefault()
    if (!brandingOnlyRequest) return
    setIsSavingBranding(true)
    setMessage('')
    setError('')
    try {
      const res = await api.put(`/template-requests/${brandingOnlyRequest.id}/branding`, brandingPayload())
      setMessage(res.data?.message || 'Branding updated successfully.')
      setBrandingOnlyRequest(null)
      fetchData(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update branding.')
    } finally {
      setIsSavingBranding(false)
    }
  }

  const brandingFields = (
    <div className="space-y-4 rounded-xl border border-gray-100 bg-slate-50/80 p-4">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Site branding</p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          Logo, white logo, favicon, and colour scheme for this advisor site.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BrandingUploadField
          id="wc-template-branding-logo"
          label="Site Logo"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
          hint="Used on light backgrounds."
          value={logoUrl}
          previewUrl={logoPreview}
          uploading={uploadingLogo}
          onUpload={(file) => uploadBrandingAsset(file, 'logo')}
          onClear={() => { setLogoUrl(''); setLogoPreview('') }}
        />
        <BrandingUploadField
          id="wc-template-branding-white-logo"
          label="White Logo"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
          hint="Used on dark backgrounds (nav, footer)."
          value={whiteLogoUrl}
          previewUrl={whiteLogoPreview}
          uploading={uploadingWhiteLogo}
          onUpload={(file) => uploadBrandingAsset(file, 'white_logo')}
          onClear={() => { setWhiteLogoUrl(''); setWhiteLogoPreview('') }}
          darkPreview
        />
        <BrandingUploadField
          id="wc-template-branding-favicon"
          label="Favicon"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml,image/x-icon,.ico"
          hint="Browser tab icon."
          value={faviconUrl}
          previewUrl={faviconPreview}
          uploading={uploadingFavicon}
          onUpload={(file) => uploadBrandingAsset(file, 'favicon')}
          onClear={() => { setFaviconUrl(''); setFaviconPreview('') }}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={fieldLabelClass}>Primary Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#0B1B3D'}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="wc-field-color"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="wc-field-input wc-field-input--mono"
            />
          </div>
        </div>
        <div>
          <label className={fieldLabelClass}>Secondary Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9A-Fa-f]{6}$/.test(secondaryColor) ? secondaryColor : '#C8102E'}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="wc-field-color"
            />
            <input
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="wc-field-input wc-field-input--mono"
            />
          </div>
        </div>
      </div>
    </div>
  )

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
        You do not have template or deployment management capabilities for Website Template Library.
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
        <div className="alert success">{message}</div>
      )}
      {error && (
        <div className="alert">{error}</div>
      )}

      <div className="library-tabs" role="tablist" aria-label="Site operations">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`library-tabs__btn${activeTab === tab.id ? ' is-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'templates' && canManageTemplates ? (
        <div className="wc-app">
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
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
                      className="wc-field-input"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchData(true)}
                    className="wc-btn wc-btn--soft text-xs"
                  >
                    <FaSync className="w-3 h-3" />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={openCreateTemplateModal}
                    className="wc-btn wc-btn--primary text-xs"
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
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 flex-1">
                            {truncateRichText(tpl.description, 120) || 'No description.'}
                          </p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {Array.isArray(tpl.color_schemes) && tpl.color_schemes.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <FaPalette className="w-3 h-3 text-gray-400 shrink-0" aria-hidden="true" />
                                {tpl.color_schemes.slice(0, 5).map((scheme, i) => (
                                  <span key={`swatch-${tpl.id}-${i}`} className="inline-flex items-center gap-0.5" title={scheme.name || `Scheme ${i + 1}`}>
                                    <span
                                      className="w-3.5 h-3.5 rounded-full border border-white shadow-sm ring-1 ring-gray-200"
                                      style={{ backgroundColor: scheme.primary || '#0B1B3D' }}
                                    />
                                    <span
                                      className="w-3.5 h-3.5 rounded-full border border-white shadow-sm ring-1 ring-gray-200"
                                      style={{ backgroundColor: scheme.secondary || '#C8102E' }}
                                    />
                                  </span>
                                ))}
                                {tpl.color_schemes.length > 5 && (
                                  <span className="text-[10px] font-bold text-gray-400">+{tpl.color_schemes.length - 5}</span>
                                )}
                              </div>
                            )}
                            {Array.isArray(tpl.available_pages) && tpl.available_pages.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500">
                                <FaFileAlt className="w-3 h-3 text-gray-400" aria-hidden="true" />
                                {tpl.available_pages.length} page{tpl.available_pages.length === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => openEditTemplateModal(tpl)}
                              className="wc-btn wc-btn--soft flex-1 text-xs"
                            >
                              <FaEdit className="w-3 h-3" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(tpl)}
                              className="wc-btn text-xs"
                              style={{ background: '#fff1f2', color: '#e11d48', borderColor: '#fecdd3' }}
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
          )}
        </div>
      ) : null}

      {activeTab === 'deployments' && canViewDeployments ? (
        <div>
          <div className="mb-4">
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Deployment hub</h2>
            <p className="muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>
              {canDeployWebsites
                ? 'Deploy templates to cPanel and manage live section visibility.'
                : 'View deployment requests across the hub.'}
            </p>
          </div>

          <form
            className="filters-row"
            onSubmit={(e) => {
              e.preventDefault()
              setAppliedStatus(statusFilter)
            }}
          >
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="pending">{complianceStatusLabel('pending') || 'Pending'}</option>
              <option value="deployed">{complianceStatusLabel('deployed') || 'Deployed'}</option>
              <option value="rejected">{complianceStatusLabel('rejected') || 'Rejected'}</option>
            </select>
            <button className="btn primary" type="submit">
              Filter
            </button>
            {canRequest ? (
              <button
                type="button"
                className="btn primary"
                onClick={() => setShowCreateModal(true)}
              >
                <FaPlus aria-hidden style={{ marginRight: 6 }} />
                Request Deployment
              </button>
            ) : null}
            <button
              type="button"
              className="btn ghost"
              onClick={() => fetchData(true)}
              disabled={loading}
            >
              <FaSync aria-hidden style={{ marginRight: 6 }} />
              Refresh
            </button>
          </form>

          <DataGrid
            columns={deploymentColumns}
            rows={filteredRequests}
            loading={loading}
            pageSize={10}
            emptyMessage="No deployment requests."
            actionsLabel="Actions"
            actionsMinWidth="16rem"
            actions={(row) => {
              const isDeployed = row.status === 'deployed'
              const advisorOwned = isRequestedByAdvisor(row)
              const showAssignAdvisor = canAssignAdvisor && !advisorOwned
              const assignedAdvisor = row.assigned_advisor || row.assignedAdvisor
              const hasAction =
                canViewDeployments ||
                showAssignAdvisor ||
                (isDeployed && canPublishLive) ||
                (isDeployed && canManageSections) ||
                canDeployWebsites
              if (!hasAction) return <span className="muted">—</span>
              const compactBtn = { padding: '0.35rem 0.7rem', fontSize: '0.75rem', minHeight: 0 }
              return (
                <span className="data-grid__actions-inner" style={{ flexWrap: 'wrap', gap: '0.35rem' }}>
                  {canViewDeployments ? (
                    <button
                      type="button"
                      className="btn ghost"
                      style={compactBtn}
                      onClick={() => setDetailsRequest(row)}
                    >
                      Details
                    </button>
                  ) : null}
                  {showAssignAdvisor ? (
                    <button
                      type="button"
                      className="btn ghost"
                      style={compactBtn}
                      onClick={() => setAssignTarget(row)}
                    >
                      {assignedAdvisor ? 'Reassign' : 'Assign'}
                    </button>
                  ) : null}
                  {isDeployed && canPublishLive ? (
                    <Link
                      className="btn primary"
                      style={compactBtn}
                      to={`/my-dashboard/website-compliance/publish/${row.id}`}
                    >
                      Edit
                    </Link>
                  ) : null}
                  {isDeployed && canManageSections ? (
                    <button
                      type="button"
                      className="btn ghost"
                      style={compactBtn}
                      onClick={() => openSectionManageModal(row)}
                    >
                      Sections
                    </button>
                  ) : null}
                  {canDeployWebsites && isDeployed ? (
                    <button
                      type="button"
                      className="btn ghost"
                      style={compactBtn}
                      onClick={() => openBrandingModal(row)}
                    >
                      Branding
                    </button>
                  ) : null}
                  {canDeployWebsites ? (
                    <button
                      type="button"
                      className="btn primary"
                      style={compactBtn}
                      onClick={() => openDeployModal(row)}
                    >
                      {isDeployed ? 'Update' : 'Deploy'}
                    </button>
                  ) : null}
                </span>
              )
            }}
          />
        </div>
      ) : null}

      {showTemplateModal && (
        <ModalShell
          title={editingTemplate ? 'Edit template' : 'Register template'}
          subtitle={
            editingTemplate
              ? 'Update catalog details, colour schemes, and selectable pages for this showcase template.'
              : 'Add a showcase template with colour schemes and pages requesters can choose from.'
          }
          onClose={() => setShowTemplateModal(false)}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSaveTemplate} className="space-y-5">
            <div>
              <label className={fieldLabelClass} htmlFor="wc-tpl-name">
                <RequiredMark>Name</RequiredMark>
              </label>
              <input
                id="wc-tpl-name"
                type="text"
                className="wc-field-input"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template 4 (Complete Financial Centre)"
                required
                autoFocus
              />
            </div>

            <div>
              <label className={fieldLabelClass} htmlFor="wc-tpl-slug">
                Slug <span className="font-normal text-gray-400">(optional — auto from name)</span>
              </label>
              <input
                id="wc-tpl-slug"
                type="text"
                className="wc-field-input wc-field-input--mono"
                value={templateSlug}
                onChange={(e) => setTemplateSlug(e.target.value)}
                placeholder="template4"
              />
            </div>

            <div>
              <label className={fieldLabelClass} htmlFor="wc-tpl-desc">
                Description <span className="font-normal text-gray-400">(shown in catalog)</span>
              </label>
              <RichTextEditor
                id="wc-tpl-desc"
                rows={3}
                value={templateDesc}
                onChange={setTemplateDesc}
                placeholder="Short summary shown in the template catalog"
              />
            </div>

            <div>
              <label className={fieldLabelClass} htmlFor="wc-tpl-preview">
                Preview URL
              </label>
              <input
                id="wc-tpl-preview"
                type="url"
                className="wc-field-input"
                value={templatePreviewUrl}
                onChange={(e) => setTemplatePreviewUrl(e.target.value)}
                placeholder={hubPreviewPlaceholder}
              />
              <p className="text-[11px] text-gray-500 mt-1.5">
                Leave blank to use this hub’s site URL
                {previewBase ? (
                  <>
                    {' '}
                    (<span className="font-mono text-gray-600">{previewBase}</span>)
                  </>
                ) : null}
                .
              </p>
            </div>

            <ColorSchemesEditor
              schemes={templateColorSchemes}
              onChange={setTemplateColorSchemes}
            />

            <AvailablePagesEditor
              pages={templateAvailablePages}
              onChange={setTemplateAvailablePages}
            />

            <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-slate-50 px-3.5 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={templateIsActive}
                onChange={(e) => setTemplateIsActive(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-bold text-gray-800">Active in catalog</span>
                <span className="block text-[11px] text-gray-500 mt-0.5">
                  Inactive templates stay hidden from deployment requests.
                </span>
              </span>
            </label>

            {editingTemplate && (
              <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-slate-50 px-3.5 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={regeneratePreview}
                  onChange={(e) => setRegeneratePreview(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-bold text-gray-800">Regenerate preview thumbnail</span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">
                    Capture a fresh thumbnail from the preview URL when you save.
                  </span>
                </span>
              </label>
            )}

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="wc-btn wc-btn--ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingTemplate}
                className="wc-btn wc-btn--primary"
              >
                {isSavingTemplate
                  ? 'Saving…'
                  : editingTemplate
                    ? 'Save changes'
                    : 'Register template'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {detailsRequest && (
        <ModalShell
          title="Deployment request details"
          subtitle={`${detailsRequest.domain_name || 'Unnamed'} · ${requestRequesterName(detailsRequest)}`}
          onClose={() => setDetailsRequest(null)}
          maxWidth="max-w-3xl"
        >
          <TemplateRequestDetailsView request={detailsRequest} />
          <div className="pt-4 mt-2 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setDetailsRequest(null)}
              className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Close
            </button>
            {canDeployWebsites ? (
              <button
                type="button"
                onClick={() => {
                  const req = detailsRequest
                  setDetailsRequest(null)
                  openDeployModal(req)
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[var(--brand-dark)] text-white rounded-xl hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition shadow-md"
              >
                <FaGlobe className="w-3.5 h-3.5" aria-hidden="true" />
                {detailsRequest.status === 'deployed' ? 'Update deployment' : 'Deploy'}
              </button>
            ) : null}
          </div>
        </ModalShell>
      )}

      {selectedRequest && (
        <ModalShell
          title={selectedRequest.status === 'deployed' ? 'Update deployment' : 'Deploy to cPanel'}
          subtitle={requestRequesterName(selectedRequest)}
          onClose={() => setSelectedRequest(null)}
          maxWidth="max-w-3xl"
        >
          <form onSubmit={handleDeploySubmit} className="space-y-5">
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDeployRequestDetails((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100/80 transition text-left"
              >
                <span>
                  <span className="block text-sm font-extrabold text-[var(--brand-dark)]">
                    Requestor-submitted details
                  </span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">
                    Policies, contact, services, pages, and branding from the original request.
                  </span>
                </span>
                <span className="text-xs font-bold text-[var(--brand-dark)] shrink-0">
                  {showDeployRequestDetails ? 'Hide' : 'Show'}
                </span>
              </button>
              {showDeployRequestDetails ? (
                <div className="p-4 border-t border-gray-100 max-h-[40vh] overflow-y-auto">
                  <TemplateRequestDetailsView request={selectedRequest} />
                </div>
              ) : null}
            </div>
            {brandingFields}
            <div>
              <label className={fieldLabelClass} htmlFor="wc-deploy-domain">
                <RequiredMark>Site URL / domain</RequiredMark>
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
                disabled={isDeploying || uploadingLogo || uploadingWhiteLogo || uploadingFavicon}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[var(--brand-dark)] text-white rounded-xl hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition disabled:opacity-50 shadow-md"
              >
                {isDeploying
                  ? (selectedRequest.status === 'deployed' ? 'Updating…' : 'Deploying…')
                  : (selectedRequest.status === 'deployed' ? 'Save & sync' : 'Deploy')}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {brandingOnlyRequest && (
        <ModalShell
          title="Update site branding"
          subtitle={brandingOnlyRequest.domain_name || brandingOnlyRequest.domain || requestRequesterName(brandingOnlyRequest)}
          onClose={() => setBrandingOnlyRequest(null)}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleBrandingSubmit} className="space-y-5">
            {brandingFields}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setBrandingOnlyRequest(null)}
                className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingBranding || uploadingLogo || uploadingWhiteLogo || uploadingFavicon}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[var(--brand-dark)] text-white rounded-xl hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition disabled:opacity-50 shadow-md"
              >
                <FaPalette className="w-3.5 h-3.5" />
                {isSavingBranding ? 'Saving…' : 'Save branding'}
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

      {showCreateModal && canRequest && (
        <CreateDeploymentModal
          advisors={advisors}
          canAssignAdvisor={canAssignAdvisor}
          onClose={() => setShowCreateModal(false)}
          onCreated={(newRequest) => {
            setShowCreateModal(false)
            setRequests((prev) => [newRequest, ...prev])
            setMessage('Deployment request submitted successfully.')
            setActiveTab('deployments')
          }}
        />
      )}

      {assignTarget && canAssignAdvisor && !isRequestedByAdvisor(assignTarget) && (
        <AssignAdvisorModal
          request={assignTarget}
          advisors={advisors}
          onClose={() => setAssignTarget(null)}
          onAssigned={(updatedRequest) => {
            setAssignTarget(null)
            setRequests((prev) =>
              prev.map((r) => (r.id === updatedRequest.id ? updatedRequest : r))
            )
            const advisorName =
              updatedRequest.assigned_advisor?.name ||
              updatedRequest.assignedAdvisor?.name ||
              'Advisor'
            setMessage(`Assigned this website to ${advisorName}.`)
          }}
        />
      )}
    </div>
  )
}
