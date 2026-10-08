import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import FileNameLabel from '../components/FileNameLabel'
import PageLoader from '../components/PageLoader'
import { useHub } from '../context/HubContext'

function formatBytes(n) {
  const size = Number(n)
  if (!Number.isFinite(size) || size < 0) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return String(iso)
  }
}

export default function FirmDocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { actingHubId } = useHub()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [firm, setFirm] = useState(null)
  const [document, setDocument] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await api.getFirmDocument(id)
        if (cancelled) return
        setFirm(data.firm || null)
        setDocument(data.document || null)
      } catch (err) {
        if (cancelled) return
        setError(err.data?.message || err.message || 'Failed to load document.')
        setFirm(null)
        setDocument(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, actingHubId])

  if (loading) {
    return <PageLoader />
  }

  if (error || !document) {
    return (
      <section className="firm-docs-page">
        <div className="page-head">
          <div>
            <p className="eyebrow">Firm documents</p>
            <h1>Document</h1>
          </div>
          <Link className="btn ghost" to="/my-dashboard/firm-documents">
            ← Back to Firm documents
          </Link>
        </div>
        <div className="alert">{error || 'Document not found.'}</div>
      </section>
    )
  }

  const attachments = document.attachments || []

  return (
    <section className="firm-docs-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Firm documents</p>
          <h1>{document.title}</h1>
          <p className="muted">
            {firm?.name ? `${firm.name}` : 'Firm document'}
            {document.is_archived ? ' · Archived' : ''}
          </p>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={() => navigate('/my-dashboard/firm-documents')}
        >
          ← Back to Firm documents
        </button>
      </div>

      <div className="admin-form firm-docs-panel firm-docs-detail">
        <dl className="firm-docs-detail__grid">
          <div>
            <dt>Title</dt>
            <dd>{document.title}</dd>
          </div>
          <div>
            <dt>Firm</dt>
            <dd>{firm?.name || '—'}</dd>
          </div>
          <div>
            <dt>Folder</dt>
            <dd>{document.folder?.name || 'Unfiled'}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{document.category?.name || '—'}</dd>
          </div>
          <div>
            <dt>Uploaded by</dt>
            <dd>
              {document.uploader?.name || '—'}
              {document.uploader?.email ? (
                <span className="muted"> · {document.uploader.email}</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{document.is_archived ? 'Archived' : 'Active'}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatWhen(document.created_at)}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatWhen(document.updated_at)}</dd>
          </div>
          <div className="firm-docs-detail__full">
            <dt>Description</dt>
            <dd>
              {document.description ? (
                document.description
              ) : (
                <span className="muted">No description</span>
              )}
            </dd>
          </div>
        </dl>

        <h2 className="firm-docs-detail__files-title">Attachments</h2>
        {attachments.length === 0 ? (
          <p className="muted">No files attached.</p>
        ) : (
          <ul className="firm-docs-detail__files">
            {attachments.map((file) => (
              <li key={file.id}>
                <FileNameLabel
                  name={file.original_name}
                  mimeType={file.mime_type}
                  href={file.file_url}
                  fallback="Download"
                />
                <span className="muted firm-docs-detail__meta">
                  {file.mime_type || 'file'} · {formatBytes(file.size_bytes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
