import { useMemo, useState } from 'react'
import {
  FaBriefcase,
  FaEnvelope,
  FaFileAlt,
  FaImage,
  FaPlus,
  FaTrash,
  FaFileContract,
  FaGlobe,
  FaPalette,
} from 'react-icons/fa'
import FileDropzone from '../../components/FileDropzone'
import FileNameLabel from '../../components/FileNameLabel'
import { websiteComplianceAssetUrl } from '../../api/client'
import api from '../wcApi'

const fieldLabelClass = 'block text-xs font-bold text-gray-700 mb-1.5'

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150)
}

export function emptyAvailablePage(index = 0) {
  return {
    name: `Page ${index + 1}`,
    slug: `page-${index + 1}`,
    description: '',
  }
}

export function normalizeAvailablePages(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const pages = []
  raw.forEach((row, index) => {
    if (!row || typeof row !== 'object') return
    const name = String(row.name || '').trim() || `Page ${index + 1}`
    let slug = slugify(row.slug || name) || `page-${index + 1}`
    if (seen.has(slug)) return
    seen.add(slug)
    pages.push({
      name,
      slug,
      description: String(row.description || '').trim(),
    })
  })
  return pages
}

export function templateAvailablePages(template) {
  return normalizeAvailablePages(template?.available_pages)
}

export function emptyService() {
  return { name: '', attachment_url: '', attachment_name: '' }
}

export function emptyImage() {
  return { url: '', label: '', preview: '' }
}

export function emptyPolicy() {
  return { name: '', attachment_url: '', attachment_name: '' }
}

export function emptyContactDetails() {
  return { phone: '', email: '', address: '', website: '' }
}

export function emptyRequestContentState() {
  return {
    services: [],
    images: [],
    contactDetails: emptyContactDetails(),
    policies: [],
    selectedPages: [],
    pageContents: {},
  }
}

const DOCUMENT_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function storedUploadPath(data) {
  const path = data?.relative_url || data?.url || ''
  if (!path || /^data:/i.test(path)) return ''
  const name = String(path).split('/').pop().split('?')[0]
  if (!name) return ''
  if (
    path.includes('/website-compliance/uploaded-images') ||
    path.includes('/uploaded-images') ||
    path.includes('/uploads/')
  ) {
    return `/website-compliance/uploaded-images/${name}`
  }
  return path.startsWith('/') ? path : `/website-compliance/uploaded-images/${name}`
}

/**
 * Build API payload fields from request-content UI state.
 */
export function buildRequestContentPayload({
  services = [],
  images = [],
  contactDetails = emptyContactDetails(),
  policies = [],
  selectedPages = [],
  pageContents = {},
} = {}) {
  const cleanedServices = (Array.isArray(services) ? services : [])
    .map((row) => ({
      name: String(row?.name || '').trim(),
      attachment_url: String(row?.attachment_url || '').trim(),
      attachment_name: String(row?.attachment_name || '').trim(),
    }))
    .filter((row) => row.name || row.attachment_url)

  const cleanedImages = (Array.isArray(images) ? images : [])
    .map((row) => ({
      url: String(row?.url || '').trim(),
      label: String(row?.label || '').trim(),
    }))
    .filter((row) => row.url)

  const contact = {
    phone: String(contactDetails?.phone || '').trim(),
    email: String(contactDetails?.email || '').trim(),
    address: String(contactDetails?.address || '').trim(),
    website: String(contactDetails?.website || '').trim(),
  }
  const hasContact = Object.values(contact).some(Boolean)

  const cleanedPolicies = (Array.isArray(policies) ? policies : [])
    .map((row) => ({
      name: String(row?.name || '').trim(),
      attachment_url: String(row?.attachment_url || '').trim(),
      attachment_name: String(row?.attachment_name || '').trim(),
    }))
    .filter((row) => row.name || row.attachment_url)

  const pages = (Array.isArray(selectedPages) ? selectedPages : [])
    .map((slug) => slugify(slug))
    .filter(Boolean)

  const contents = {}
  pages.forEach((slug) => {
    const entry = pageContents?.[slug]
    if (!entry || typeof entry !== 'object') return
    const url = String(entry.url || entry.attachment_url || '').trim()
    const name = String(entry.name || entry.attachment_name || '').trim()
    if (!url) return
    contents[slug] = { url, name }
  })

  return {
    services: cleanedServices,
    images: cleanedImages,
    contact_details: hasContact ? contact : undefined,
    policies: cleanedPolicies,
    selected_pages: pages,
    page_contents: Object.keys(contents).length ? contents : undefined,
  }
}

