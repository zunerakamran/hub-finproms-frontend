import { smcStatusClass } from '../utils/socialMediaCompliance'
import { useHub } from '../context/HubContext'
import { StatusWithDate } from './DataGrid'
import ComplianceStatusText from './ComplianceStatusText'
import RichTextDisplay from './RichTextDisplay'

export default function SmcStatusBadge({ status, at }) {
  const { complianceStatusLabel } = useHub()
  const raw = status || 'Pending'
  const badge = (
    <span className={smcStatusClass(raw)}>
      <ComplianceStatusText status={raw} label={complianceStatusLabel(raw)} />
    </span>
  )
  if (!at) return badge
  return <StatusWithDate badge={badge} at={at} />
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
  const mediaUrl = version.image_url
  const isVideo = mediaUrl && /\.(mp4|mov|webm)(\?|$)/i.test(mediaUrl)

  return (
    <article className={`smc-version ${isLatest ? 'is-latest' : ''}`}>
      <header className="smc-version-head">
        <strong>
          Version {version.version_number}
          {isLatest ? <span className="smc-latest-pill">Latest</span> : null}
        </strong>
        <SmcStatusBadge status={version.status} at={version.reviewed_at || version.submitted_at} />
      </header>
      <div className="smc-version-body">
        <div>
          <p className="muted label">Description</p>
          <RichTextDisplay html={version.description} className="smc-pre" />
        </div>
        <div>
          <p className="muted label">Attachment</p>
          {mediaUrl ? (
            <a
              href={mediaUrl}
              target="_blank"
              rel="noreferrer"
              className="smc-thumb-link"
              title="Open full size in new tab"
            >
              {isVideo ? (
                <video
                  src={mediaUrl}
                  className="smc-thumb"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={`Version ${version.version_number}`}
                  className="smc-thumb"
                />
              )}
            </a>
          ) : (
            <p className="muted">No attachment</p>
          )}
        </div>
      </div>
      {version.reviewed_at && (
        <footer className="smc-version-foot">
          <SmcStatusBadge status={version.status} at={version.reviewed_at} />
          <span className="muted">
            by <strong>{version.reviewed_by || 'Reviewer'}</strong>
          </span>
          {version.feedback ? (
            <RichTextDisplay html={version.feedback} className="smc-feedback" />
          ) : null}
        </footer>
      )}
    </article>
  )
}
