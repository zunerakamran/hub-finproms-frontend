import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  FaRocket,
  FaPlus,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaTimes,
  FaSync,
  FaSearch,
  FaGlobe,
  FaUser,
  FaUserCheck,
  FaPalette,
  FaEdit,
  FaChevronDown,
  FaChevronUp,
  FaExclamationTriangle,
  FaServer,
  FaUpload,
  FaImage,
} from 'react-icons/fa'
import api from '../wcApi'
import { useHub } from '../../context/HubContext'
import { websiteComplianceAssetUrl } from '../../api/client'
import { hubDomainPlaceholder, resolveHubPreviewBase } from '../utils/assetUrl'

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Deployment',
    icon: FaClock,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  deployed: {
    label: 'Deployed',
    icon: FaCheckCircle,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    icon: FaTimesCircle,
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status]
  if (!config) return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border bg-gray-50 text-gray-700 border-gray-200">
      {status}
    </span>
  )
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full border ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} aria-hidden="true" />
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  )
}

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
  label,
  accept,
  hint,
  value,
  previewUrl,
  uploading,
  onUpload,
  onClear,
}) {
  const displaySrc = previewUrl || (value ? websiteComplianceAssetUrl(value) : '')

  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-1.5">
        {label} <span className="text-gray-400 font-normal">(optional)</span>
      </label>
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
          {displaySrc ? (
            <img src={displaySrc} alt="" className="w-full h-full object-contain p-1" />
          ) : (
            <FaImage className="w-5 h-5 text-gray-300" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition">
            <FaUpload className="w-3 h-3 text-[var(--brand)]" />
            {uploading ? 'Uploading…' : 'Upload file'}
            <input
              type="file"
              accept={accept}
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onUpload(file)
                e.target.value = ''
              }}
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="block text-[11px] font-semibold text-rose-600 hover:underline"
            >
              Remove
            </button>
          )}
          {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
        </div>
      </div>
    </div>
  )
}

