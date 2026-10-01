import { wcStatusClass, wcVersionSectionNames } from '../utils/websiteCompliance'
import { useHub } from '../context/HubContext'
import ChangeRequestPreviewPanel from '../websiteCompliance/components/ChangeRequestPreviewPanel'
import { StatusWithDate } from './DataGrid'
import ComplianceStatusText from './ComplianceStatusText'
import RichTextDisplay from './RichTextDisplay'
import { SupportingFilesList } from './GeneralComplianceUI'
import { resolveComplianceSupportingFiles } from '../utils/complianceSupportingFiles'

export default function WcStatusBadge({ status, at }) {
  const { complianceStatusLabel } = useHub()
  const badge = (
    <span className={wcStatusClass(status)}>
      <ComplianceStatusText status={status} label={complianceStatusLabel(status)} />
    </span>
  )
  if (!at) return badge
  return <StatusWithDate badge={badge} at={at} />
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
        <WcStatusBadge status={version.status} at={version.reviewed_at || version.submitted_at} />
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
        {resolveComplianceSupportingFiles(version).length ? (
          <div>
            <p className="muted label">Supporting files</p>
            <SupportingFilesList files={resolveComplianceSupportingFiles(version)} />
          </div>
        ) : null}
      </div>
      {(version.reviewed_at || version.feedback) && (
        <footer className="wc-version-foot">
          {version.reviewed_at && (
            <>
              <WcStatusBadge status={version.status} at={version.reviewed_at} />
              <span className="muted">
                by <strong>{version.reviewed_by || 'Reviewer'}</strong>
              </span>
            </>
          )}
          {version.feedback ? (
            <RichTextDisplay html={version.feedback} className="wc-feedback" />
          ) : null}
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
