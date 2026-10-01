import { gcStatusClass, formatGcFileSize } from '../utils/generalCompliance'
import { resolveComplianceSupportingFiles } from '../utils/complianceSupportingFiles'
import { useHub } from '../context/HubContext'
import { StatusWithDate } from './DataGrid'
import ComplianceStatusText from './ComplianceStatusText'
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

export function GcAttachmentList({ attachments = [], emptyLabel = 'No attachments' }) {
  if (!attachments.length) {
    return <p className="muted">{emptyLabel}</p>
  }

  return (
    <ul className="gc-attach-list">
      {attachments.map((file) => (
        <li key={file.id || `${file.original_name}-${file.file_path}`}>
          {file.file_url ? (
            <a href={file.file_url} target="_blank" rel="noreferrer">
              {file.original_name || 'Download'}
            </a>
          ) : (
            <span>{file.original_name || 'File'}</span>
          )}
          {file.size_bytes != null && (
            <span className="muted"> ({formatGcFileSize(file.size_bytes)})</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function SupportingFilesList({ files = [], emptyLabel = 'No supporting files' }) {
  return <GcAttachmentList attachments={files} emptyLabel={emptyLabel} />
}

export function GcVersionCard({ version, isLatest }) {
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
        <div>
          <p className="muted label">Supporting files</p>
          <SupportingFilesList files={resolveComplianceSupportingFiles(version)} />
        </div>
      </div>
      {version.reviewed_at && (
        <footer className="gc-version-foot">
          <GcStatusBadge status={version.status} at={version.reviewed_at} />
          <span className="muted">
            by <strong>{version.reviewed_by || 'Reviewer'}</strong>
          </span>
          {version.feedback ? (
            <RichTextDisplay html={version.feedback} className="gc-feedback" />
          ) : null}
        </footer>
      )}
    </article>
  )
}
