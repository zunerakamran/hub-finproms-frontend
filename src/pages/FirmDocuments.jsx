import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FaArchive,
  FaBoxOpen,
  FaChevronDown,
  FaChevronRight,
  FaFolder,
  FaFolderPlus,
  FaKey,
  FaTimes,
  FaTrash,
  FaUpload,
} from 'react-icons/fa'
import { api } from '../api/client'
import { DataGridIconBtn } from '../components/DataGrid'
import FileDropzone from '../components/FileDropzone'
import { useHub } from '../context/HubContext'
import { COMPLIANCE_SUPPORTING_FILES_ACCEPT } from '../utils/complianceSupportingFiles'

function flattenFolders(folders, depth = 0, path = []) {
  const rows = []
  for (const folder of folders || []) {
    const nextPath = [...path, folder.name]
    rows.push({
      type: 'folder',
      id: `folder-${folder.id}`,
      folderId: folder.id,
      name: folder.name,
      depth,
      pathLabel: nextPath.join(' / '),
      documentCount: folder.document_count ?? (folder.documents || []).length,
      documents: folder.documents || [],
    })
    rows.push(...flattenFolders(folder.children || [], depth + 1, nextPath))
  }
  return rows
}

function folderPathOptions(flatFolders) {
  const byId = Object.fromEntries((flatFolders || []).map((f) => [f.id, f]))
  const labelFor = (folder) => {
    const parts = [folder.name]
    let pid = folder.parent_id
    while (pid && byId[pid]) {
      parts.unshift(byId[pid].name)
      pid = byId[pid].parent_id
    }
    return parts.join(' / ')
  }
  return (flatFolders || [])
    .map((f) => ({ ...f, pathLabel: labelFor(f) }))
    .sort((a, b) => a.pathLabel.localeCompare(b.pathLabel))
}

