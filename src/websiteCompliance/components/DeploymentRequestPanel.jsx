import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  FaPlus,
  FaTimes,
  FaSync,
  FaUserCheck,
  FaExclamationTriangle,
  FaImage,
  FaRocket,
} from 'react-icons/fa'
import api from '../wcApi'
import { useHub } from '../../context/HubContext'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../../components/DataGrid'
import WcStatusBadge from '../../components/WebsiteComplianceUI'
import { websiteComplianceAssetUrl } from '../../api/client'
import { formatDateTime } from '../../utils/dateFormat'
import FileDropzone from '../../components/FileDropzone'
import RequiredMark from '../../components/RequiredMark'
import { hubDomainPlaceholder, resolveHubPreviewBase } from '../utils/assetUrl'
import { ColorSchemePicker, templateColorSchemes } from './ColorSchemeFields'

// ─── Alert banner ─────────────────────────────────────────────────────────────

function AlertBanner({ type, message, onDismiss }) {
  const isSuccess = type === 'success'
  return (
    <div
      className={`${isSuccess
        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
        : 'bg-rose-50 border-rose-500 text-rose-800'
        } border-l-4 p-4 mb-6 rounded-lg shadow-sm flex items-start justify-between gap-3 text-sm font-medium`}
      role="alert"
    >
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onDismiss} className="shrink-0 p-1 rounded hover:bg-black/5 transition" aria-label="Dismiss">
        <FaTimes className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function ModalShell({ title, subtitle, onClose, children, maxWidth = 'max-w-lg' }) {
  return createPortal(
    <div className="wc-app wc-portal-root">
      <div className="fixed inset-0 bg-[color-mix(in_srgb,var(--brand-dark)_60%,transparent)] backdrop-blur-sm flex items-center justify-center p-4 z-[80]">
        <div
          className={`bg-white rounded-2xl ${maxWidth} w-full shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto`}
          role="dialog"
          aria-modal="true"
        >
          <div className="sticky top-0 bg-white z-10 flex items-start justify-between gap-4 p-6 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-[var(--brand-dark)]">{title}</h3>
              {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400 hover:text-gray-700 shrink-0">
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

// ─── Create deployment request modal ─────────────────────────────────────────

const TEMPLATES = [
  { value: 'template4', label: 'Template 4 (Default)' },
  { value: 'template1', label: 'Template 1' },
  { value: 'template2', label: 'Template 2' },
  { value: 'template3', label: 'Template 3' },
]

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
        <div className={`w-14 h-14 rounded-xl border overflow-hidden shrink-0 flex items-center justify-center ${
          darkPreview ? 'border-gray-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
        }`}>
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

export function CreateDeploymentModal({ advisors, canAssignAdvisor = false, onClose, onCreated }) {
  const { branding, hub, actingHub } = useHub()
  const previewBase = resolveHubPreviewBase({ hub, actingHub })
  const domainPlaceholder = hubDomainPlaceholder(previewBase)
  const hubPrimary = branding?.primary_color || branding?.color_scheme?.primary || '#0f5c45'
  const hubSecondary = branding?.secondary_color || branding?.color_scheme?.secondary || '#0a3f30'
  const [templateName, setTemplateName] = useState('template4')
  const [domainName, setDomainName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [whiteLogoUrl, setWhiteLogoUrl] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [whiteLogoPreview, setWhiteLogoPreview] = useState('')
  const [faviconPreview, setFaviconPreview] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingWhiteLogo, setUploadingWhiteLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [primaryColor, setPrimaryColor] = useState(hubPrimary)
  const [secondaryColor, setSecondaryColor] = useState(hubSecondary)
  const [colorSchemeKey, setColorSchemeKey] = useState('custom')
  const [assignedAdvisorId, setAssignedAdvisorId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [serverTemplates, setServerTemplates] = useState([])

  useEffect(() => {
    api.get('/templates').then(res => {
      const list = Array.isArray(res.data) ? res.data : res.data.data || []
      if (list.length) {
        setServerTemplates(list)
        const first = list[0]
        const slug = first.slug || first.name
        if (slug) setTemplateName(slug)
        const schemes = templateColorSchemes(first)
        if (schemes.length) {
          setColorSchemeKey('0')
          setPrimaryColor(schemes[0].primary)
          setSecondaryColor(schemes[0].secondary)
        } else {
          setColorSchemeKey('custom')
          setPrimaryColor(hubPrimary)
          setSecondaryColor(hubSecondary)
        }
      }
    }).catch(() => {})
  }, [hubPrimary, hubSecondary])

  const templateOptions = serverTemplates.length
    ? serverTemplates.map(t => ({ value: t.slug || t.name, label: t.name, template: t }))
    : TEMPLATES.map(t => ({ ...t, template: null }))

  const selectedTemplate =
    serverTemplates.find(t => (t.slug || t.name) === templateName) || null
  const availableSchemes = templateColorSchemes(selectedTemplate)

  const applyTemplateSchemes = (tpl) => {
    const schemes = templateColorSchemes(tpl)
    if (schemes.length) {
      setColorSchemeKey('0')
      setPrimaryColor(schemes[0].primary)
      setSecondaryColor(schemes[0].secondary)
    } else {
      setColorSchemeKey('custom')
      setPrimaryColor(hubPrimary)
      setSecondaryColor(hubSecondary)
    }
  }

  const uploadAsset = async (file, kind) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!domainName.trim()) { setError('Domain name is required.'); return }
    if (canAssignAdvisor && !assignedAdvisorId) {
      setError('Assign an advisor for content editing before submitting.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        template_name: templateName,
        domain_name: domainName.trim(),
        logo_url: logoUrl.trim() || undefined,
        white_logo_url: whiteLogoUrl.trim() || undefined,
        favicon_url: faviconUrl.trim() || undefined,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        request_type: 'advisor_website',
      }
      if (canAssignAdvisor && assignedAdvisorId) {
        payload.assigned_advisor_id = Number(assignedAdvisorId)
      }
      const res = await api.post('/template-requests', payload)
      onCreated(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit deployment request.')
    } finally {
      setSubmitting(false)
    }
  }

  const labelClass = 'block text-xs font-bold text-gray-700 mb-1.5'
  const inputClass = 'w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] focus:border-[var(--brand)] outline-none transition'

  return (
    <ModalShell
      title="Request New Deployment"
      subtitle={
        canAssignAdvisor
          ? 'Submit a showcase site for deployment and assign an advisor who will edit its content after go-live.'
          : 'Submit a new advisor showcase site for deployment.'
      }
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      {error && <AlertBanner type="error" message={error} onDismiss={() => setError('')} />}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Template */}
        <div>
          <label className={labelClass}>Template</label>
          <select
            value={templateName}
            onChange={e => {
              const next = e.target.value
              setTemplateName(next)
              const tpl = serverTemplates.find(t => (t.slug || t.name) === next)
              applyTemplateSchemes(tpl)
            }}
            className={inputClass}
          >
            {templateOptions.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Domain */}
        <div>
          <label className={labelClass}>
            <RequiredMark>Domain Name</RequiredMark>
          </label>
          <input
            type="text"
            value={domainName}
            onChange={e => setDomainName(e.target.value)}
            placeholder={domainPlaceholder}
            required
            className={inputClass}
          />
          <p className="text-[11px] text-gray-500 mt-1">The target domain for this advisor's site.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BrandingUploadField
            id="deployment-branding-logo"
            label="Site Logo"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
            hint="Used on light backgrounds (header bar)."
            value={logoUrl}
            previewUrl={logoPreview}
            uploading={uploadingLogo}
            onUpload={(file) => uploadAsset(file, 'logo')}
            onClear={() => { setLogoUrl(''); setLogoPreview('') }}
          />
          <BrandingUploadField
            id="deployment-branding-white-logo"
            label="White Logo"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
            hint="Used on dark backgrounds (nav bar, footer)."
            value={whiteLogoUrl}
            previewUrl={whiteLogoPreview}
            uploading={uploadingWhiteLogo}
            onUpload={(file) => uploadAsset(file, 'white_logo')}
            onClear={() => { setWhiteLogoUrl(''); setWhiteLogoPreview('') }}
            darkPreview
          />
          <BrandingUploadField
            id="deployment-branding-favicon"
            label="Favicon"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml,image/x-icon,.ico"
            hint="Browser tab icon on the live advisor site."
            value={faviconUrl}
            previewUrl={faviconPreview}
            uploading={uploadingFavicon}
            onUpload={(file) => uploadAsset(file, 'favicon')}
            onClear={() => { setFaviconUrl(''); setFaviconPreview('') }}
          />
        </div>

        <ColorSchemePicker
          schemes={availableSchemes}
          selectionKey={colorSchemeKey}
          onSelectionChange={setColorSchemeKey}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          onPrimaryChange={setPrimaryColor}
          onSecondaryChange={setSecondaryColor}
          labelClass={labelClass}
        />

        {/* Assign Advisor — managers with assign capability only; required */}
        {canAssignAdvisor && (
        <div>
          <label className={labelClass}>
            <RequiredMark>Assign Advisor for Content Editing</RequiredMark>
          </label>
          <select
            value={assignedAdvisorId}
            onChange={e => setAssignedAdvisorId(e.target.value)}
            className={inputClass}
            required
          >
            <option value="">— Select an advisor —</option>
            {advisors.map(a => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.email}){a.firm?.name ? ` — ${a.firm.name}` : ''}
              </option>
            ))}
          </select>
          {advisors.length === 0 && (
            <p className="text-xs text-amber-700 mt-1">No advisor accounts were found. Create an advisor user first.</p>
          )}
          <p className="text-[11px] text-gray-500 mt-1">
            Assigns this website to the advisor for editing (not their own site request). Hub sections are created only after Power Admin deploys the site.
          </p>
        </div>
        )}

        <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || uploadingLogo || uploadingWhiteLogo || uploadingFavicon}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[var(--brand-dark)] text-white rounded-xl hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition disabled:opacity-50 shadow-md"
          >
            <FaRocket className="w-3.5 h-3.5" />
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ─── Assign advisor modal (for existing request) ──────────────────────────────

export function AssignAdvisorModal({ request, advisors, onClose, onAssigned }) {
  const [advisorId, setAdvisorId] = useState(
    String(request.assigned_advisor_id || request.advisor_id || '')
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!advisorId) { setError('Please select an advisor.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post(`/template-requests/${request.id}/assign-advisor`, {
        assigned_advisor_id: Number(advisorId),
      })
      onAssigned(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign advisor.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      title="Assign Advisor for Editing"
      subtitle={`Deployment: ${request.domain_name}`}
      onClose={onClose}
    >
      {error && <AlertBanner type="error" message={error} onDismiss={() => setError('')} />}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Advisor</label>
          <select
            value={advisorId}
            onChange={e => setAdvisorId(e.target.value)}
            className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] focus:border-[var(--brand)] outline-none"
          >
            <option value="">— Select an advisor —</option>
            {advisors.map(a => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.email}){a.firm?.name ? ` — ${a.firm.name}` : ''}
              </option>
            ))}
          </select>
          {advisors.length === 0 && (
            <p className="text-xs text-amber-700 mt-1">No advisor accounts were found. Create an advisor user first.</p>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
          <div className="flex items-start gap-2">
            <FaExclamationTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
            <p>
              This assigns the website to the advisor for editing — it is <strong>not</strong> treated as the advisor&apos;s own website request.
              They will see it marked as assigned in their <strong>Deployments</strong> tab. Edits still go through the standard change request → approver approval workflow.
            </p>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !advisorId}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-[var(--brand-dark)] text-white rounded-xl hover:bg-[color-mix(in_srgb,var(--brand-dark)_85%,black)] transition disabled:opacity-50 shadow-md"
          >
            <FaUserCheck className="w-3.5 h-3.5" />
            {submitting ? 'Assigning…' : 'Assign Advisor'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

export function isRequestedByAdvisor(req) {
  const requester = req.requested_by || req.requestedBy
  if (requester?.role) {
    return requester.role === 'advisor' || requester.role === 'editor'
  }
  // Legacy rows: advisor-created requests set advisor_id to the submitting advisor
  return Boolean(req.advisor_id)
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function DeploymentRequestPanel() {
  const { can, complianceStatusLabel } = useHub()
  const canRequest = can('wc_request_deployments') || can('wc_assign_website_templates')
  const canViewAll = can('wc_view_all_deployments')
  const canAssignAdvisor = can('wc_assign_website_templates')
  const canAccess = canRequest || canViewAll

  const [requests, setRequests] = useState([])
  const [advisors, setAdvisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [appliedStatus, setAppliedStatus] = useState('')

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!canAccess) {
      setLoading(false)
      return
    }
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const reqRes = await api.get('/template-requests')
      setRequests(Array.isArray(reqRes.data) ? reqRes.data : [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load deployment requests.')
      setLoading(false)
      setRefreshing(false)
      return
    }

    if (!canAssignAdvisor) {
      setAdvisors([])
      setLoading(false)
      setRefreshing(false)
      return
    }

    try {
      const usersRes = await api.get('/advisors')
      const users = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data || []
      setAdvisors(users.filter(u => u.role === 'advisor' || u.role === 'editor'))
    } catch {
      try {
        const usersRes = await api.get('/users')
        const users = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data || []
        setAdvisors(users.filter(u => u.role === 'advisor' || u.role === 'editor'))
      } catch {
        setAdvisors([])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [canAccess, canAssignAdvisor])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreated = (newRequest) => {
    setShowCreateModal(false)
    setRequests(prev => [newRequest, ...prev])
    setMessage('Deployment request submitted successfully! The platform administrator will review and deploy the site.')
  }

  const handleAssigned = (updatedRequest) => {
    setAssignTarget(null)
    setRequests(prev => prev.map(r => r.id === updatedRequest.id ? updatedRequest : r))
    const advisorName = updatedRequest.assigned_advisor?.name || updatedRequest.assignedAdvisor?.name || 'Advisor'
    setMessage(`Assigned this website to ${advisorName}. They can edit its content once it is deployed (this is not their own site).`)
  }

  const filteredRequests = useMemo(() => {
    if (!appliedStatus) return requests
    return requests.filter((r) => String(r.status || '').toLowerCase() === appliedStatus.toLowerCase())
  }, [requests, appliedStatus])

  const columns = useMemo(() => [
    {
      key: 'id',
      label: '#',
      narrow: true,
      render: (row) => <strong>#{row.id}</strong>,
      filterValue: (row) => String(row.id),
      sortValue: (row) => Number(row.id) || 0,
    },
    {
      key: 'domain_name',
      label: 'Domain',
      grow: true,
      render: (row) => row.domain_name || 'Unnamed Deployment',
      filterValue: (row) => row.domain_name || '',
    },
    {
      key: 'template_name',
      label: 'Template',
      render: (row) => row.template_name || '—',
      filterValue: (row) => row.template_name || '',
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
      key: 'requester',
      label: 'Requested by',
      render: (row) => {
        const requester = row.requested_by || row.requestedBy || row.advisor
        return requester?.name || '—'
      },
      filterValue: (row) => {
        const requester = row.requested_by || row.requestedBy || row.advisor
        return requester?.name || ''
      },
    },
    {
      key: 'advisor',
      label: 'Content advisor',
      render: (row) => {
        const assignedAdvisor = row.assigned_advisor || row.assignedAdvisor
        const advisorOwned = isRequestedByAdvisor(row)
        const contentAdvisor = assignedAdvisor || (advisorOwned ? row.advisor : null)
        if (contentAdvisor) return contentAdvisor.name
        return <span className="muted">Unassigned</span>
      },
      filterValue: (row) => {
        const assignedAdvisor = row.assigned_advisor || row.assignedAdvisor
        const advisorOwned = isRequestedByAdvisor(row)
        const contentAdvisor = assignedAdvisor || (advisorOwned ? row.advisor : null)
        return contentAdvisor?.name || 'Unassigned'
      },
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
            href={row.cpanel_domain.startsWith('http') ? row.cpanel_domain : `https://${row.cpanel_domain}`}
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
  ], [complianceStatusLabel])

  return (
    <div>
      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

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
          disabled={refreshing || loading}
        >
          <FaSync aria-hidden style={{ marginRight: 6 }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </form>

      <DataGrid
        columns={columns}
        rows={filteredRequests}
        loading={loading}
        pageSize={10}
        emptyMessage={
          canRequest
            ? 'No deployment requests yet. Submit a request to get a showcase site set up.'
            : 'No deployment requests in this queue.'
        }
        actionsLabel="Actions"
        actions={(row) => {
          const advisorOwned = isRequestedByAdvisor(row)
          const showAssignAdvisor = canAssignAdvisor && !advisorOwned
          const assignedAdvisor = row.assigned_advisor || row.assignedAdvisor
          if (!showAssignAdvisor) return <span className="muted">—</span>
          return (
            <DataGridIconBtn
              icon={FaUserCheck}
              label={assignedAdvisor ? 'Reassign advisor' : 'Assign advisor'}
              variant="primary"
              onClick={() => setAssignTarget(row)}
            />
          )
        }}
      />

      {showCreateModal && canRequest && (
        <CreateDeploymentModal
          advisors={advisors}
          canAssignAdvisor={canAssignAdvisor}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {assignTarget && canAssignAdvisor && !isRequestedByAdvisor(assignTarget) && (
        <AssignAdvisorModal
          request={assignTarget}
          advisors={advisors}
          onClose={() => setAssignTarget(null)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  )
}
