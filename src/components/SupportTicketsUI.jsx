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
            {comment.is_status_change && comment.to_status && (
              <>
                {' | '}
                {comment.from_status ? `${comment.from_status} → ` : ''}
                {comment.to_status}
              </>
            )}
            {comment.created_at && (
              <>
                {' | '}
                {formatStDateSafe(comment.created_at)}
              </>
            )}
          </div>
          <RichTextDisplay html={comment.body} />
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