function SectionCard({ icon: Icon, title, hint, action, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3.5 bg-slate-50 border-b border-gray-100">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--brand)_12%,white)] text-[var(--brand-dark)] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[var(--brand-dark)]">{title}</p>
            {hint ? (
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{hint}</p>
            ) : null}
          </div>
        </div>
        {action || null}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  )
}

function DocumentAttachmentField({
  id,
  label,
  labelClass = fieldLabelClass,
  url,
  name,
  uploading,
  onFile,
  onClear,
}) {
  return (
    <div className="space-y-2">
      <label className={labelClass}>{label}</label>
      {url ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
          <FileNameLabel
            name={name}
            href={websiteComplianceAssetUrl(url)}
            className="min-w-0 text-xs font-semibold text-[var(--brand-dark)]"
            iconClassName="w-3.5 h-3.5 shrink-0 text-gray-400"
            fallback="Attached document"
          />
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition shrink-0"
          >
            <FaTrash className="w-3 h-3" aria-hidden="true" />
            Remove
          </button>
        </div>
      ) : (
        <FileDropzone
          id={id}
          label="Attach document"
          accept={DOCUMENT_ACCEPT}
          hint="PDF, Word, Excel, PowerPoint, TXT, RTF, ODT, or CSV (max 10 MB)"
          disabled={uploading}
          files={[]}
          onChange={(next) => {
            const file = next[0] || null
            if (file) onFile(file)
          }}
        />
      )}
    </div>
  )
}

/**
 * Power Admin: define which pages requesters can pick for this template.
 */
