import { gcStatusClass, formatGcDate, formatGcFileSize } from '../utils/generalCompliance'

export default function GcStatusBadge({ status }) {
  const label = status || 'Pending'
  return <span className={gcStatusClass(label)}>{label}</span>
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

export function GcAttachmentList({ attachments = [] }) {
  if (!attachments.length) {
    return <p className="muted">No attachments</p>
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

export function GcVersionCard({ version, isLatest }) {
  return (
    <article className={`gc-version ${isLatest ? 'is-latest' : ''}`}>
      <header className="gc-version-head">
        <strong>
          Version {version.version_number}
          {isLatest ? <span className="gc-latest-pill">Latest</span> : null}
        </strong>
        <GcStatusBadge status={version.status} />
        <span className="muted">{formatGcDate(version.submitted_at)}</span>
      </header>
      <div className="gc-version-body">
        <div>
          <p className="muted label">Description</p>
          <p className="gc-pre">{version.description || '—'}</p>
        </div>
        <div>
          <p className="muted label">Attachments</p>
          <GcAttachmentList attachments={version.attachments || []} />
        </div>
      </div>
      {version.reviewed_at && (
        <footer className="gc-version-foot">
          <GcStatusBadge status={version.status} />
          <span className="muted">
            by <strong>{version.reviewed_by || 'Reviewer'}</strong> on{' '}
            {formatGcDate(version.reviewed_at)}
          </span>
          {version.feedback ? <p className="gc-feedback">{version.feedback}</p> : null}
        </footer>
      )}
    </article>
  )
}
