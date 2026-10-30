import DateTimeText from './DateTimeText'
import { stStatusClass, formatStFileSize } from '../utils/supportTickets'
import { StatusWithDate } from './DataGrid'
import { SupportingFilesList } from './GeneralComplianceUI'
import RichTextDisplay from './RichTextDisplay'

export default function StStatusBadge({ status, at }) {
  const raw = status || 'Open'
  const badge = <span className={stStatusClass(raw)}>{raw}</span>
  if (!at) return badge
  return <StatusWithDate badge={badge} at={at} />
}

export function StScreenshotList({ attachments = [], emptyLabel = 'No screenshots' }) {
  return (
    <SupportingFilesList
      files={attachments}
      emptyLabel={emptyLabel}
      showUploader={false}
      accessMode="public"
      downloadMode="always"
      formatSize={formatStFileSize}
    />
  )
}

export function StCommentList({ comments = [] }) {
  if (!comments.length) {
    return <p className="muted">No activity yet.</p>
  }

  return (
    <div className="st-versions-list">
      {comments.map((comment, index) => {
        const isLatest = index === comments.length - 1
        return (
          <article
            key={comment.id}
            className={`st-version${isLatest ? ' is-latest' : ''}`}
          >
            <header className="st-version-head">
              <strong>
                {comment.author?.name || comment.author_name || 'User'}
                {comment.is_staff_reply ? (
                  <span className="st-latest-pill">Staff reply</span>
                ) : null}
                {isLatest ? <span className="st-latest-pill">Latest</span> : null}
              </strong>
              <div className="st-version-head__meta">
                {comment.is_status_change && comment.to_status ? (
                  <StStatusBadge status={comment.to_status} at={comment.created_at} />
                ) : comment.created_at ? (
                  <span className="muted">
                    <DateTimeText value={comment.created_at} />
                  </span>
                ) : null}
              </div>
            </header>

            <div className="st-version-body">
              {comment.from_status && comment.to_status ? (
                <div>
                  <p className="muted label">Status change</p>
                  <p>
                    {comment.from_status} → {comment.to_status}
                  </p>
                </div>
              ) : null}
              {comment.estimated_resolve_at ? (
                <div>
                  <p className="muted label">Estimated resolve</p>
                  <p>
                    <DateTimeText value={comment.estimated_resolve_at} />
                  </p>
                </div>
              ) : null}
              <div>
                <p className="muted label">
                  {comment.is_staff_reply ? 'Remarks' : 'Comment'}
                </p>
                <RichTextDisplay html={comment.body} className="st-pre" />
              </div>
              {Array.isArray(comment.attachments) && comment.attachments.length > 0 ? (
                <div>
                  <p className="muted label">Attachments</p>
                  <StScreenshotList attachments={comment.attachments} emptyLabel="" />
                </div>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
}

/**
 * Rich submitter profile for queue/detail viewers with st_view_all_tickets.
 */
export function StSubmitterProfile({ submitter, compact = false }) {
  if (!submitter) {
    return <p className="muted">Submitter unknown.</p>
  }

  if (!submitter.profile_detailed) {
    return (
      <p>
        <strong>{submitter.name || 'User'}</strong>
        {submitter.email ? ` (${submitter.email})` : ''}
      </p>
    )
  }

  const roles =
    Array.isArray(submitter.role_labels) && submitter.role_labels.length
      ? submitter.role_labels
      : Array.isArray(submitter.roles)
        ? submitter.roles
        : submitter.role_label
          ? [submitter.role_label]
          : []

  const orgKind = submitter.firm_or_network_kind || submitter.firm?.kind
  const orgLabel =
    orgKind === 'network' ? 'Network' : orgKind === 'firm' ? 'Firm' : 'Network / firm'
  const orgName = submitter.firm_or_network_name || submitter.firm?.name || null

  const statusBits = []
  if (submitter.is_suspended) statusBits.push('Suspended')
  if (submitter.is_discontinued) statusBits.push('Discontinued')
  if (submitter.is_advisor) statusBits.push('Advisor')

  if (compact) {
    return (
      <div className="st-submitter-compact">
        <div>
          <strong>{submitter.name || 'User'}</strong>
          {submitter.email ? (
            <span className="muted"> · {submitter.email}</span>
          ) : null}
        </div>
        {orgName ? (
          <div className="muted">
            {orgLabel}: {orgName}
          </div>
        ) : null}
        {roles.length ? (
          <div className="muted">Roles: {roles.join(', ')}</div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="st-person-card">
      <div className="st-person">
        <span className="st-avatar st-avatar--lg" aria-hidden="true">
          {initials(submitter.name)}
        </span>
        <div>
          <strong>{submitter.name || 'User'}</strong>
          {submitter.email ? (
            <div>
              <a href={`mailto:${submitter.email}`}>{submitter.email}</a>
            </div>
          ) : null}
          {statusBits.length ? (
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>
              {statusBits.join(' · ')}
            </p>
          ) : null}
        </div>
      </div>

      <div className="st-version-body" style={{ marginTop: '0.85rem' }}>
        <div>
          <p className="muted label">{orgLabel}</p>
          <p>{orgName || '—'}</p>
        </div>
        <div>
          <p className="muted label">Roles</p>
          <p>{roles.length ? roles.join(', ') : '—'}</p>
        </div>
        <div>
          <p className="muted label">Last login</p>
          <p>
            {submitter.last_login_at ? (
              <DateTimeText value={submitter.last_login_at} />
            ) : (
              'Never / unknown'
            )}
          </p>
        </div>
        <div>
          <p className="muted label">Account created</p>
          <p>
            {submitter.created_at ? <DateTimeText value={submitter.created_at} /> : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
