import { smcStatusClass, formatSmcDate } from '../utils/socialMediaCompliance'

export default function SmcStatusBadge({ status }) {
  const label = status || 'Pending'
  return <span className={smcStatusClass(label)}>{label}</span>
}

export function SmcBarChart({ labels = [], data = [], title }) {
  const max = Math.max(1, ...data.map((n) => Number(n) || 0))

  if (!labels.length) {
    return <p className="muted">No data for this chart yet.</p>
  }

  return (
    <div className="smc-chart">
      {title && <h3>{title}</h3>}
      <div className="smc-chart-bars">
        {labels.map((label, i) => {
          const value = Number(data[i]) || 0
          const pct = Math.round((value / max) * 100)
          return (
            <div key={`${label}-${i}`} className="smc-chart-row">
              <div className="smc-chart-label" title={label}>
                {label}
              </div>
              <div className="smc-chart-track">
                <div className="smc-chart-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="smc-chart-value">{value}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SmcVersionCard({ version, isLatest }) {
  return (
    <article className={`smc-version ${isLatest ? 'is-latest' : ''}`}>
      <header className="smc-version-head">
        <strong>
          Version {version.version_number}
          {isLatest ? <span className="smc-latest-pill">Latest</span> : null}
        </strong>
        <SmcStatusBadge status={version.status} />
        <span className="muted">{formatSmcDate(version.submitted_at)}</span>
      </header>
      <div className="smc-version-body">
        <div>
          <p className="muted label">Description</p>
          <p className="smc-pre">{version.description || '—'}</p>
        </div>
        <div>
          <p className="muted label">Image</p>
          {version.image_url ? (
            <a href={version.image_url} target="_blank" rel="noreferrer" className="smc-thumb-link">
              <img src={version.image_url} alt={`Version ${version.version_number}`} className="smc-thumb" />
            </a>
          ) : (
            <p className="muted">No image</p>
          )}
        </div>
      </div>
      {version.reviewed_at && (
        <footer className="smc-version-foot">
          <SmcStatusBadge status={version.status} />
          <span className="muted">
            by <strong>{version.reviewed_by || 'Reviewer'}</strong> on{' '}
            {formatSmcDate(version.reviewed_at)}
          </span>
          {version.feedback ? <p className="smc-feedback">{version.feedback}</p> : null}
        </footer>
      )}
    </article>
  )
}
