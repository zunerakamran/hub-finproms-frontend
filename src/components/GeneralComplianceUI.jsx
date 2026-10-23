import { useCallback, useEffect, useState } from 'react'
import { gcStatusClass, formatGcFileSize } from '../utils/generalCompliance'
import {
  resolveComplianceAttachments,
  resolveComplianceSupportingFiles,
  supportingFileRoleLabel,
} from '../utils/complianceSupportingFiles'
import {
  downloadComplianceFile,
  fileRowKey,
  loadFileForPreview,
  revokePreviewUrl,
} from '../utils/filePreviewActions'
import { useHub } from '../context/HubContext'
import AttachmentPreview from './AttachmentPreview'
import { StatusWithDate } from './DataGrid'
import ComplianceStatusText from './ComplianceStatusText'
import FileNameLabel from './FileNameLabel'
import RichTextDisplay from './RichTextDisplay'

/** GC-only download gate (API field + hub capability fallback). */
function gcFileAllowsDownload(file, can) {
  if (!file?.id) return false
  if (typeof file.can_download === 'boolean') return file.can_download
  return Boolean(can?.('gc_download_attachments'))
}

function fileAllowsDownload(file, can, downloadMode) {
  if (downloadMode === 'always') {
    return Boolean(file?.id || file?.file_url || file?.image_url || file?.url)
  }
  if (downloadMode === 'never') return false
  return gcFileAllowsDownload(file, can)
}

function fileCanOpen(file, accessMode) {
  if (accessMode === 'public') {
    return Boolean(file?.file_url || file?.image_url || file?.url)
  }
  return Boolean(file?.id)
}

export default function GcStatusBadge({ status, at }) {
  const { complianceStatusLabel } = useHub()
  const raw = status || 'Pending'
  const badge = (
    <span className={gcStatusClass(raw)}>
      <ComplianceStatusText status={raw} label={complianceStatusLabel(raw)} />
    </span>
  )
  if (!at) return badge
  return <StatusWithDate badge={badge} at={at} />
}