export function AvailablePagesEditor({ pages, onChange, maxPages = 30 }) {
  const list = Array.isArray(pages) ? pages : []

  const updateAt = (index, patch) => {
    onChange(
      list.map((row, i) => {
        if (i !== index) return row
        const next = { ...row, ...patch }
        if (Object.prototype.hasOwnProperty.call(patch, 'name') && !String(row.slug || '').trim()) {
          next.slug = slugify(patch.name)
        }
        if (Object.prototype.hasOwnProperty.call(patch, 'slug')) {
          next.slug = slugify(patch.slug)
        }
        return next
      })
    )
  }

  const removeAt = (index) => onChange(list.filter((_, i) => i !== index))

  const addPage = () => {
    if (list.length >= maxPages) return
    onChange([...list, emptyAvailablePage(list.length)])
  }

  return (
    <SectionCard
      icon={FaFileAlt}
      title="Available pages"
      hint="Pages offered on this template. Requesters select which ones to include and attach a content document."
      action={
        <button
          type="button"
          onClick={addPage}
          disabled={list.length >= maxPages}
          className="wc-btn wc-btn--primary shrink-0 text-xs"
        >
          <FaPlus className="w-3 h-3" aria-hidden="true" />
          Add
        </button>
      }
    >
      {list.length === 0 ? (
        <button
          type="button"
          onClick={addPage}
          className="w-full rounded-xl border-2 border-dashed border-gray-200 bg-slate-50/60 hover:border-[color-mix(in_srgb,var(--brand)_35%,transparent)] transition px-4 py-8 text-center"
        >
          <FaFileAlt className="w-6 h-6 text-slate-300 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm font-bold text-gray-600">No pages defined yet</p>
          <p className="text-[11px] text-gray-500 mt-1 max-w-xs mx-auto">
            Add pages such as About, Services, or Contact so requesters can choose them.
          </p>
          <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-[var(--brand-dark)]">
            <FaPlus className="w-3 h-3" aria-hidden="true" />
            Add first page
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          {list.map((page, index) => (
            <div
              key={`avail-page-${index}`}
              className="rounded-xl border border-gray-200 bg-slate-50/40 p-3.5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white border border-gray-200 text-[10px] font-extrabold text-gray-500 shrink-0">
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition shrink-0"
                >
                  <FaTrash className="w-3 h-3" aria-hidden="true" />
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={fieldLabelClass}>Page name</label>
                  <input
                    type="text"
                    value={page.name}
                    onChange={(e) => updateAt(index, { name: e.target.value })}
                    placeholder="e.g. About Us"
                    className="wc-field-input"
                    maxLength={150}
                  />
                </div>
                <div>
                  <label className={fieldLabelClass}>Slug</label>
                  <input
                    type="text"
                    value={page.slug}
                    onChange={(e) => updateAt(index, { slug: e.target.value })}
                    placeholder="about-us"
                    className="wc-field-input wc-field-input--mono"
                    maxLength={150}
                  />
                </div>
              </div>
              <div>
                <label className={fieldLabelClass}>
                  Description <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={page.description}
                  onChange={(e) => updateAt(index, { description: e.target.value })}
                  placeholder="Short hint shown when requesting this template"
                  className="wc-field-input"
                  maxLength={1000}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

/**
 * Request form extras: services, images, contact, policies, pages + content.
 */
export function TemplateRequestContentFields({
  availablePages = [],
  services,
  onServicesChange,
  images,
  onImagesChange,
  contactDetails,
  onContactDetailsChange,
  policies,
  onPoliciesChange,
  selectedPages,
  onSelectedPagesChange,
  pageContents,
  onPageContentsChange,
  labelClass = fieldLabelClass,
}) {
  const pages = useMemo(() => normalizeAvailablePages(availablePages), [availablePages])
  const selected = Array.isArray(selectedPages) ? selectedPages : []
  const [uploadingIndex, setUploadingIndex] = useState(null)
  const [uploadingDocKey, setUploadingDocKey] = useState(null)
  const [uploadError, setUploadError] = useState('')

  const togglePage = (slug) => {
    if (selected.includes(slug)) {
      onSelectedPagesChange(selected.filter((s) => s !== slug))
      return
    }
    onSelectedPagesChange([...selected, slug])
  }

  const updateService = (index, patch) => {
    onServicesChange(services.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const updatePolicy = (index, patch) => {
    onPoliciesChange(policies.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const updateImage = (index, patch) => {
    onImagesChange(images.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const uploadDocument = async (file) => {
    const formData = new FormData()
    formData.append('document', file)
    const res = await api.post('upload-document', formData)
    const uploadedUrl = storedUploadPath(res.data)
    if (!uploadedUrl) throw new Error('Upload succeeded but no path was returned.')
    return {
      url: uploadedUrl,
      name: String(res.data?.original_name || file.name || '').trim(),
    }
  }

  const uploadServiceDoc = async (index, file) => {
    if (!file) return
    setUploadingDocKey(`service-${index}`)
    setUploadError('')
    try {
      const doc = await uploadDocument(file)
      updateService(index, { attachment_url: doc.url, attachment_name: doc.name })
    } catch (err) {
      updateService(index, { attachment_url: '', attachment_name: '' })
      setUploadError(err.response?.data?.message || err.message || 'Failed to upload document.')
    } finally {
      setUploadingDocKey(null)
    }
  }

  const uploadPolicyDoc = async (index, file) => {
    if (!file) return
    setUploadingDocKey(`policy-${index}`)
    setUploadError('')
    try {
      const doc = await uploadDocument(file)
      updatePolicy(index, { attachment_url: doc.url, attachment_name: doc.name })
    } catch (err) {
      updatePolicy(index, { attachment_url: '', attachment_name: '' })
      setUploadError(err.response?.data?.message || err.message || 'Failed to upload document.')
    } finally {
      setUploadingDocKey(null)
    }
  }

  const uploadPageDoc = async (slug, file) => {
    if (!file) return
    setUploadingDocKey(`page-${slug}`)
    setUploadError('')
    try {
      const doc = await uploadDocument(file)
      onPageContentsChange({
        ...(pageContents || {}),
        [slug]: { url: doc.url, name: doc.name },
      })
    } catch (err) {
      onPageContentsChange({
        ...(pageContents || {}),
        [slug]: { url: '', name: '' },
      })
      setUploadError(err.response?.data?.message || err.message || 'Failed to upload document.')
    } finally {
      setUploadingDocKey(null)
    }
  }

  const uploadImageAt = async (index, file) => {
    if (!file) return
    setUploadingIndex(index)
    setUploadError('')
    const preview = URL.createObjectURL(file)
    updateImage(index, { preview })
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('upload-image', formData)
      const uploadedUrl = storedUploadPath(res.data)
      if (!uploadedUrl) throw new Error('Upload succeeded but no path was returned.')
      updateImage(index, { url: uploadedUrl, preview })
    } catch (err) {
      updateImage(index, { url: '', preview: '' })
      setUploadError(err.response?.data?.message || err.message || 'Failed to upload image.')
    } finally {
      setUploadingIndex(null)
    }
  }

  return (
    <div className="space-y-4">
      {uploadError ? (
        <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
          {uploadError}
        </p>
      ) : null}

      <SectionCard
        icon={FaBriefcase}
        title="Services"
        hint="List services and attach a document for each (no typed description)."
        action={
          <button
            type="button"
            onClick={() => onServicesChange([...(services || []), emptyService()])}
            className="wc-btn wc-btn--primary shrink-0 text-xs"
          >
            <FaPlus className="w-3 h-3" aria-hidden="true" />
            Add
          </button>
        }
      >
        {(services || []).length === 0 ? (
          <button
            type="button"
            onClick={() => onServicesChange([...(services || []), emptyService()])}
            className="w-full rounded-xl border-2 border-dashed border-gray-200 bg-slate-50/60 hover:border-[color-mix(in_srgb,var(--brand)_35%,transparent)] transition px-4 py-7 text-center"
          >
            <FaBriefcase className="w-5 h-5 text-slate-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-bold text-gray-600">No services yet</p>
            <p className="text-[11px] text-gray-500 mt-1">Optional — add a name and attach a document.</p>
            <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-[var(--brand-dark)]">
              <FaPlus className="w-3 h-3" aria-hidden="true" />
              Add first service
            </span>
          </button>
        ) : (
          (services || []).map((service, index) => (
            <div
              key={`svc-${index}`}
              className="rounded-xl border border-gray-200 bg-slate-50/40 p-3.5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-600">Service {index + 1}</span>
                <button
                  type="button"
                  onClick={() => onServicesChange(services.filter((_, i) => i !== index))}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition"
                >
                  <FaTrash className="w-3 h-3" aria-hidden="true" />
                  Remove
                </button>
              </div>
              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  value={service.name}
                  onChange={(e) => updateService(index, { name: e.target.value })}
                  placeholder="e.g. Financial Planning"
                  className="wc-field-input"
                  maxLength={150}
                />
              </div>
              <DocumentAttachmentField
                id={`service-doc-${index}`}
                label="Document"
                labelClass={labelClass}
                url={service.attachment_url}
                name={service.attachment_name}
                uploading={uploadingDocKey === `service-${index}`}
                onFile={(file) => uploadServiceDoc(index, file)}
                onClear={() => updateService(index, { attachment_url: '', attachment_name: '' })}
              />
            </div>
          ))
        )}
      </SectionCard>

      <SectionCard
        icon={FaImage}
        title="Images"
        hint="Upload additional images for the site (hero, team, office, etc.)."
        action={
          <button
            type="button"
            onClick={() => onImagesChange([...(images || []), emptyImage()])}
            className="wc-btn wc-btn--primary shrink-0 text-xs"
          >
            <FaPlus className="w-3 h-3" aria-hidden="true" />
            Add
          </button>
        }
      >
        {(images || []).length === 0 ? (
          <button
            type="button"
            onClick={() => onImagesChange([...(images || []), emptyImage()])}
            className="w-full rounded-xl border-2 border-dashed border-gray-200 bg-slate-50/60 hover:border-[color-mix(in_srgb,var(--brand)_35%,transparent)] transition px-4 py-7 text-center"
          >
            <FaImage className="w-5 h-5 text-slate-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-bold text-gray-600">No images yet</p>
            <p className="text-[11px] text-gray-500 mt-1">Optional — hero, team, office, or other photos.</p>
            <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-[var(--brand-dark)]">
              <FaPlus className="w-3 h-3" aria-hidden="true" />
              Add first image
            </span>
          </button>
        ) : (
          (images || []).map((image, index) => {
            const src = image.preview || (image.url ? websiteComplianceAssetUrl(image.url) : '')
            return (
              <div
                key={`img-${index}`}
                className="rounded-xl border border-gray-200 bg-slate-50/40 p-3.5 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {src ? (
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <FaImage className="w-5 h-5 text-gray-300" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <FileDropzone
                      id={`request-extra-image-${index}`}
                      label={`Image ${index + 1}`}
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                      hint="PNG, JPG, WebP, or SVG"
                      disabled={uploadingIndex === index}
                      files={[]}
                      onChange={(next) => {
                        const file = next[0] || null
                        if (file) uploadImageAt(index, file)
                      }}
                    />
                    <input
                      type="text"
                      value={image.label}
                      onChange={(e) => updateImage(index, { label: e.target.value })}
                      placeholder="Label (optional)"
                      className="wc-field-input"
                      maxLength={150}
                    />
                    <button
                      type="button"
                      onClick={() => onImagesChange(images.filter((_, i) => i !== index))}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline"
                    >
                      <FaTrash className="w-3 h-3" aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </SectionCard>

      <SectionCard
        icon={FaEnvelope}
        title="Contact details"
        hint="Phone, email, address, and website shown on the live site."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Phone</label>
            <input
              type="text"
              value={contactDetails?.phone || ''}
              onChange={(e) =>
                onContactDetailsChange({ ...contactDetails, phone: e.target.value })
              }
              className="wc-field-input"
              maxLength={80}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={contactDetails?.email || ''}
              onChange={(e) =>
                onContactDetailsChange({ ...contactDetails, email: e.target.value })
              }
              className="wc-field-input"
              maxLength={255}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Address</label>
            <input
              type="text"
              value={contactDetails?.address || ''}
              onChange={(e) =>
                onContactDetailsChange({ ...contactDetails, address: e.target.value })
              }
              className="wc-field-input"
              maxLength={500}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Website</label>
            <input
              type="text"
              value={contactDetails?.website || ''}
              onChange={(e) =>
                onContactDetailsChange({ ...contactDetails, website: e.target.value })
              }
              placeholder="https://"
              className="wc-field-input"
              maxLength={255}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={FaFileContract}
        title="Policies"
        hint="Attach privacy, terms, cookies, or other policy documents."
        action={
          <button
            type="button"
            onClick={() => onPoliciesChange([...(policies || []), emptyPolicy()])}
            className="wc-btn wc-btn--primary shrink-0 text-xs"
          >
            <FaPlus className="w-3 h-3" aria-hidden="true" />
            Add
          </button>
        }
      >
        {(policies || []).length === 0 ? (
          <button
            type="button"
            onClick={() => onPoliciesChange([...(policies || []), emptyPolicy()])}
            className="w-full rounded-xl border-2 border-dashed border-gray-200 bg-slate-50/60 hover:border-[color-mix(in_srgb,var(--brand)_35%,transparent)] transition px-4 py-7 text-center"
          >
            <FaFileContract className="w-5 h-5 text-slate-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-bold text-gray-600">No policies yet</p>
            <p className="text-[11px] text-gray-500 mt-1">Optional — attach a PDF or Word document for each policy.</p>
            <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-[var(--brand-dark)]">
              <FaPlus className="w-3 h-3" aria-hidden="true" />
              Add first policy
            </span>
          </button>
        ) : (
          (policies || []).map((policy, index) => (
            <div
              key={`pol-${index}`}
              className="rounded-xl border border-gray-200 bg-slate-50/40 p-3.5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-600">Policy {index + 1}</span>
                <button
                  type="button"
                  onClick={() => onPoliciesChange(policies.filter((_, i) => i !== index))}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition"
                >
                  <FaTrash className="w-3 h-3" aria-hidden="true" />
                  Remove
                </button>
              </div>
              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  value={policy.name}
                  onChange={(e) => updatePolicy(index, { name: e.target.value })}
                  placeholder="e.g. Privacy Policy"
                  className="wc-field-input"
                  maxLength={150}
                />
              </div>
              <DocumentAttachmentField
                id={`policy-doc-${index}`}
                label="Document"
                labelClass={labelClass}
                url={policy.attachment_url}
                name={policy.attachment_name}
                uploading={uploadingDocKey === `policy-${index}`}
                onFile={(file) => uploadPolicyDoc(index, file)}
                onClear={() => updatePolicy(index, { attachment_url: '', attachment_name: '' })}
              />
            </div>
          ))
        )}
      </SectionCard>

      <SectionCard
        icon={FaFileAlt}
        title="Pages & content"
        hint={
          pages.length
            ? 'Select pages from this template and attach a content document for each.'
            : 'This template has no selectable pages yet. Power Admin can add them when registering the template.'
        }
      >
        {pages.length === 0 ? (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            No pages are configured for this template. You can still submit branding and other details.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              {pages.map((page) => {
                const checked = selected.includes(page.slug)
                return (
                  <label
                    key={page.slug}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition ${
                      checked
                        ? 'border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_8%,white)]'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePage(page.slug)}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--brand-dark)]">
                        {page.name}
                      </span>
                      {page.description ? (
                        <span className="block text-[11px] text-gray-500 mt-0.5">
                          {page.description}
                        </span>
                      ) : (
                        <span className="block text-[10px] font-mono text-gray-400 mt-0.5">
                          {page.slug}
                        </span>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>

            {selected.length > 0 && (
              <div className="space-y-3 pt-1 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-700">Documents for selected pages</p>
                {selected.map((slug) => {
                  const page = pages.find((p) => p.slug === slug)
                  const entry =
                    pageContents?.[slug] && typeof pageContents[slug] === 'object'
                      ? pageContents[slug]
                      : { url: '', name: '' }
                  return (
                    <div key={`content-${slug}`} className="rounded-xl border border-gray-200 bg-slate-50/40 p-3.5">
                      <DocumentAttachmentField
                        id={`page-doc-${slug}`}
                        label={page?.name || slug}
                        labelClass={labelClass}
                        url={entry.url || entry.attachment_url || ''}
                        name={entry.name || entry.attachment_name || ''}
                        uploading={uploadingDocKey === `page-${slug}`}
                        onFile={(file) => uploadPageDoc(slug, file)}
                        onClear={() =>
                          onPageContentsChange({
                            ...(pageContents || {}),
                            [slug]: { url: '', name: '' },
                          })
                        }
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function DetailBlock({ icon: Icon, title, children, empty }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-50 border-b border-gray-100">
        {Icon ? (
          <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--brand)_12%,white)] text-[var(--brand-dark)] flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
        ) : null}
        <p className="text-sm font-extrabold text-[var(--brand-dark)]">{title}</p>
      </div>
      <div className="p-4">
        {empty ? (
          <p className="text-[11px] text-gray-400 italic">Not provided</p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono = false }) {
  const display = value == null || value === '' ? null : value
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs font-semibold text-gray-500 shrink-0">{label}</span>
      <span
        className={`text-sm font-semibold text-[var(--brand-dark)] text-right break-words min-w-0 ${
          mono ? 'font-mono text-xs' : ''
        }`}
      >
        {display || <span className="text-gray-400 font-normal italic">—</span>}
      </span>
    </div>
  )
}

/**
 * Read-only view of requestor-filled deployment details for Power Admin / reviewers.
 */
export function TemplateRequestDetailsView({ request }) {
  if (!request) return null

  const services = Array.isArray(request.services) ? request.services : []
  const images = Array.isArray(request.images) ? request.images : []
  const policies = Array.isArray(request.policies) ? request.policies : []
  const selectedPages = Array.isArray(request.selected_pages) ? request.selected_pages : []
  const pageContents =
    request.page_contents && typeof request.page_contents === 'object' ? request.page_contents : {}
  const contact =
    request.contact_details && typeof request.contact_details === 'object'
      ? request.contact_details
      : {}
  const hasContact = ['phone', 'email', 'address', 'website'].some((k) => String(contact[k] || '').trim())
  const requester =
    request.requested_by || request.requestedBy || request.advisor || null
  const assignedAdvisor = request.assigned_advisor || request.assignedAdvisor || null
  const logoSrc = request.logo_url ? websiteComplianceAssetUrl(request.logo_url) : ''
  const whiteLogoSrc = request.white_logo_url ? websiteComplianceAssetUrl(request.white_logo_url) : ''
  const faviconSrc = request.favicon_url ? websiteComplianceAssetUrl(request.favicon_url) : ''

  return (
    <div className="space-y-4">
      <DetailBlock icon={FaGlobe} title="Request summary">
        <DetailRow label="Template" value={request.template_name} />
        <DetailRow label="Intended live domain" value={request.domain_name} mono />
        <DetailRow label="Staging URL" value={request.staging_domain} mono />
        <DetailRow label="Active URL" value={request.cpanel_domain} mono />
        <DetailRow label="Status" value={request.status} />
        <DetailRow label="Requested by" value={requester?.name || requester?.email} />
        <DetailRow
          label="Content advisor"
          value={
            assignedAdvisor
              ? `${assignedAdvisor.name || ''}${assignedAdvisor.email ? ` (${assignedAdvisor.email})` : ''}`.trim()
              : null
          }
        />
        <DetailRow
          label="Go-live requested"
          value={request.go_live_requested_at || null}
        />
        <DetailRow
          label="Go-live notes"
          value={request.go_live_notes || null}
        />
      </DetailBlock>

      <DetailBlock icon={FaPalette} title="Branding">
        <div className="flex flex-wrap gap-3 mb-3">
          {[
            { label: 'Logo', src: logoSrc },
            { label: 'White logo', src: whiteLogoSrc, dark: true },
            { label: 'Favicon', src: faviconSrc },
          ].map(({ label, src, dark }) => (
            <div key={label} className="text-center">
              <div
                className={`w-14 h-14 rounded-xl border overflow-hidden flex items-center justify-center ${
                  dark ? 'border-gray-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
                }`}
              >
                {src ? (
                  <img src={src} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  <FaImage className={`w-4 h-4 ${dark ? 'text-gray-500' : 'text-gray-300'}`} aria-hidden="true" />
                )}
              </div>
              <p className="text-[10px] font-semibold text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
        <DetailRow label="Primary colour" value={request.primary_color} mono />
        <DetailRow label="Secondary colour" value={request.secondary_color} mono />
        {(request.primary_color || request.secondary_color) && (
          <div
            className="mt-2 h-2.5 rounded-full overflow-hidden flex ring-1 ring-black/5"
            aria-hidden="true"
          >
            <span className="flex-[2]" style={{ backgroundColor: request.primary_color || '#0B1B3D' }} />
            <span className="flex-1" style={{ backgroundColor: request.secondary_color || '#C8102E' }} />
          </div>
        )}
      </DetailBlock>

      <DetailBlock icon={FaBriefcase} title="Services" empty={services.length === 0}>
        <div className="space-y-3">
          {services.map((service, index) => {
            const docUrl = service.attachment_url || service.url || ''
            const docName = service.attachment_name || service.name || `Service ${index + 1}`
            return (
              <div
                key={`svc-view-${index}`}
                className="rounded-xl border border-gray-100 bg-slate-50/50 px-3.5 py-3"
              >
                <p className="text-sm font-bold text-[var(--brand-dark)]">
                  {service.name || `Service ${index + 1}`}
                </p>
                {docUrl ? (
                  <FileNameLabel
                    name={docName}
                    href={websiteComplianceAssetUrl(docUrl)}
                    className="mt-1.5 text-xs font-semibold text-[var(--brand-dark)]"
                    iconClassName="w-3 h-3 text-gray-400"
                    fallback="Download document"
                  />
                ) : service.description ? (
                  <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap leading-relaxed">
                    {service.description}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-400 italic mt-1">No document attached</p>
                )}
              </div>
            )
          })}
        </div>
      </DetailBlock>

      <DetailBlock icon={FaImage} title="Images" empty={images.length === 0}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((image, index) => {
            const src = image.url ? websiteComplianceAssetUrl(image.url) : ''
            return (
              <div
                key={`img-view-${index}`}
                className="rounded-xl border border-gray-100 overflow-hidden bg-slate-50"
              >
                <div className="aspect-video flex items-center justify-center bg-white">
                  {src ? (
                    <img src={src} alt={image.label || ''} className="w-full h-full object-cover" />
                  ) : (
                    <FaImage className="w-5 h-5 text-gray-300" aria-hidden="true" />
                  )}
                </div>
                {image.label ? (
                  <p className="px-2 py-1.5 text-[11px] font-semibold text-gray-600 truncate">
                    {image.label}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      </DetailBlock>

      <DetailBlock icon={FaEnvelope} title="Contact details" empty={!hasContact}>
        <DetailRow label="Phone" value={contact.phone} />
        <DetailRow label="Email" value={contact.email} />
        <DetailRow label="Address" value={contact.address} />
        <DetailRow label="Website" value={contact.website} mono />
      </DetailBlock>

      <DetailBlock icon={FaFileContract} title="Policies" empty={policies.length === 0}>
        <div className="space-y-3">
          {policies.map((policy, index) => {
            const docUrl = policy.attachment_url || policy.url || ''
            const docName = policy.attachment_name || policy.name || `Policy ${index + 1}`
            return (
              <div
                key={`pol-view-${index}`}
                className="rounded-xl border border-gray-100 bg-slate-50/50 px-3.5 py-3"
              >
                <p className="text-sm font-bold text-[var(--brand-dark)]">
                  {policy.name || `Policy ${index + 1}`}
                </p>
                {docUrl ? (
                  <FileNameLabel
                    name={docName}
                    href={websiteComplianceAssetUrl(docUrl)}
                    className="mt-1.5 text-xs font-semibold text-[var(--brand-dark)]"
                    iconClassName="w-3 h-3 text-gray-400"
                    fallback="Download document"
                  />
                ) : policy.content ? (
                  <p className="text-xs text-gray-600 mt-1.5 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {policy.content}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-400 italic mt-1">No document attached</p>
                )}
              </div>
            )
          })}
        </div>
      </DetailBlock>

      <DetailBlock icon={FaFileAlt} title="Pages & content" empty={selectedPages.length === 0}>
        <div className="space-y-3">
          {selectedPages.map((slug) => {
            const raw = pageContents[slug]
            const entry =
              raw && typeof raw === 'object'
                ? raw
                : typeof raw === 'string' && raw.trim()
                  ? { content: raw }
                  : null
            const docUrl = entry?.url || entry?.attachment_url || ''
            const docName = entry?.name || entry?.attachment_name || slug
            return (
              <div
                key={`page-view-${slug}`}
                className="rounded-xl border border-gray-100 bg-slate-50/50 px-3.5 py-3"
              >
                <p className="text-sm font-bold text-[var(--brand-dark)]">{slug}</p>
                {docUrl ? (
                  <FileNameLabel
                    name={docName}
                    href={websiteComplianceAssetUrl(docUrl)}
                    className="mt-1.5 text-xs font-semibold text-[var(--brand-dark)]"
                    iconClassName="w-3 h-3 text-gray-400"
                    fallback="Download document"
                  />
                ) : entry?.content ? (
                  <p className="text-xs text-gray-600 mt-1.5 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {entry.content}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-400 italic mt-1">No document attached</p>
                )}
              </div>
            )
          })}
        </div>
      </DetailBlock>
    </div>
  )
}