function AccessRightsModal({ open, onClose, document: doc, onError }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [savingUserId, setSavingUserId] = useState(null)

  useEffect(() => {
    if (!open || !doc?.id) return undefined
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await api.firmDocumentAccessRights(doc.id)
        if (!cancelled) setMembers(data.members || [])
      } catch (err) {
        if (!cancelled) onError?.(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    const body = typeof window !== 'undefined' ? window.document.body : null
    const prev = body?.style?.overflow
    if (body) {
      body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKey)
    }
    return () => {
      cancelled = true
      if (body) {
        body.style.overflow = prev || ''
        window.removeEventListener('keydown', onKey)
      }
    }
  }, [open, doc?.id, onClose, onError])

  const updateRight = async (member, patch) => {
    if (member.is_firm_head) return
    setSavingUserId(member.id)
    try {
      await api.setFirmDocumentAccessRights(doc.id, {
        user_id: member.id,
        can_add: patch.can_add ?? member.can_add,
        can_view: patch.can_view ?? member.can_view,
        can_delete: patch.can_delete ?? member.can_delete,
        can_archive: patch.can_archive ?? member.can_archive,
      })
      const data = await api.firmDocumentAccessRights(doc.id)
      setMembers(data.members || [])
    } catch (err) {
      onError?.(err.data?.message || err.message)
    } finally {
      setSavingUserId(null)
    }
  }

  if (!open || typeof window === 'undefined') return null

  return createPortal(
    <div className="compliance-audit-modal firm-docs-access-modal" role="presentation">
      <button
        type="button"
        className="compliance-audit-modal__backdrop"
        aria-label="Close access rights"
        onClick={onClose}
      />
      <div
        className="compliance-audit-modal__dialog firm-docs-access-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Document access rights"
      >
        <div className="compliance-audit-modal__head">
          <div>
            <h3>Access rights</h3>
            <p className="muted">{doc?.title}</p>
          </div>
          <button
            type="button"
            className="compliance-audit-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>
        <div className="compliance-audit-modal__body">
          <p className="muted" style={{ marginTop: 0 }}>
            Grant rights for this document only. The Head of Firm always has all rights.
          </p>
          {loading ? (
            <p className="muted">Loading members…</p>
          ) : members.length === 0 ? (
            <p className="muted">No firm members yet.</p>
          ) : (
            <div className="firm-docs-access-table-wrap">
              <table className="firm-docs-access-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>View</th>
                    <th>Add</th>
                    <th>Archive</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="firm-docs-access-member">
                          <strong>
                            {row.name}
                            {row.is_firm_head ? (
                              <span className="muted"> · Head</span>
                            ) : null}
                          </strong>
                          {row.email ? (
                            <span className="muted firm-docs-access-email">{row.email}</span>
                          ) : null}
                        </div>
                      </td>
                      {['can_view', 'can_add', 'can_archive', 'can_delete'].map((key) => (
                        <td key={key} className="firm-docs-access-check">
                          <input
                            type="checkbox"
                            disabled={row.is_firm_head || savingUserId === row.id}
                            checked={Boolean(row[key])}
                            onChange={(e) => updateRight(row, { [key]: e.target.checked })}
                            aria-label={`${key.replace('can_', '')} for ${row.name}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>,
    window.document.body
  )
}

export default function FirmDocuments() {
  const { can, actingHubId, hub } = useHub()
  const [firms, setFirms] = useState([])
  const [firmId, setFirmId] = useState('')
  const [folders, setFolders] = useState([])
  const [rootDocuments, setRootDocuments] = useState([])
  const [flatFolderOptions, setFlatFolderOptions] = useState([])
  const [categories, setCategories] = useState([])
  const [rights, setRights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([])
  /** '' | folder id | '__new__' */
  const [folderChoice, setFolderChoice] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderParentId, setNewFolderParentId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [folderSaving, setFolderSaving] = useState(false)
  const [expanded, setExpanded] = useState(() => new Set())
  const [accessDoc, setAccessDoc] = useState(null)

  const isFirmHead = Boolean(
    rights?.is_firm_head || hub?.firm_document_rights?.is_firm_head
  )
  const hubWideFirmDocs = Boolean(
    rights?.hub_wide?.can_view ||
      rights?.hub_wide?.can_add ||
      rights?.hub_wide?.can_delete ||
      rights?.hub_wide?.can_archive ||
      hub?.firm_document_rights?.hub_wide?.can_view ||
      hub?.firm_document_rights?.hub_wide?.can_add ||
      hub?.firm_document_rights?.hub_wide?.can_delete ||
      hub?.firm_document_rights?.hub_wide?.can_archive
  )
  const showFirmPicker = hubWideFirmDocs

  const selectedFirm = useMemo(
    () => firms.find((f) => String(f.id) === String(firmId)) || null,
    [firms, firmId]
  )

  const folderRows = useMemo(() => flattenFolders(folders), [folders])
  const folderChoices = useMemo(
    () => folderPathOptions(flatFolderOptions),
    [flatFolderOptions]
  )

  const loadFirms = async () => {
    try {
      const mine = await api.firmDocumentsMyRights()
      const ownFirmId = mine.rights?.firm_id
      const head = Boolean(mine.rights?.is_firm_head)
      if (mine.rights) setRights(mine.rights)

      if (head && ownFirmId) {
        setFirms([{ id: ownFirmId, name: 'My firm' }])
        setFirmId(String(ownFirmId))
        return
      }

      const hubWide = Boolean(
        mine.rights?.hub_wide?.can_view ||
          mine.rights?.hub_wide?.can_add ||
          mine.rights?.hub_wide?.can_delete ||
          mine.rights?.hub_wide?.can_archive
      )
      if (!hubWide && ownFirmId) {
        setFirms([{ id: ownFirmId, name: 'My firm' }])
        setFirmId(String(ownFirmId))
        return
      }

      let list = []
      try {
        const data = await api.listFirms({ page: 1, per_page: 50 })
        list = data.firms || []
      } catch {
        list = []
      }
      if (list.length === 0 && ownFirmId) {
        list = [{ id: ownFirmId, name: 'My firm' }]
      }
      setFirms(list)
      if (!firmId && list[0]) setFirmId(String(list[0].id))
    } catch (err) {
      setError(err.message)
    }
  }

  const loadDocuments = async (id = firmId) => {
    if (!id) {
      setFolders([])
      setRootDocuments([])
      setFlatFolderOptions([])
      setRights(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [data, folderList] = await Promise.all([
        api.listFirmDocuments({ firm_id: id, scope: 'active' }),
        api.listFirmDocumentFolders({ firm_id: id }).catch(() => ({ folders: [] })),
      ])
      setFolders(data.folders || [])
      setRootDocuments(
        data.unfiled_documents || (data.folders ? [] : data.documents) || []
      )
      setRights(data.rights || null)
      // Prefer categories embedded in the library response; fall back to list endpoint.
      let nextCategories = data.categories || []
      if (!nextCategories.length) {
        try {
          const cats = await api.firmDocumentCategories()
          nextCategories = cats.categories || []
        } catch {
          nextCategories = []
        }
      }
      setCategories(nextCategories)
      setFlatFolderOptions(folderList.folders || [])
      setExpanded((prev) => {
        if (prev.size > 0) return prev
        const next = new Set()
        flattenFolders(data.folders || []).forEach((row) => next.add(row.id))
        return next
      })
      if (data.firm) {
        setFirms((prev) => {
          if (isFirmHead || prev.length <= 1) return [data.firm]
          if (prev.some((f) => String(f.id) === String(data.firm.id))) {
            return prev.map((f) =>
              String(f.id) === String(data.firm.id) ? data.firm : f
            )
          }
          return [...prev, data.firm]
        })
      }
    } catch (err) {
      setError(err.message)
      setFolders([])
      setRootDocuments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFirms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingHubId])

  useEffect(() => {
    setExpanded(new Set())
    loadDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmId, actingHubId])

  const resetUploadForm = () => {
    setTitle('')
    setDescription('')
    setFiles([])
    setFolderChoice('')
    setNewFolderName('')
    setNewFolderParentId('')
    setCategoryId('')
  }

  const onUpload = async (e) => {
    e.preventDefault()
    if (!files.length) {
      setError('Add one attachment file.')
      return
    }
    if (folderChoice === '__new__' && !newFolderName.trim()) {
      setError('Enter a name for the new folder.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('firm_id', firmId)
      formData.append('title', title.trim())
      if (description.trim()) formData.append('description', description.trim())
      if (categoryId) formData.append('category_id', categoryId)

      if (folderChoice === '__new__') {
        formData.append('folder_name', newFolderName.trim())
        if (newFolderParentId) formData.append('parent_folder_id', newFolderParentId)
      } else if (folderChoice) {
        formData.append('folder_id', folderChoice)
      }

      formData.append('attachments[]', files[0])
      const data = await api.createFirmDocument(formData)
      setMessage(data.message || 'Document uploaded.')
      setShowUpload(false)
      resetUploadForm()
      await loadDocuments()
    } catch (err) {
      setError(err.data?.message || err.message)
    } finally {
      setSaving(false)
    }
  }

  const onCreateFolder = async (e) => {
    e.preventDefault()
    if (!newFolderName.trim()) {
      setError('Enter a folder name.')
      return
    }
    setFolderSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        firm_id: Number(firmId),
        name: newFolderName.trim(),
      }
      if (newFolderParentId) payload.parent_id = Number(newFolderParentId)
      const data = await api.createFirmDocumentFolder(payload)
      setMessage(data.message || 'Folder created.')
      setShowNewFolder(false)
      setNewFolderName('')
      setNewFolderParentId('')
      await loadDocuments()
    } catch (err) {
      setError(err.data?.message || err.message)
    } finally {
      setFolderSaving(false)
    }
  }

  const openNewFolderForm = (parentId = '') => {
    setShowUpload(false)
    setShowNewFolder(true)
    setNewFolderParentId(parentId ? String(parentId) : '')
    setNewFolderName('')
    setError('')
  }

  const toggleArchive = async (doc) => {
    try {
      if (doc.is_archived) await api.unarchiveFirmDocument(doc.id)
      else await api.archiveFirmDocument(doc.id)
      await loadDocuments()
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteDoc = async (doc) => {
    if (!window.confirm(`Permanently delete “${doc.title}”?`)) return
    try {
      await api.deleteFirmDocument(doc.id)
      await loadDocuments()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleExpand = (rowId) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  const canAdd = rights?.can_add || can('firm_documents_add')
  const canManageRights = Boolean(rights?.can_manage_member_rights || rights?.is_firm_head)
  const functionalityEnabled = rights?.functionality_enabled !== false

  const docCanArchive = (doc) =>
    Boolean(doc.viewer_rights?.can_archive || rights?.can_archive || can('firm_documents_archive'))
  const docCanDelete = (doc) =>
    Boolean(doc.viewer_rights?.can_delete || rights?.can_delete || can('firm_documents_delete'))

  const primaryAttachment = (doc) => (doc.attachments || [])[0] || null

  const renderDocumentRow = (doc, depth) => {
    const file = primaryAttachment(doc)
    return (
      <tr key={`doc-${doc.id}`}>
        <td style={{ paddingLeft: `${0.85 + depth * 1.1}rem` }}>
          <div className="firm-docs-doc-cell">
            <strong className="firm-docs-doc-title">{doc.title}</strong>
            {file ? (
              <a
                className="firm-docs-doc-file"
                href={file.file_url}
                target="_blank"
                rel="noreferrer"
              >
                {file.original_name}
              </a>
            ) : (
              <span className="muted">No file</span>
            )}
          </div>
        </td>
        <td className="firm-docs-desc-cell">
          {doc.description ? doc.description : <span className="muted">—</span>}
        </td>
        <td>{doc.category?.name || '—'}</td>
        <td>{doc.uploader?.name || '—'}</td>
        <td>
          <div className="data-grid__actions">
            {canManageRights ? (
              <DataGridIconBtn
                icon={FaKey}
                label="Access rights"
                onClick={() => setAccessDoc(doc)}
              />
            ) : null}
            {docCanArchive(doc) ? (
              <DataGridIconBtn
                icon={doc.is_archived ? FaBoxOpen : FaArchive}
                label={doc.is_archived ? 'Unarchive' : 'Archive'}
                onClick={() => toggleArchive(doc)}
              />
            ) : null}
            {docCanDelete(doc) ? (
              <DataGridIconBtn
                icon={FaTrash}
                label="Delete"
                variant="danger"
                onClick={() => deleteDoc(doc)}
              />
            ) : null}
          </div>
        </td>
      </tr>
    )
  }

  const visibleFolderRows = useMemo(() => {
    const parentById = {}
    flatFolderOptions.forEach((f) => {
      parentById[f.id] = f.parent_id
    })

    const ancestorsExpanded = (folderId) => {
      let pid = parentById[folderId]
      while (pid) {
        if (!expanded.has(`folder-${pid}`)) return false
        pid = parentById[pid]
      }
      return true
    }

    const visible = []
    for (const row of folderRows) {
      if (row.depth > 0 && !ancestorsExpanded(row.folderId)) continue
      visible.push(row)
      if (expanded.has(row.id)) {
        for (const doc of row.documents || []) {
          visible.push({
            type: 'document',
            id: `doc-${doc.id}`,
            document: doc,
            depth: row.depth + 1,
          })
        }
      }
    }
    return visible
  }, [folderRows, expanded, flatFolderOptions])

  return (
    <section className="firm-docs-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Firm documents</h1>
          <p className="muted">
            Folders, categories, and per-document access. Use the key icon to grant member rights.
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}
      {rights && rights.functionality_enabled === false && !rights.is_firm_head ? (
        <div className="alert">
          Hub-wide firm document tools are off. Enable{' '}
          <strong>Functionalities → Firm documents</strong> for matrix access. Head of Firm still
          has access to their own firm’s documents.
        </div>
      ) : null}

      <div className="firm-docs-toolbar">
        {showFirmPicker ? (
          <label className="firm-docs-toolbar__field">
            <span>Firm</span>
            <select value={firmId} onChange={(e) => setFirmId(e.target.value)}>
              <option value="">Select a firm</option>
              {firms.map((firm) => (
                <option key={firm.id} value={firm.id}>
                  {firm.name}
                </option>
              ))}
            </select>
          </label>
        ) : selectedFirm || firmId ? (
          <div className="firm-docs-toolbar__meta">
            <span className="muted">Firm</span>
            <strong>{selectedFirm?.name || 'My firm'}</strong>
          </div>
        ) : null}
        {functionalityEnabled && canAdd ? (
          <div className="firm-docs-toolbar__actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setShowUpload(false)
                openNewFolderForm('')
              }}
            >
              <FaFolderPlus style={{ marginRight: 6 }} />
              New folder
            </button>
          </div>
        ) : null}
      </div>

      {showNewFolder ? (
        <form className="admin-form firm-docs-panel" onSubmit={onCreateFolder}>
          <h2 style={{ marginTop: 0 }}>
            {newFolderParentId ? 'New subfolder' : 'New folder'}
          </h2>
          <div className="firm-docs-form-grid">
            <label>
              Folder name
              <input
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Policies"
              />
            </label>
            <label>
              Location
              <select
                value={newFolderParentId}
                onChange={(e) => setNewFolderParentId(e.target.value)}
              >
                <option value="">Main (top level)</option>
                {folderChoices.map((f) => (
                  <option key={f.id} value={f.id}>
                    Inside: {f.pathLabel}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="actions">
            <button className="btn primary" disabled={folderSaving}>
              {folderSaving ? 'Creating…' : 'Create folder'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setShowNewFolder(false)
                setNewFolderName('')
                setNewFolderParentId('')
              }}
              disabled={folderSaving}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {showUpload ? (
        <form className="admin-form firm-docs-panel" onSubmit={onUpload}>
          <h2 style={{ marginTop: 0 }}>Upload document</h2>
          <div className="firm-docs-form-grid">
            <label>
              Title
              <input required value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label>
              Category (optional)
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="firm-docs-form-grid__full">
              Description (optional)
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </label>
            <label>
              Folder
              <select
                value={folderChoice}
                onChange={(e) => setFolderChoice(e.target.value)}
              >
                <option value="">Main (no folder)</option>
                {folderChoices.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.pathLabel}
                  </option>
                ))}
                <option value="__new__">Create new folder…</option>
              </select>
            </label>
            {folderChoice === '__new__' ? (
              <>
                <label>
                  New folder name
                  <input
                    required
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Policies"
                  />
                </label>
                <label>
                  Put new folder inside
                  <select
                    value={newFolderParentId}
                    onChange={(e) => setNewFolderParentId(e.target.value)}
                  >
                    <option value="">Main (top level)</option>
                    {folderChoices.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.pathLabel}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
          </div>
          <FileDropzone
            accept={COMPLIANCE_SUPPORTING_FILES_ACCEPT}
            multiple={false}
            maxFiles={1}
            files={files}
            onChange={setFiles}
            label="Attachment (one file)"
            hint="PDF, Word, Excel, images, etc."
            required
          />
          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Uploading…' : 'Upload'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setShowUpload(false)
                resetUploadForm()
              }}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {functionalityEnabled && canAdd ? (
        <div className="firm-docs-table-actions">
          <button
            type="button"
            className="btn primary"
            onClick={async () => {
              setShowNewFolder(false)
              const opening = !showUpload
              setShowUpload(opening)
              if (opening) {
                try {
                  const cats = await api.firmDocumentCategories()
                  setCategories(cats.categories || [])
                } catch {
                  // Keep whatever was loaded with the library.
                }
              }
            }}
          >
            <FaUpload style={{ marginRight: 6 }} />
            Upload
          </button>
        </div>
      ) : null}

      <div className="data-grid firm-docs-grid">
        <div className="data-grid__wrap">
          <table className="data-grid__table firm-docs-table">
            <colgroup>
              <col className="firm-docs-col-doc" />
              <col className="firm-docs-col-desc" />
              <col className="firm-docs-col-cat" />
              <col className="firm-docs-col-uploader" />
              <col className="firm-docs-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>Document</th>
                <th>Description</th>
                <th>Category</th>
                <th>Uploaded by</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Loading…
                  </td>
                </tr>
              ) : null}
              {!loading && visibleFolderRows.length === 0 && rootDocuments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    {firmId ? 'No documents yet.' : 'Select a firm to view documents.'}
                  </td>
                </tr>
              ) : null}
              {!loading
                ? visibleFolderRows.map((row) => {
                    if (row.type === 'document') {
                      return renderDocumentRow(row.document, row.depth)
                    }
                    const isOpen = expanded.has(row.id)
                    return (
                      <tr key={row.id} className="firm-docs-folder-row">
                        <td
                          colSpan={4}
                          style={{ paddingLeft: `${0.85 + row.depth * 1.1}rem` }}
                        >
                          <button
                            type="button"
                            className="firm-docs-folder-toggle"
                            onClick={() => toggleExpand(row.id)}
                            aria-expanded={isOpen}
                          >
                            {isOpen ? <FaChevronDown /> : <FaChevronRight />}
                            <FaFolder className="firm-docs-folder-icon" />
                            <span>{row.name}</span>
                            <span className="muted">
                              ({row.documentCount} doc{row.documentCount === 1 ? '' : 's'})
                            </span>
                          </button>
                        </td>
                        <td>
                          {canAdd ? (
                            <div className="data-grid__actions">
                              <DataGridIconBtn
                                icon={FaFolderPlus}
                                label="New subfolder"
                                onClick={() => openNewFolderForm(row.folderId)}
                              />
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })
                : null}
              {!loading
                ? rootDocuments.map((doc) => renderDocumentRow(doc, 0))
                : null}
            </tbody>
          </table>
        </div>
      </div>

      <AccessRightsModal
        open={Boolean(accessDoc)}
        document={accessDoc}
        onClose={() => setAccessDoc(null)}
        onError={setError}
      />
    </section>
  )
}
