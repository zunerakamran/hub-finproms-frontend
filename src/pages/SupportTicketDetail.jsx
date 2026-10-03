import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api/client'
import DateTimeText from '../components/DateTimeText'
import FileDropzone from '../components/FileDropzone'
import RequiredMark from '../components/RequiredMark'
import RichTextDisplay from '../components/RichTextDisplay'
import RichTextEditor, { isRichTextEmpty } from '../components/RichTextEditor'
import StStatusBadge, { StCommentList, StScreenshotList } from '../components/SupportTicketsUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import {
  appendScreenshots,
  ST_SCREENSHOT_ACCEPT,
  ST_STATUSES,
} from '../utils/supportTickets'

export default function SupportTicketDetail() {
  const { id } = useParams()
  const location = useLocation()
  const { user, isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, effectiveAdvisorId } = useHub()

  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const [changeStatus, setChangeStatus] = useState('Open')
  const [changeComment, setChangeComment] = useState('')
  const [statusFiles, setStatusFiles] = useState([])
  const [commentBody, setCommentBody] = useState('')
  const [commentFiles, setCommentFiles] = useState([])

  const moduleOn = can('module_support_tickets')
  const canChangeStatus = can('st_change_ticket_status')
  const canViewAll = can('st_view_all_tickets') || canChangeStatus
  const canComment =
    can('st_comment_on_tickets') || canChangeStatus || can('st_submit_ticket')
  const asPowerAdmin = isPowerAdmin

  const backFrom = location.state?.from
  const backTo =
    backFrom === 'queue'
      ? '/my-dashboard/support-tickets/queue'
      : backFrom === 'mine' || backFrom === 'submit'
        ? '/my-dashboard/support-tickets'
        : canViewAll
          ? '/my-dashboard/support-tickets/queue'
          : '/my-dashboard/support-tickets'
  const backLabel = backTo.endsWith('/queue') ? '← Back to queue' : '← Back to my tickets'

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      let data
      if (canViewAll) {
        try {
          data = await api.supportTicketsAdminShow(id, { asPowerAdmin })
        } catch {
          data = await api.supportTicketsShow(id)
        }
      } else {
        data = await api.supportTicketsShow(id)
      }
      const item = data.data
      setRow(item)
      setChangeStatus(item.status || 'Open')
      setChangeComment('')
      setStatusFiles([])
      setCommentBody('')
      setCommentFiles([])
    } catch (err) {
      setError(err.message || 'Failed to load ticket.')
      setRow(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading || !moduleOn) {
      setLoading(false)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, hubLoading, moduleOn, effectiveAdvisorId])

  const isOwner =
    row &&
    user &&
    (Number(row.user_id) === Number(user.id) ||
      (effectiveAdvisorId != null && Number(row.user_id) === Number(effectiveAdvisorId)))

  const saveStatus = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const form = new FormData()
      form.append('status', changeStatus)
      if (changeComment.trim()) form.append('comment', changeComment.trim())
      appendScreenshots(form, statusFiles)
      const data = await api.supportTicketsChangeStatus(id, form, { asPowerAdmin })
      setRow(data.data)
      setMessage('Status updated.')
      setChangeComment('')
      setStatusFiles([])
    } catch (err) {
      setError(err.message || 'Could not update status.')
    } finally {
      setSaving(false)
    }
  }

  const saveComment = async (event) => {
    event.preventDefault()
    if (isRichTextEmpty(commentBody)) {
      setError('Comment cannot be empty.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const form = new FormData()
      form.append('body', commentBody)
      appendScreenshots(form, commentFiles)
      const data = canViewAll
        ? await api.supportTicketsAdminComment(id, form, { asPowerAdmin }).catch(() =>
            api.supportTicketsComment(id, form)
          )
        : await api.supportTicketsComment(id, form)
      setRow(data.data)
      setMessage('Comment added.')
      setCommentBody('')
      setCommentFiles([])
    } catch (err) {
      setError(err.message || 'Could not add comment.')
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Support Tickets</p>
            <h1>Ticket</h1>
            <p className="muted">Support Tickets module is off for this hub.</p>
          </div>
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section>
        <p className="muted">Loading ticket…</p>
      </section>
    )
  }

  if (!row) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Support Tickets</p>
            <h1>Ticket</h1>
            {error && <div className="alert">{error}</div>}
          </div>
          <Link to={backTo} className="btn ghost">
            {backLabel}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Support Tickets</p>
          <h1>
            Ticket #{row.id}: {row.subject}
          </h1>
          <p className="muted">
            <StStatusBadge status={row.status} at={row.status_changed_at || row.updated_at} />
            {' · '}
            {row.module_area_label || row.module_area}
            {' · '}
            {row.priority_label || row.priority}
            {' · '}
            {row.category_label || row.category}
          </p>
        </div>
        <Link to={backTo} className="btn ghost">
          {backLabel}
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="stack" style={{ gap: '1.25rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Details</h2>
          <p>
            <strong>Submitted by:</strong> {row.submitter?.name || '—'}
            {row.submitter?.email ? ` (${row.submitter.email})` : ''}
          </p>
          <p>
            <strong>Submitted:</strong> <DateTimeText value={row.created_at} />
          </p>
          {row.page_url && (
            <p>
              <strong>Page URL:</strong>{' '}
              <a href={row.page_url} target="_blank" rel="noreferrer">
                {row.page_url}
              </a>
            </p>
          )}
          {row.status_note && (
            <p>
              <strong>Latest note:</strong> {row.status_note}
            </p>
          )}
          <h3>Issue</h3>
          <RichTextDisplay html={row.description} />
          <h3>Screenshots</h3>
          <StScreenshotList attachments={row.attachments || []} />
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Activity</h2>
          <StCommentList comments={row.comments || []} />
        </div>

        {canChangeStatus && (
          <form className="admin-form card" style={{ padding: '1rem 1.25rem' }} onSubmit={saveStatus}>
            <h2 style={{ marginTop: 0 }}>Update status</h2>
            <fieldset>
              <legend>
                <RequiredMark>Status</RequiredMark>
              </legend>
              <div className="radio-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {ST_STATUSES.map((status) => (
                  <label key={status} style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                    <input
                      type="radio"
                      name="st-status"
                      value={status}
                      checked={changeStatus === status}
                      onChange={() => setChangeStatus(status)}
                    />
                    {status}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="admin-field">
              <span className="field-label-text">Note (optional)</span>
              <RichTextEditor
                rows={4}
                value={changeComment}
                onChange={setChangeComment}
                placeholder="What did you fix / what should the user do next?"
              />
            </div>
            <FileDropzone
              id="st-status-screenshots"
              label="Attach screenshots (optional)"
              accept={ST_SCREENSHOT_ACCEPT}
              multiple
              maxFiles={8}
              files={statusFiles}
              onChange={setStatusFiles}
            />
            <div className="actions">
              <button className="btn primary" disabled={saving}>
                {saving ? 'Saving…' : 'Update status'}
              </button>
            </div>
          </form>
        )}

        {canComment && (isOwner || canViewAll || canChangeStatus) && (
          <form className="admin-form card" style={{ padding: '1rem 1.25rem' }} onSubmit={saveComment}>
            <h2 style={{ marginTop: 0 }}>Add comment</h2>
            <div className="admin-field">
              <span className="field-label-text">
                <RequiredMark>Comment</RequiredMark>
              </span>
              <RichTextEditor
                rows={4}
                value={commentBody}
                onChange={setCommentBody}
                placeholder="Add a follow-up…"
                required
              />
            </div>
            <FileDropzone
              id="st-comment-screenshots"
              label="Attach screenshots (optional)"
              accept={ST_SCREENSHOT_ACCEPT}
              multiple
              maxFiles={8}
              files={commentFiles}
              onChange={setCommentFiles}
            />
            <div className="actions">
              <button className="btn primary" disabled={saving}>
                {saving ? 'Posting…' : 'Post comment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
