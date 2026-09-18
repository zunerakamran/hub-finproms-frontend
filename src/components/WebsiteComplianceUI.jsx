import {
  formatWcDate,
  wcStatusClass,
  wcVersionSectionNames,
} from '../utils/websiteCompliance'
import { useHub } from '../context/HubContext'
import ChangeRequestPreviewPanel from '../websiteCompliance/components/ChangeRequestPreviewPanel'

export default function WcStatusBadge({ status }) {
  const { complianceStatusLabel } = useHub()
  return <span className={wcStatusClass(status)}>{complianceStatusLabel(status)}</span>
}

export function WcVersionCard({ version, isLatest, requestId = null, request = null }) {
  const sectionNames = wcVersionSectionNames(version)
  const resolvedRequestId = requestId || request?.id || version?.request_id

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
      {resolvedRequestId && (
        <div className="wc-version-preview">
          <ChangeRequestPreviewPanel
            request={request}
            requestId={resolvedRequestId}
            version={version}
            historical
            compact
          />
        </div>
      )}
    </article>
  )
}
