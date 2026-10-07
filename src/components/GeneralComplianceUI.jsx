import { gcStatusClass, formatGcFileSize } from '../utils/generalCompliance'
import {
  resolveComplianceAttachments,
  resolveComplianceSupportingFiles,
  supportingFileRoleLabel,
} from '../utils/complianceSupportingFiles'
import { useHub } from '../context/HubContext'
import { StatusWithDate } from './DataGrid'
import ComplianceStatusText from './ComplianceStatusText'
import FileNameLabel from './FileNameLabel'
import RichTextDisplay from './RichTextDisplay'

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

export function GcAttachmentList({
  attachments = [],
  emptyLabel = 'No attachments',
  showUploader = false,
}) {
  if (!attachments.length) {
    return <p className="muted">{emptyLabel}</p>
  }

  return (
    <ul className="gc-attach-list">
      {attachments.map((file) => {
        const roleLabel = showUploader ? supportingFileRoleLabel(file) : null
        const byName = showUploader ? file.uploaded_by_name : null
        return (
          <li key={file.id || `${file.original_name}-${file.file_path}`}>
            <div className="gc-attach-row">
              <FileNameLabel
                name={file.original_name}
                mimeType={file.mime_type}
                href={file.file_url || undefined}
                fallback={file.file_url ? 'Download' : 'File'}
              />
              {file.size_bytes != null && (
                <span className="muted"> ({formatGcFileSize(file.size_bytes)})</span>
              )}
            </div>
            {(roleLabel || byName) && (
              <p className="muted gc-attach-meta">
                {roleLabel ? <span className="gc-attach-role">{roleLabel}</span> : null}
                {roleLabel && byName ? ' · ' : null}
                {byName ? <span>by {byName}</span> : null}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function SupportingFilesList({
  files = [],
  emptyLabel = 'No supporting files',
  showUploader = true,
}) {
  return (
    <GcAttachmentList
      attachments={files}
      emptyLabel={emptyLabel}
      showUploader={showUploader}
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
