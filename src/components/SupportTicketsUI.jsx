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
    return <p className="muted">No comments yet.</p>
  }

  return (
    <div className="stack" style={{ gap: '0.75rem' }}>
      {comments.map((comment) => (
        <article key={comment.id} className="card" style={{ padding: '0.85rem 1rem' }}>
          <div className="muted" style={{ marginBottom: '0.35rem' }}>
            <strong>{comment.author?.name || 'User'}</strong>
            {comment.is_staff_reply ? ' · Staff reply' : null}
            {comment.is_status_change && comment.to_status && (
              <>
                {' | '}
                {comment.from_status ? `${comment.from_status} → ` : ''}
                {comment.to_status}
              </>
            )}
            {comment.estimated_resolve_at ? (
              <>
                {' | ETA '}
                <DateTimeText value={comment.estimated_resolve_at} />
              </>
            ) : null}
            {comment.created_at && (
              <>
                {' | '}
                {formatStDateSafe(comment.created_at)}
              </>
            )}
          </div>
          <RichTextDisplay html={comment.body} />
          {Array.isArray(comment.attachments) && comment.attachments.length > 0 ? (
            <div style={{ marginTop: '0.65rem' }}>
              <StScreenshotList attachments={comment.attachments} emptyLabel="" />
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
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
      <p>
        <strong>{submitter.name || 'User'}</strong>
        {submitter.email ? ` (${submitter.email})` : ''}
        {submitter.role ? ` · ${submitter.role}` : ''}
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

  const moduleLabels =
    submitter.modules?.unrestricted
      ? ['All hub modules']
      : Array.isArray(submitter.modules?.labels) && submitter.modules.labels.length
        ? submitter.modules.labels
        : Array.isArray(submitter.modules?.effective_keys)
          ? submitter.modules.effective_keys
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
    <dl className="st-submitter-profile">
      <div>
        <dt>Name</dt>
        <dd>{submitter.name || '—'}</dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>{submitter.email || '—'}</dd>
      </div>
      <div>
        <dt>{orgLabel}</dt>
        <dd>{orgName || '—'}</dd>
      </div>
      <div>
        <dt>Roles</dt>
        <dd>{roles.length ? roles.join(', ') : '—'}</dd>
      </div>
      <div>
        <dt>Modules</dt>
        <dd>{moduleLabels.length ? moduleLabels.join(', ') : '—'}</dd>
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
      {statusBits.length ? (
        <div>
          <dt>Status</dt>
          <dd>{statusBits.join(' · ')}</dd>
        </div>
      ) : null}
    </dl>
  )
}
