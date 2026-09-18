import {
  formatWcDate,
  wcStatusClass,
  wcStatusLabel,
  wcVersionSectionNames,
} from '../utils/websiteCompliance'

export default function WcStatusBadge({ status }) {
  return <span className={wcStatusClass(status)}>{wcStatusLabel(status)}</span>
}

export function WcVersionCard({ version, isLatest }) {
  const sectionNames = wcVersionSectionNames(version)

  return (
    <article className={`wc-version ${isLatest ? 'is-latest' : ''}`}>
      <header className="wc-version-head">
        <strong>
          Version {version.version_number}
          {isLatest ? <span className="wc-latest-pill">Latest</span> : null}
        </strong>
        <WcStatusBadge status={version.status} />
        <span className="muted">{formatWcDate(version.submitted_at)}</span>
      </header>
      <div className="wc-version-body">
        <div>
          <p className="muted label">Sections</p>
          {sectionNames.length ? (
            <ul className="wc-section-list">
              {sectionNames.map((name, index) => (
                <li key={`${name}-${index}`}>{name}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No section details</p>
          )}
        </div>
        <div>
          <p className="muted label">Submitted by</p>
          <p className="wc-pre">{version.submitted_by || '—'}</p>
        </div>
      </div>
      {(version.reviewed_at || version.feedback) && (
        <footer className="wc-version-foot">
          {version.reviewed_at && (
            <>
              <WcStatusBadge status={version.status} />
              <span className="muted">
                by <strong>{version.reviewed_by || 'Reviewer'}</strong> on{' '}
                {formatWcDate(version.reviewed_at)}
              </span>
            </>
          )}
          {version.feedback ? <p className="wc-feedback">{version.feedback}</p> : null}
        </footer>
      )}
    </article>
  )
}
