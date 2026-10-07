import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FaArchive,
  FaBoxOpen,
  FaChevronDown,
  FaChevronRight,
  FaFolder,
  FaKey,
  FaTimes,
  FaTrash,
  FaUpload,
} from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
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
      children: folder.children || [],
      documents: folder.documents || [],
    })
    rows.push(...flattenFolders(folder.children || [], depth + 1, nextPath))
  }
  return rows
}

function AccessRightsModal({ open, onClose, document, firmId, onError }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [savingUserId, setSavingUserId] = useState(null)

  useEffect(() => {
    if (!open || !document?.id) return undefined
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await api.firmDocumentAccessRights(document.id)
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
  }, [open, document?.id, onClose, onError])

  const updateRight = async (member, patch) => {
    if (member.is_firm_head) return
    setSavingUserId(member.id)
    try {
      const next = {
        user_id: member.id,
        can_add: patch.can_add ?? member.can_add,
        can_view: patch.can_view ?? member.can_view,
        can_delete: patch.can_delete ?? member.can_delete,
        can_archive: patch.can_archive ?? member.can_archive,
      }
      await api.setFirmDocumentAccessRights(document.id, next)
      const data = await api.firmDocumentAccessRights(document.id)
      setMembers(data.members || [])
    } catch (err) {
      onError?.(err.data?.message || err.message)
    } finally {
      setSavingUserId(null)
    }
  }

  if (!open || typeof window === 'undefined') return null

  return createPortal(
    <div className="compliance-audit-modal" role="presentation">
      <button
        type="button"
        className="compliance-audit-modal__backdrop"
        aria-label="Close access rights"
        onClick={onClose}
      />
      <div
        className="compliance-audit-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Document access rights"
      >
        <div className="compliance-audit-modal__head">
          <div>
            <h3>Access rights</h3>
            <p className="muted">
              {document?.title}
              {firmId ? ` · Firm #${firmId}` : ''}
            </p>
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
            Grant view / add / delete / archive for this document only. The Head of Firm always has
            all rights.
          </p>
          <DataGrid
            columns={[
              {
                key: 'name',
                label: 'Member',
                grow: true,
                render: (row) => (
                  <strong>
                    {row.name}
                    {row.is_firm_head ? <span className="muted"> · Head</span> : null}
                  </strong>
                ),
              },
              {
                key: 'can_view',
                label: 'View',
                fit: true,
                render: (row) => (
                  <input
                    type="checkbox"
                    disabled={row.is_firm_head || savingUserId === row.id}
                    checked={Boolean(row.can_view)}
                    onChange={(e) => updateRight(row, { can_view: e.target.checked })}
                  />
                ),
              },
              {
                key: 'can_add',
                label: 'Add',
                fit: true,
                render: (row) => (
                  <input
                    type="checkbox"
                    disabled={row.is_firm_head || savingUserId === row.id}
                    checked={Boolean(row.can_add)}
                    onChange={(e) => updateRight(row, { can_add: e.target.checked })}
                  />
                ),
              },
              {
                key: 'can_archive',
                label: 'Archive',
                fit: true,
                render: (row) => (
                  <input
                    type="checkbox"
                    disabled={row.is_firm_head || savingUserId === row.id}
                    checked={Boolean(row.can_archive)}
                    onChange={(e) => updateRight(row, { can_archive: e.target.checked })}
                  />
                ),
              },
              {
                key: 'can_delete',
                label: 'Delete',
                fit: true,
                render: (row) => (
                  <input
                    type="checkbox"
                    disabled={row.is_firm_head || savingUserId === row.id}
                    checked={Boolean(row.can_delete)}
                    onChange={(e) => updateRight(row, { can_delete: e.target.checked })}
                  />
                ),
              },
            ]}
            rows={members}
            loading={loading}
            emptyMessage="No firm members yet."
            getRowKey={(row) => row.id}
          />
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
  const [unfiledDocuments, setUnfiledDocuments] = useState([])
  const [flatFolderOptions, setFlatFolderOptions] = useState([])
  const [categories, setCategories] = useState([])
  const [rights, setRights] = useState(null)
  const [scope, setScope] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([])
  const [folderMode, setFolderMode] = useState('existing')
  const [folderId, setFolderId] = useState('')
  const [folderName, setFolderName] = useState('')
  const [parentFolderId, setParentFolderId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
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
      if (!firmId && list[0]) {
        setFirmId(String(list[0].id))
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const loadDocuments = async (id = firmId) => {
    if (!id) {
      setFolders([])
      setUnfiledDocuments([])
      setFlatFolderOptions([])
      setRights(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [data, cats, folderList] = await Promise.all([
        api.listFirmDocuments({ firm_id: id, scope }),
        api.firmDocumentCategories().catch(() => ({ categories: [] })),
        api.listFirmDocumentFolders({ firm_id: id }).catch(() => ({ folders: [] })),
      ])
      setFolders(data.folders || [])
      // White-label acting hub may still return a flat `documents` list.
      setUnfiledDocuments(
        data.unfiled_documents ||
          (data.folders ? [] : data.documents) ||
          []
      )
      setRights(data.rights || null)
      setCategories(cats.categories || [])
      setFlatFolderOptions(folderList.folders || [])
      // Expand all folders by default on first load of a firm.
      setExpanded((prev) => {
        if (prev.size > 0) return prev
        const next = new Set()
        flattenFolders(data.folders || []).forEach((row) => next.add(row.id))
        return next
      })
      if (data.firm) {
        setFirms((prev) => {
          if (isFirmHead || prev.length <= 1) {
            return [data.firm]
          }
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
      setUnfiledDocuments([])
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
  }, [firmId, scope, actingHubId])

  const onUpload = async (e) => {
    e.preventDefault()
    if (!files.length) {
      setError('Add at least one file.')
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
      if (folderMode === 'existing' && folderId) {
        formData.append('folder_id', folderId)
      } else if (folderMode === 'new' && folderName.trim()) {
        formData.append('folder_name', folderName.trim())
        if (parentFolderId) formData.append('parent_folder_id', parentFolderId)
      }
      files.forEach((file) => formData.append('attachments[]', file))
      const data = await api.createFirmDocument(formData)
      setMessage(data.message || 'Document uploaded.')
      setShowUpload(false)
      setTitle('')
      setDescription('')
      setFiles([])
      setFolderId('')
      setFolderName('')
      setParentFolderId('')
      setCategoryId('')
      setFolderMode('existing')
      await loadDocuments()
    } catch (err) {
      setError(err.data?.message || err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleArchive = async (doc) => {
    try {
      if (doc.is_archived) {
        await api.unarchiveFirmDocument(doc.id)
      } else {
        await api.archiveFirmDocument(doc.id)
      }
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

  const renderDocumentRow = (doc, depth) => (
    <tr key={`doc-${doc.id}`} className="data-grid__row">
      <td style={{ paddingLeft: `${1 + depth * 1.25}rem` }}>
        <div>
          <strong>{doc.title}</strong>
          {doc.is_archived ? <span className="muted"> · Archived</span> : null}
          {doc.description ? <div className="muted">{doc.description}</div> : null}
        </div>
      </td>
      <td>{doc.category?.name || '—'}</td>
      <td>
        {(doc.attachments || []).length ? (
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {doc.attachments.map((file) => (
              <li key={file.id}>
                <a href={file.file_url} target="_blank" rel="noreferrer">
                  {file.original_name}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
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
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Firm documents</h1>
          <p className="muted">
            Folders, categories, and per-document access. The Head of Firm has all rights and can
            grant access on each document via the key icon.
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}
      {rights && rights.functionality_enabled === false && !rights.is_firm_head ? (
        <div className="alert">
          Hub-wide firm document tools are off. A Power Admin can enable{' '}
          <strong>Functionalities → Firm documents</strong> on this hub (from Central, with
          remote DB wiring) for all-firms matrix access. Head of Firm still has access to
          their own firm’s documents.
        </div>
      ) : null}

      <div className="admin-form" style={{ marginBottom: '1rem' }}>
        {showFirmPicker ? (
          <label>
            Firm
            <select value={firmId} onChange={(e) => setFirmId(e.target.value)}>
              <option value="">Select a firm</option>
              {firms.map((firm) => (
                <option key={firm.id} value={firm.id}>
                  {firm.name}
                  {firm.head_user?.name ? ` · Head: ${firm.head_user.name}` : ''}
                </option>
              ))}
            </select>
          </label>
        ) : selectedFirm || firmId ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Firm: <strong>{selectedFirm?.name || 'My firm'}</strong>
            {isFirmHead ? ' · You are the Head of Firm' : ''}
          </p>
        ) : null}
        <label>
          Show
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">All</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        {showFirmPicker && selectedFirm?.head_user ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Head of Firm: <strong>{selectedFirm.head_user.name}</strong> (
            {selectedFirm.head_user.email})
          </p>
        ) : null}
      </div>

      {functionalityEnabled && canAdd ? (
        <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn primary"
            onClick={() => setShowUpload((v) => !v)}
          >
            <FaUpload style={{ marginRight: 6 }} />
            Upload new document
          </button>
        </div>
      ) : null}

      {showUpload ? (
        <form className="admin-form" onSubmit={onUpload} style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginTop: 0 }}>Upload document</h2>
          <label>
            Title
            <input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Description (optional)
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
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
          {categories.length === 0 ? (
            <p className="muted">
              No categories yet. An admin with <strong>Manage firm document categories</strong> can
              add them.
            </p>
          ) : null}
          <label>
            Folder
            <select
              value={folderMode}
              onChange={(e) => setFolderMode(e.target.value)}
            >
              <option value="none">No folder (unfiled)</option>
              <option value="existing">Existing folder</option>
              <option value="new">Create new folder</option>
            </select>
          </label>
          {folderMode === 'existing' ? (
            <label>
              Choose folder
              <select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
                <option value="">Select a folder</option>
                {flatFolderOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.parent_id ? `↳ ${f.name}` : f.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {folderMode === 'new' ? (
            <>
              <label>
                New folder name
                <input
                  required
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g. Policies"
                />
              </label>
              <label>
                Parent folder (optional — for subfolder)
                <select
                  value={parentFolderId}
                  onChange={(e) => setParentFolderId(e.target.value)}
                >
                  <option value="">Root level</option>
                  {flatFolderOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          <FileDropzone
            accept={COMPLIANCE_SUPPORTING_FILES_ACCEPT}
            multiple
            files={files}
            onChange={setFiles}
            label="Attachments (PDF, Word, images, etc.)"
          />
          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Uploading…' : 'Upload'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setShowUpload(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="data-grid">
        <table className="data-grid__table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Files</th>
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
            {!loading && visibleFolderRows.length === 0 && unfiledDocuments.length === 0 ? (
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
                    <tr key={row.id} className="data-grid__row">
                      <td
                        colSpan={5}
                        style={{ paddingLeft: `${1 + row.depth * 1.25}rem`, fontWeight: 600 }}
                      >
                        <button
                          type="button"
                          className="btn ghost"
                          style={{ padding: '0.15rem 0.4rem', marginRight: 6 }}
                          onClick={() => toggleExpand(row.id)}
                          aria-label={isOpen ? 'Collapse folder' : 'Expand folder'}
                        >
                          {isOpen ? <FaChevronDown /> : <FaChevronRight />}
                        </button>
                        <FaFolder style={{ marginRight: 8, opacity: 0.75 }} />
                        {row.name}
                        <span className="muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                          ({row.documentCount} doc{row.documentCount === 1 ? '' : 's'})
                        </span>
                      </td>
                    </tr>
                  )
                })
              : null}
            {!loading && unfiledDocuments.length > 0 ? (
              <>
                <tr className="data-grid__row">
                  <td colSpan={5} style={{ fontWeight: 600 }}>
                    <FaFolder style={{ marginRight: 8, opacity: 0.5 }} />
                    Unfiled
                  </td>
                </tr>
                {unfiledDocuments.map((doc) => renderDocumentRow(doc, 1))}
              </>
            ) : null}
          </tbody>
        </table>
      </div>

      <AccessRightsModal
        open={Boolean(accessDoc)}
        document={accessDoc}
        firmId={firmId}
        onClose={() => setAccessDoc(null)}
        onError={setError}
      />
    </section>
  )
}
