import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  FaCheckCircle,
  FaCog,
  FaEdit,
  FaEyeSlash,
  FaGlobe,
  FaImage,
  FaLayerGroup,
  FaPalette,
  FaPen,
  FaPlus,
  FaRocket,
  FaSync,
  FaTimes,
  FaTrash,
  FaUpload,
} from 'react-icons/fa'
import { useHub } from '../../context/HubContext'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../../components/DataGrid'
import FileDropzone from '../../components/FileDropzone'
import RequiredMark from '../../components/RequiredMark'
import RichTextEditor from '../../components/RichTextEditor'
import WcStatusBadge from '../../components/WebsiteComplianceUI'
import { websiteComplianceAssetUrl } from '../../api/client'
import { formatDateTime } from '../../utils/dateFormat'
import { truncateRichText } from '../../utils/richText'
import { defaultTemplatePreviewUrl, resolveHubPreviewBase } from '../utils/assetUrl'
import { sectionDisplayName } from '../utils/sectionDisplay'
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
const fieldInputClass =
  'w-full text-sm p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] focus:border-[var(--brand)] transition'

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
  const [statusFilter, setStatusFilter] = useState('')
  const [appliedStatus, setAppliedStatus] = useState('')

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
    },
    [canViewDeployments, canManageTemplates]
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredRequests = useMemo(() => {
    if (!appliedStatus) return requests
    return requests.filter((r) => String(r.status || '').toLowerCase() === appliedStatus.toLowerCase())
  }, [requests, appliedStatus])

  const templateColumns = useMemo(
    () => [
      {
        key: 'id',
        label: '#',
        narrow: true,
        render: (row) => <strong>{row.id}</strong>,
        filterValue: (row) => String(row.id),
        sortValue: (row) => Number(row.id) || 0,
      },
      {
        key: 'name',
        label: 'Name',
        grow: true,
        render: (row) => row.name || '—',
        filterValue: (row) => row.name || '',
      },
      {
        key: 'slug',
        label: 'Slug',
        render: (row) => <span className="muted">{row.slug || '—'}</span>,
        filterValue: (row) => row.slug || '',
      },
      {
        key: 'status',
        label: 'Status',
        fit: true,
        render: (row) =>
          row.is_active ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
              <FaCheckCircle aria-hidden /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500">
              <FaEyeSlash aria-hidden /> Disabled
            </span>
          ),
        filterValue: (row) => (row.is_active ? 'Active' : 'Disabled'),
        truncate: false,
      },
      {
        key: 'description',
        label: 'Description',
        render: (row) => truncateRichText(row.description, 80) || '—',
        filterValue: (row) => truncateRichText(row.description, 200) || '',
      },
      {
        key: 'preview',
        label: 'Preview',
        filterable: false,
        sortable: false,
        render: (row) =>
          row.preview_url ? (
            <a
              href={row.preview_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              Open
            </a>
          ) : (
            '—'
          ),
        truncate: false,
      },
    ],
    []
  )

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
        render: (row) => requestRequesterName(row, '—'),
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
            <FaGlobe aria-hidden className="text-gray-400" style={{ width: 12, height: 12 }} />
            {row.domain_name || row.domain || '—'}
          </span>
        ),
        filterValue: (row) => row.domain_name || row.domain || '',
        truncate: false,
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
          [row.status, formatDateTime(row.deployed_at || row.updated_at || row.created_at, '')]
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
      {
        key: 'live_url',
        label: 'Live URL',
        render: (row) =>
          row.cpanel_domain ? (
            <a
              href={
                row.cpanel_domain.startsWith('http')
                  ? row.cpanel_domain
                  : `https://${row.cpanel_domain}`
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {row.cpanel_domain}
            </a>
          ) : (
            '—'
          ),
        filterValue: (row) => row.cpanel_domain || '',
        truncate: false,
      },
    ],
    []
  )

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
    setSelectedRequest(req)
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
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-10 h-10 p-0 border border-gray-200 rounded-xl cursor-pointer shrink-0"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="min-w-0 flex-1 w-auto text-xs p-2.5 border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] outline-none"
            />
          </div>
        </div>
        <div>
          <label className={fieldLabelClass}>Secondary Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="w-10 h-10 p-0 border border-gray-200 rounded-xl cursor-pointer shrink-0"
            />
            <input
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="min-w-0 flex-1 w-auto text-xs p-2.5 border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] outline-none"
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
    <div>
      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <form
        className="filters-row"
        onSubmit={(e) => {
          e.preventDefault()
          if (activeTab === 'deployments') setAppliedStatus(statusFilter)
        }}
      >
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === tab.id
                  ? 'bg-[var(--brand-dark)] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'deployments' && canViewDeployments ? (
          <>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="deployed">Deployed</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="btn primary" type="submit">
              Filter
            </button>
          </>
        ) : null}

        {activeTab === 'templates' && canManageTemplates ? (
          <button type="button" className="btn primary" onClick={openCreateTemplateModal}>
            <FaPlus aria-hidden style={{ marginRight: 6 }} />
            Register template
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

      {activeTab === 'templates' && canManageTemplates ? (
        <DataGrid
          columns={templateColumns}
          rows={templates}
          loading={loading}
          pageSize={10}
          emptyMessage="No templates yet. Register a template to make it available for deployment requests."
          actionsLabel="Actions"
          actions={(row) => (
            <>
              <DataGridIconBtn
                icon={FaEdit}
                label="Edit template"
                variant="primary"
                onClick={() => openEditTemplateModal(row)}
              />
              <DataGridIconBtn
                icon={FaTrash}
                label="Delete template"
                onClick={() => handleDeleteTemplate(row)}
              />
            </>
          )}
        />
      ) : null}

      {activeTab === 'deployments' && canViewDeployments ? (
        <DataGrid
          columns={deploymentColumns}
          rows={filteredRequests}
          loading={loading}
          pageSize={10}
          emptyMessage={
            canDeployWebsites
              ? 'No deployment requests yet.'
              : 'No deployment requests in this queue.'
          }
          actionsLabel="Actions"
          actions={(row) => (
            <>
              {row.status === 'deployed' && canPublishLive ? (
                <DataGridIconBtn
                  icon={FaPen}
                  label="Edit & publish"
                  variant="primary"
                  as={Link}
                  to={`/my-dashboard/website-compliance/publish/${row.id}`}
                />
              ) : null}
              {row.status === 'deployed' && canManageSections ? (
                <DataGridIconBtn
                  icon={FaLayerGroup}
                  label="Manage sections"
                  onClick={() => openSectionManageModal(row)}
                />
              ) : null}
              {canDeployWebsites && row.status === 'deployed' ? (
                <DataGridIconBtn
                  icon={FaPalette}
                  label="Update branding"
                  onClick={() => openBrandingModal(row)}
                />
              ) : null}
              {canDeployWebsites ? (
                <DataGridIconBtn
                  icon={row.status === 'deployed' ? FaCog : FaRocket}
                  label={row.status === 'deployed' ? 'Update deployment' : 'Deploy to cPanel'}
                  variant="primary"
                  onClick={() => openDeployModal(row)}
                />
              ) : null}
              {!canDeployWebsites &&
              !(row.status === 'deployed' && (canPublishLive || canManageSections)) ? (
                <span className="muted">—</span>
              ) : null}
            </>
          )}
        />
      ) : null}

      {showTemplateModal && (
        <ModalShell
          title={editingTemplate ? 'Edit template' : 'Register template'}
          subtitle={
            editingTemplate
              ? 'Update catalog details for this showcase template.'
              : "Add a template to this hub's Website Template Library catalog."
          }
          onClose={() => setShowTemplateModal(false)}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveTemplate} className="space-y-5">
            <div>
              <label className={fieldLabelClass} htmlFor="wc-tpl-name">
                <RequiredMark>Name</RequiredMark>
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
              <RichTextEditor
                id="wc-tpl-desc"
                className={fieldInputClass}
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
        <ModalShell
          title={selectedRequest.status === 'deployed' ? 'Update deployment' : 'Deploy to cPanel'}
          subtitle={requestRequesterName(selectedRequest)}
          onClose={() => setSelectedRequest(null)}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleDeploySubmit} className="space-y-5">
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
    </div>
  )
}