function CreateDeploymentModal({ advisors, onClose, onCreated }) {
  const { branding, hub, actingHub } = useHub()
  const previewBase = resolveHubPreviewBase({ hub, actingHub })
  const domainPlaceholder = hubDomainPlaceholder(previewBase)
  const hubPrimary = branding?.primary_color || branding?.color_scheme?.primary || '#0f5c45'
  const hubSecondary = branding?.secondary_color || branding?.color_scheme?.secondary || '#0a3f30'
  const [templateName, setTemplateName] = useState('template4')
  const [domainName, setDomainName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [faviconPreview, setFaviconPreview] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [primaryColor, setPrimaryColor] = useState(hubPrimary)
  const [secondaryColor, setSecondaryColor] = useState(hubSecondary)
  const [assignedAdvisorId, setAssignedAdvisorId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [serverTemplates, setServerTemplates] = useState([])

  useEffect(() => {
    api.get('/templates').then(res => {
      const list = Array.isArray(res.data) ? res.data : res.data.data || []
      if (list.length) setServerTemplates(list)
    }).catch(() => {})
  }, [])

  const templateOptions = serverTemplates.length
    ? serverTemplates.map(t => ({ value: t.slug || t.name, label: t.name }))
    : TEMPLATES

  const uploadAsset = async (file, kind) => {
    const setUploading = kind === 'logo' ? setUploadingLogo : setUploadingFavicon
    const setUrl = kind === 'logo' ? setLogoUrl : setFaviconUrl
    const setPreview = kind === 'logo' ? setLogoPreview : setFaviconPreview
    setUploading(true)
    setError('')
    setPreview(URL.createObjectURL(file))
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('upload-image', formData)
      const uploadedUrl = storedUploadPath(res.data)
      if (!uploadedUrl) throw new Error('Upload succeeded but no path was returned.')
      setUrl(uploadedUrl)
    } catch (err) {
      setPreview('')
      setUrl('')
      setError(err.response?.data?.message || err.message || `Failed to upload ${kind}.`)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!domainName.trim()) { setError('Domain name is required.'); return }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        template_name: templateName,
        domain_name: domainName.trim(),
        logo_url: logoUrl.trim() || undefined,
        favicon_url: faviconUrl.trim() || undefined,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        request_type: 'advisor_website',
      }
      if (assignedAdvisorId) payload.assigned_advisor_id = Number(assignedAdvisorId)
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
      subtitle="Submit a new advisor showcase site for deployment. Assign an advisor to allow them to edit content."
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
            onChange={e => setTemplateName(e.target.value)}
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
            Domain Name <span className="text-rose-500">*</span>
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
            label="Site Logo"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
            hint="Shown in the site header and footer after deploy."
            value={logoUrl}
            previewUrl={logoPreview}
            uploading={uploadingLogo}
            onUpload={(file) => uploadAsset(file, 'logo')}
            onClear={() => { setLogoUrl(''); setLogoPreview('') }}
          />
          <BrandingUploadField
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

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="w-10 h-10 p-0 border border-gray-200 rounded-xl cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="min-w-0 flex-1 w-auto text-xs p-2.5 border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] outline-none"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Secondary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={e => setSecondaryColor(e.target.value)}
                className="w-10 h-10 p-0 border border-gray-200 rounded-xl cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={e => setSecondaryColor(e.target.value)}
                className="min-w-0 flex-1 w-auto text-xs p-2.5 border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Assign Advisor */}
        <div>
          <label className={labelClass}>
            Assign Advisor for Content Editing <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            value={assignedAdvisorId}
            onChange={e => setAssignedAdvisorId(e.target.value)}
            className={inputClass}
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
            The assigned advisor will be able to edit this site's content sections and submit change requests for approval.
          </p>
        </div>

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
            disabled={submitting || uploadingLogo || uploadingFavicon}
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

function AssignAdvisorModal({ request, advisors, onClose, onAssigned }) {
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
              The assigned advisor will see this site in their <strong>Deployments</strong> tab and can edit its content sections.
              Their edits will go through the standard change request → approver approval workflow.
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

// ─── Single deployment request card ──────────────────────────────────────────

function isRequestedByAdvisor(req) {
  const requester = req.requested_by || req.requestedBy
  if (requester?.role) {
    return requester.role === 'advisor' || requester.role === 'editor'
  }
  // Legacy rows: advisor-created requests set advisor_id to the submitting advisor
  return Boolean(req.advisor_id)
}

function DeploymentCard({ req, advisors, canAssignAdvisor, onAssignAdvisor }) {
  const [expanded, setExpanded] = useState(false)
  const assignedAdvisor = req.assigned_advisor || req.assignedAdvisor
  const requestingAdvisor = req.advisor
  const requester = req.requested_by || req.requestedBy || requestingAdvisor
  const advisorOwned = isRequestedByAdvisor(req)
  const contentAdvisor = assignedAdvisor || (advisorOwned ? requestingAdvisor : null)
  const showAssignAdvisor = canAssignAdvisor && !advisorOwned

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <FaGlobe className="w-4 h-4 text-[var(--brand-dark)] shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-[var(--brand-dark)] truncate">
                {req.domain_name || 'Unnamed Deployment'}
              </h3>
              <StatusBadge status={req.status} />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
              <span className="inline-flex items-center gap-1.5">
                <FaServer className="w-3 h-3 text-gray-400" />
                Template: <strong className="text-gray-700">{req.template_name || '—'}</strong>
              </span>
              {requester && (
                <span className="inline-flex items-center gap-1.5">
                  <FaUser className="w-3 h-3 text-gray-400" />
                  Requested by <strong className="text-gray-700">{requester.name}</strong>
                </span>
              )}
              {contentAdvisor && (
                <span className="inline-flex items-center gap-1.5">
                  <FaUserCheck className="w-3 h-3 text-[var(--brand)]" />
                  {advisorOwned && !assignedAdvisor ? 'Advisor' : 'Assigned'}:{' '}
                  <strong className="text-[var(--brand)]">{contentAdvisor.name}</strong>
                </span>
              )}
              {!contentAdvisor && (
                <span className="inline-flex items-center gap-1.5 text-amber-600">
                  <FaExclamationTriangle className="w-3 h-3" />
                  No advisor assigned
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <FaClock className="w-3 h-3 text-gray-400" />
                {new Date(req.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Assign / Reassign advisor — only for non-advisor-submitted requests */}
            {showAssignAdvisor && (
              <button
                type="button"
                onClick={() => onAssignAdvisor(req)}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-[var(--brand-dark)] text-[var(--brand-dark)] hover:bg-[var(--brand-dark)] hover:text-white transition"
              >
                <FaUserCheck className="w-3 h-3" />
                {assignedAdvisor ? 'Reassign Advisor' : 'Assign Advisor'}
              </button>
            )}

            {/* Expand details */}
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            >
              {expanded ? <FaChevronUp className="w-3 h-3" /> : <FaChevronDown className="w-3 h-3" />}
              {expanded ? 'Hide' : 'Details'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 sm:px-6 py-4 bg-slate-50 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {req.primary_color && (
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded border border-gray-200 shrink-0" style={{ background: req.primary_color }} />
                <div>
                  <p className="text-gray-400 font-semibold">Primary</p>
                  <p className="font-bold text-gray-700 font-mono">{req.primary_color}</p>
                </div>
              </div>
            )}
            {req.secondary_color && (
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded border border-gray-200 shrink-0" style={{ background: req.secondary_color }} />
                <div>
                  <p className="text-gray-400 font-semibold">Secondary</p>
                  <p className="font-bold text-gray-700 font-mono">{req.secondary_color}</p>
                </div>
              </div>
            )}
            {req.request_type && (
              <div>
                <p className="text-gray-400 font-semibold">Type</p>
                <p className="font-bold text-gray-700 capitalize">{req.request_type.replace(/_/g, ' ')}</p>
              </div>
            )}
            {req.firm?.name && (
              <div>
                <p className="text-gray-400 font-semibold">Firm</p>
                <p className="font-bold text-gray-700">{req.firm.name}</p>
              </div>
            )}
            {req.cpanel_domain && (
              <div className="col-span-2 sm:col-span-3">
                <p className="text-gray-400 font-semibold">Live URL</p>
                <a
                  href={req.cpanel_domain.startsWith('http') ? req.cpanel_domain : `https://${req.cpanel_domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[var(--brand)] hover:underline truncate block"
                >
                  {req.cpanel_domain}
                </a>
              </div>
            )}
          </div>

          {req.status === 'deployed' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
              <div className="flex items-start gap-2">
                <FaCheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-bold">Site is deployed and live.</p>
                  {contentAdvisor
                    ? <p className="mt-0.5">
                        <strong>{contentAdvisor.name}</strong> can now edit sections in their Advisor Dashboard.
                        Content changes go through the standard approver review workflow.
                      </p>
                    : <p className="mt-0.5 text-amber-700">No advisor assigned — assign one so they can edit content.</p>
                  }
                </div>
              </div>
            </div>
          )}

          {req.status === 'pending' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <div className="flex items-start gap-2">
                <FaClock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-bold">Awaiting deployment by the platform administrator.</p>
                  {contentAdvisor
                    ? <p className="mt-0.5">
                        <strong>{contentAdvisor.name}</strong>
                        {advisorOwned
                          ? ' submitted this request and will edit content once the site is deployed.'
                          : ' is assigned and will be able to edit content once the site goes live.'}
                      </p>
                    : <p className="mt-0.5">You can assign an advisor now so they are ready once the site goes live.</p>
                  }
                </div>
              </div>
            </div>
          )}

          {req.status === 'rejected' && req.rejection_reason && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
              <div className="flex items-start gap-2">
                <FaTimesCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                <div>
                  <span className="font-bold">Rejection reason: </span>
                  {req.rejection_reason}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function DeploymentRequestPanel() {
  const { can } = useHub()
  const canRequest = can('wc_request_deployments')
  const canViewAll = can('wc_view_all_deployments')
  const canAssignAdvisor = can('wc_assign_change_requests') || can('wc_request_deployments')
  const canAccess = canRequest || canViewAll

  const [requests, setRequests] = useState([])
  const [advisors, setAdvisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)

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

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return requests
    return requests.filter(r =>
      (r.domain_name || '').toLowerCase().includes(q) ||
      (r.template_name || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q) ||
      (r.advisor?.name || '').toLowerCase().includes(q) ||
      (r.assigned_advisor?.name || r.assignedAdvisor?.name || '').toLowerCase().includes(q)
    )
  }, [requests, search])

  const handleCreated = (newRequest) => {
    setShowCreateModal(false)
    setRequests(prev => [newRequest, ...prev])
    setMessage('Deployment request submitted successfully! The platform administrator will review and deploy the site.')
  }

  const handleAssigned = (updatedRequest) => {
    setAssignTarget(null)
    setRequests(prev => prev.map(r => r.id === updatedRequest.id ? updatedRequest : r))
    const advisorName = updatedRequest.assigned_advisor?.name || updatedRequest.assignedAdvisor?.name || 'Advisor'
    setMessage(`${advisorName} assigned successfully. They can now edit this site's content once it is deployed.`)
  }

  return (
    <div>
      {message && <AlertBanner type="success" message={message} onDismiss={() => setMessage('')} />}
      {error && <AlertBanner type="error" message={error} onDismiss={() => setError('')} />}

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">
            {canRequest
              ? `Staff tools: request showcase sites for advisors, assign editors, and track deployment status. Advisors requesting their own site should use Request a site.`
              : 'Browse all deployment requests across the platform.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canRequest && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-[var(--brand)] text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-[color-mix(in_srgb,var(--brand)_85%,black)] transition shadow-sm"
            >
              <FaPlus className="w-3.5 h-3.5" />
              Request Deployment
            </button>
          )}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition shadow-sm disabled:opacity-60"
          >
            <FaSync className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="wc-icon-field flex-1 sm:max-w-md">
          <FaSearch className="wc-icon-field__icon" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by domain, template, advisor, status…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] focus:border-[var(--brand)] transition"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center text-gray-500">
          <div className="w-10 h-10 mx-auto mb-4 rounded-full border-4 border-[var(--brand)] border-t-transparent animate-spin" />
          <p className="text-sm font-semibold">Loading deployment requests…</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <FaRocket className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-[var(--brand-dark)]">
            {search.trim() ? 'No matching deployments' : 'No deployment requests yet'}
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            {search.trim()
              ? 'Try a different search term or clear the filter.'
              : canRequest
                ? 'Submit your first deployment request to get a new advisor showcase site set up.'
                : 'Deployment requests will appear here when submitted.'
            }
          </p>
          {search.trim() && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-4 text-sm font-bold text-[var(--brand)] hover:underline"
            >
              Clear search
            </button>
          )}
          {!search.trim() && canRequest && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 bg-[var(--brand)] text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-[color-mix(in_srgb,var(--brand)_85%,black)] transition shadow-sm"
            >
              <FaPlus className="w-3.5 h-3.5" />
              Request Deployment
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filteredRequests.map(req => (
            <DeploymentCard
              key={req.id}
              req={req}
              advisors={advisors}
              canAssignAdvisor={canAssignAdvisor}
              onAssignAdvisor={setAssignTarget}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && canRequest && (
        <CreateDeploymentModal
          advisors={advisors}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Assign advisor modal */}
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
