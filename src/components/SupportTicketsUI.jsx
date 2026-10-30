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
    return <p className="muted st-activity-empty">No activity yet.</p>
  }

  return (
    <ol className="st-activity">
      {comments.map((comment) => (
        <li key={comment.id} className="st-activity__item">
          <div className="st-activity__rail" aria-hidden="true" />
          <article className="st-activity__card">
            <header className="st-activity__head">
              <div className="st-activity__who">
                <span className="st-avatar" aria-hidden="true">
                  {initials(comment.author?.name || comment.author_name || 'U')}
                </span>
                <div>
                  <strong>{comment.author?.name || comment.author_name || 'User'}</strong>
                  <div className="st-activity__tags">
                    {comment.is_staff_reply ? (
                      <span className="st-tag st-tag--staff">Staff reply</span>
                    ) : null}
                    {comment.is_status_change && comment.to_status ? (
                      <span className="st-tag">
                        {comment.from_status ? `${comment.from_status} → ` : ''}
                        {comment.to_status}
                      </span>
                    ) : null}
                    {comment.estimated_resolve_at ? (
                      <span className="st-tag">
                        ETA <DateTimeText value={comment.estimated_resolve_at} />
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              {comment.created_at ? (
                <time className="muted st-activity__time" dateTime={comment.created_at}>
                  {formatStDateSafe(comment.created_at)}
                </time>
              ) : null}
            </header>
            <div className="st-activity__body">
              <RichTextDisplay html={comment.body} />
            </div>
            {Array.isArray(comment.attachments) && comment.attachments.length > 0 ? (
              <div className="st-activity__files">
                <StScreenshotList attachments={comment.attachments} emptyLabel="" />
              </div>
            ) : null}
          </article>
        </li>
      ))}
    </ol>
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

function formatStDateSafe(value) {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
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
      <div className="st-person">
        <span className="st-avatar st-avatar--lg" aria-hidden="true">
          {initials(submitter.name)}
        </span>
        <div>
          <strong>{submitter.name || 'User'}</strong>
          {submitter.email ? <div className="muted">{submitter.email}</div> : null}
        </div>
      </div>
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
        <div className="st-person__main">
          <strong className="st-person__name">{submitter.name || 'User'}</strong>
          {submitter.email ? (
            <a className="st-person__email" href={`mailto:${submitter.email}`}>
              {submitter.email}
            </a>
          ) : null}
          {statusBits.length ? (
            <div className="st-activity__tags" style={{ marginTop: '0.35rem' }}>
              {statusBits.map((bit) => (
                <span key={bit} className="st-tag st-tag--warn">
                  {bit}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <dl className="st-submitter-profile">
        <div>
          <dt>{orgLabel}</dt>
          <dd>{orgName || '—'}</dd>
        </div>
        <div>
          <dt>Roles</dt>
          <dd>{roles.length ? roles.join(', ') : '—'}</dd>
        </div>
        <div>
          <dt>Last login</dt>
          <dd>
            {submitter.last_login_at ? (
              <DateTimeText value={submitter.last_login_at} />
            ) : (
              'Never / unknown'
            )}
          </dd>
        </div>
        <div>
          <dt>Account created</dt>
          <dd>
            {submitter.created_at ? <DateTimeText value={submitter.created_at} /> : '—'}
          </dd>
        </div>
      </dl>
    </div>
  )
}
