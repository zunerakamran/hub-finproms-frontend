import { useEffect, useMemo, useState } from 'react'
import { FaArchive, FaBoxOpen, FaTrash, FaUpload, FaUsers } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
import FileDropzone from '../components/FileDropzone'
import { useHub } from '../context/HubContext'
import { COMPLIANCE_SUPPORTING_FILES_ACCEPT } from '../utils/complianceSupportingFiles'

const PER_PAGE = 50

export default function FirmDocuments() {
  const { can, actingHubId } = useHub()
  const [firms, setFirms] = useState([])
  const [firmId, setFirmId] = useState('')
  const [documents, setDocuments] = useState([])
  const [rights, setRights] = useState(null)
  const [scope, setScope] = useState('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [showRights, setShowRights] = useState(false)
  const [members, setMembers] = useState([])
  const [savingRightsUserId, setSavingRightsUserId] = useState(null)

  const selectedFirm = useMemo(
    () => firms.find((f) => String(f.id) === String(firmId)) || null,
    [firms, firmId]
  )

  const loadFirms = async () => {
    try {
      // Prefer firms list when user can manage/assign; otherwise rely on my-rights firm_id.
      let list = []
      try {
        const data = await api.listFirms({ page: 1, per_page: 100 })
        list = data.firms || []
      } catch {
        list = []
      }
      if (list.length === 0) {
        const mine = await api.firmDocumentsMyRights()
        if (mine.rights?.firm_id) {
          list = [{ id: mine.rights.firm_id, name: 'My firm' }]
        }
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
      setDocuments([])
      setRights(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.listFirmDocuments({
        firm_id: id,
        scope,
        per_page: PER_PAGE,
      })
      setDocuments(data.documents || [])
      setRights(data.rights || null)
      if (data.firm && !firms.some((f) => f.id === data.firm.id)) {
        setFirms((prev) => [...prev, data.firm])
      }
    } catch (err) {
      setError(err.message)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const loadMemberRights = async () => {
    if (!firmId) return
    try {
      const data = await api.firmDocumentMemberRights({ firm_id: firmId })
      setMembers(data.members || [])
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadFirms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingHubId])

  useEffect(() => {
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
      files.forEach((file) => formData.append('attachments[]', file))
      const data = await api.createFirmDocument(formData)
      setMessage(data.message || 'Document uploaded.')
      setShowUpload(false)
      setTitle('')
      setDescription('')
      setFiles([])
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

  const updateMemberRight = async (member, patch) => {
    if (member.is_firm_head) return
    setSavingRightsUserId(member.id)
    setError('')
    try {
      const next = {
        firm_id: Number(firmId),
        user_id: member.id,
        can_add: patch.can_add ?? member.can_add,
        can_view: patch.can_view ?? member.can_view,
        can_delete: patch.can_delete ?? member.can_delete,
        can_archive: patch.can_archive ?? member.can_archive,
      }
      await api.setFirmDocumentMemberRights(next)
      await loadMemberRights()
    } catch (err) {
      setError(err.data?.message || err.message)
    } finally {
      setSavingRightsUserId(null)
    }
  }

  const canAdd = rights?.can_add || can('firm_documents_add')
  const canManageRights = rights?.can_manage_member_rights || can('firm_documents_manage_member_rights')

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Firm documents</h1>
          <p className="muted">
            Attachments for your firm (images, Word, PDF, and more). The Head of Firm has all rights and
            can grant add / view / delete / archive to members.
          </p>
        </div>
        <div className="actions" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          {canManageRights ? (
            <button
              type="button"
              className="btn ghost"
              onClick={async () => {
                setShowRights((v) => !v)
                setShowUpload(false)
                if (!showRights) await loadMemberRights()
              }}
            >
              <FaUsers style={{ marginRight: 6 }} />
              Member rights
            </button>
          ) : null}
          {canAdd ? (
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setShowUpload((v) => !v)
                setShowRights(false)
              }}
            >
              <FaUpload style={{ marginRight: 6 }} />
              Upload
            </button>
          ) : null}
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="admin-form" style={{ marginBottom: '1rem' }}>
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
        <label>
          Show
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </label>
        {selectedFirm?.head_user ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Head of Firm: <strong>{selectedFirm.head_user.name}</strong> ({selectedFirm.head_user.email})
            {rights?.is_firm_head ? ' · You are the head' : ''}
          </p>
        ) : null}
      </div>

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
            <button type="button" className="btn ghost" onClick={() => setShowUpload(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {showRights ? (
        <div className="admin-form" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginTop: 0 }}>Member document rights</h2>
          <p className="muted">
            Grant add / view / delete / archive to firm members. The Head of Firm always has all rights.
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
                    disabled={row.is_firm_head || savingRightsUserId === row.id}
                    checked={Boolean(row.can_view)}
                    onChange={(e) => updateMemberRight(row, { can_view: e.target.checked })}
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
                    disabled={row.is_firm_head || savingRightsUserId === row.id}
                    checked={Boolean(row.can_add)}
                    onChange={(e) => updateMemberRight(row, { can_add: e.target.checked })}
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
                    disabled={row.is_firm_head || savingRightsUserId === row.id}
                    checked={Boolean(row.can_archive)}
                    onChange={(e) => updateMemberRight(row, { can_archive: e.target.checked })}
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
                    disabled={row.is_firm_head || savingRightsUserId === row.id}
                    checked={Boolean(row.can_delete)}
                    onChange={(e) => updateMemberRight(row, { can_delete: e.target.checked })}
                  />
                ),
              },
            ]}
            rows={members}
            loading={false}
            emptyMessage="No firm members yet."
            getRowKey={(row) => row.id}
          />
        </div>
      ) : null}

      <DataGrid
        columns={[
          {
            key: 'title',
            label: 'Document',
            grow: true,
            render: (row) => (
              <div>
                <strong>{row.title}</strong>
                {row.is_archived ? <span className="muted"> · Archived</span> : null}
                {row.description ? <div className="muted">{row.description}</div> : null}
              </div>
            ),
          },
          {
            key: 'attachments',
            label: 'Files',
            grow: true,
            render: (row) =>
              (row.attachments || []).length ? (
                <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                  {row.attachments.map((file) => (
                    <li key={file.id}>
                      <a href={file.file_url} target="_blank" rel="noreferrer">
                        {file.original_name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="muted">—</span>
              ),
          },
          {
            key: 'uploader',
            label: 'Uploaded by',
            fit: true,
            render: (row) => row.uploader?.name || '—',
          },
        ]}
        rows={documents}
        loading={loading}
        emptyMessage={firmId ? 'No documents yet.' : 'Select a firm to view documents.'}
        getRowKey={(row) => row.id}
        actions={(row) => (
          <>
            {(rights?.can_archive || can('firm_documents_archive')) && (
              <DataGridIconBtn
                icon={row.is_archived ? FaBoxOpen : FaArchive}
                label={row.is_archived ? 'Unarchive' : 'Archive'}
                onClick={() => toggleArchive(row)}
              />
            )}
            {(rights?.can_delete || can('firm_documents_delete')) && (
              <DataGridIconBtn
                icon={FaTrash}
                label="Delete"
                variant="danger"
                onClick={() => deleteDoc(row)}
              />
            )}
          </>
        )}
      />
    </section>
  )
}