export function GcBarChart({ labels = [], data = [], title }) {
  const max = Math.max(1, ...data.map((n) => Number(n) || 0))

  if (!labels.length) {
    return <p className="muted">No data for this chart yet.</p>
  }

  return (
    <div className="gc-chart">
      {title && <h3>{title}</h3>}
      <div className="gc-chart-bars">
        {labels.map((label, i) => {
          const value = Number(data[i]) || 0
          const pct = Math.round((value / max) * 100)
          return (
            <div key={`${label}-${i}`} className="gc-chart-row">
              <div className="gc-chart-label" title={label}>
                {label}
              </div>
              <div className="gc-chart-track">
                <div className="gc-chart-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="gc-chart-value">{value}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Shared attachment / supporting-file list with in-app preview.
 *
 * @param {'gc'|'public'} accessMode — GC encrypted auth API vs public file_url
 * @param {'capability'|'always'|'never'} downloadMode — GC capability gate vs always allow Download in the preview modal
 */
export function GcAttachmentList({
  attachments = [],
  emptyLabel = 'No attachments',
  showUploader = false,
  accessMode = 'gc',
  downloadMode = 'capability',
  formatSize = formatGcFileSize,
}) {
  const { can } = useHub()
  const [busyKey, setBusyKey] = useState(null)
  const [busyKind, setBusyKind] = useState('') // 'preview' | 'download'
  const [error, setError] = useState('')
  // { file, url?, blob?, mimeType, filename, mode }
  const [preview, setPreview] = useState(null)

  const closePreview = useCallback(() => {
    setPreview((prev) => {
      revokePreviewUrl(prev)
      return null
    })
  }, [])

  useEffect(() => () => {
    revokePreviewUrl(preview)
  }, [preview])

  if (!attachments.length) {
    return <p className="muted">{emptyLabel}</p>
  }

  async function previewFile(file) {
    const key = fileRowKey(file)
    if (!fileCanOpen(file, accessMode) || busyKey) return
    setError('')
    setBusyKey(key)
    setBusyKind('preview')
    try {
      const next = await loadFileForPreview(file, accessMode)
      setPreview((prev) => {
        revokePreviewUrl(prev)
        return next
      })
    } catch (err) {
      setError(err?.message || 'Unable to preview file')
    } finally {
      setBusyKey(null)
      setBusyKind('')
    }
  }

  async function downloadFile(file) {
    const key = fileRowKey(file)
    if (busyKey) return
    if (!fileAllowsDownload(file, can, downloadMode)) {
      setError(
        accessMode === 'gc'
          ? 'Downloading Generic Compliance files is not enabled for your role on this hub.'
          : 'Download is not available for this file.'
      )
      return
    }
    setError('')
    setBusyKey(key)
    setBusyKind('download')
    try {
      await downloadComplianceFile(file, accessMode)
    } catch (err) {
      setError(err?.message || 'Unable to download file')
    } finally {
      setBusyKey(null)
      setBusyKind('')
    }
  }

  const previewAllowsDownload = preview?.file
    ? fileAllowsDownload(preview.file, can, downloadMode)
    : false

  return (
    <>
      <ul className="gc-attach-list">
        {error ? (
          <li className="gc-attach-error" role="alert">
            <p className="error">{error}</p>
          </li>
        ) : null}
        {attachments.map((file) => {
          const key = fileRowKey(file)
          const roleLabel = showUploader ? supportingFileRoleLabel(file) : null
          const byName = showUploader ? file.uploaded_by_name : null
          const canOpen = fileCanOpen(file, accessMode)
          const isBusy = busyKey === key
          return (
            <li key={key}>
              <div className="gc-attach-row">
                <FileNameLabel
                  name={file.original_name || file.name}
                  mimeType={file.mime_type}
                  onClick={canOpen ? () => previewFile(file) : undefined}
                  disabled={isBusy}
                  fallback={canOpen ? 'Preview' : 'File'}
                />
                {file.size_bytes != null && typeof formatSize === 'function' && (
                  <span className="muted"> ({formatSize(file.size_bytes)})</span>
                )}
                {isBusy && busyKind === 'preview' ? (
                  <span className="muted"> Opening…</span>
                ) : null}
              </div>
              {(roleLabel || byName) && (
                <p className="muted gc-attach-meta">
                  {roleLabel ? <span className="gc-attach-role">{roleLabel}</span> : null}
                  {roleLabel && byName ? ' | ' : null}
                  {byName ? <span>by {byName}</span> : null}
                </p>
              )}
            </li>
          )
        })}
      </ul>

      <AttachmentPreview
        open={Boolean(preview)}
        onClose={closePreview}
        url={preview?.url}
        blob={preview?.blob}
        mime={preview?.mimeType}
        name={preview?.filename}
        title="Preview"
        forceUnavailable={preview ? preview.mode === 'unavailable' : false}
        canDownload={previewAllowsDownload}
        onDownload={
          previewAllowsDownload && preview?.file
            ? () => downloadFile(preview.file)
            : undefined
        }
        downloading={
          busyKind === 'download' && preview?.file
            ? busyKey === fileRowKey(preview.file)
            : false
        }
      />
    </>
  )
}

export function SupportingFilesList({
  files = [],
  emptyLabel = 'No supporting files',
  showUploader = true,
  accessMode = 'gc',
  downloadMode = 'capability',
  formatSize = formatGcFileSize,
}) {
  return (
    <GcAttachmentList
      attachments={files}
      emptyLabel={emptyLabel}
      showUploader={showUploader}
      accessMode={accessMode}
      downloadMode={downloadMode}
      formatSize={formatSize}
    />
  )
}

export function GcVersionCard({ version, isLatest }) {
  const attachments = resolveComplianceAttachments(version)
  const supportingFiles = resolveComplianceSupportingFiles(version)

  return (
    <article className={`gc-version ${isLatest ? 'is-latest' : ''}`}>
      <header className="gc-version-head">
        <strong>
          Version {version.version_number}
          {isLatest ? <span className="gc-latest-pill">Latest</span> : null}
        </strong>
        <GcStatusBadge status={version.status} at={version.reviewed_at || version.submitted_at} />
      </header>
      <div className="gc-version-body">
        {version.content_type ? (
          <div>
            <p className="muted label">Content type</p>
            <p>{version.content_type}</p>
          </div>
        ) : null}
        <div>
          <p className="muted label">Description</p>
          <RichTextDisplay html={version.description} className="gc-pre" />
        </div>
        {attachments.length ? (
          <div>
            <p className="muted label">Attachments</p>
            <GcAttachmentList attachments={attachments} showUploader={false} />
          </div>
        ) : null}
        {supportingFiles.length ? (
          <div>
            <p className="muted label">Supporting files</p>
            <SupportingFilesList files={supportingFiles} />
          </div>
        ) : null}
      </div>
      {version.reviewed_at && (
        <footer className="gc-version-foot">
          <GcStatusBadge status={version.status} at={version.reviewed_at} />
          <span className="muted">
            by <strong>{version.reviewed_by || 'Reviewer'}</strong>
          </span>
          {version.feedback ? (
            <div>
              <p className="muted label">Remedial Feedback/notes</p>
              <RichTextDisplay html={version.feedback} className="gc-feedback" />
            </div>
          ) : null}
          {version.future_feedback ? (
            <div>
              <p className="muted label">Future Feedback/notes</p>
              <RichTextDisplay html={version.future_feedback} className="gc-feedback" />
            </div>
          ) : null}
        </footer>
      )}
    </article>
  )
}
