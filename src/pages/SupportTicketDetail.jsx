import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api/client'
import DateTimeText from '../components/DateTimeText'
import FileDropzone from '../components/FileDropzone'
import RequiredMark from '../components/RequiredMark'
import RichTextDisplay from '../components/RichTextDisplay'
import RichTextEditor, { isRichTextEmpty } from '../components/RichTextEditor'
import StStatusBadge, {
  StCommentList,
  StScreenshotList,
  StSubmitterProfile,
} from '../components/SupportTicketsUI'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import {
  appendReplyAttachments,
  appendScreenshots,
  ST_ETA_PRESETS,
  ST_REPLY_MEDIA_ACCEPT,
  ST_SCREENSHOT_ACCEPT,
  ST_STATUSES,
  stStatusClass,
} from '../utils/supportTickets'

export default function SupportTicketDetail() {
  const { id } = useParams()
  const location = useLocation()
  const { isPowerAdmin, user } = useAuth()
  const { can, loading: hubLoading, effectiveAdvisorId } = useHub()

  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const [replyStatus, setReplyStatus] = useState('Open')
  const [replyRemarks, setReplyRemarks] = useState('')
  const [etaPreset, setEtaPreset] = useState('')
  const [etaCustom, setEtaCustom] = useState('')
  const [clearEta, setClearEta] = useState(false)
  const [replyFiles, setReplyFiles] = useState([])
  const [commentBody, setCommentBody] = useState('')
  const [commentFiles, setCommentFiles] = useState([])

  const moduleOn = can('support_tickets')
  // Reply is the only staff action capability (status + ETA + remarks + media).
  const canReply = can('st_reply_to_tickets')
  // View-all alone = queue + detail read-only; reply also opens the queue.
  const canViewAll = can('st_view_all_tickets') || canReply
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

  const resetReplyForm = (item) => {
    setReplyStatus(item?.status || 'Open')
    setReplyRemarks('')
    setEtaPreset('')
    setEtaCustom('')
    setClearEta(false)
    setReplyFiles([])
    setCommentBody('')
    setCommentFiles([])
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      // Member show already returns full submitter profile for view-all / reply.
      const data = await api.supportTicketsShow(id)
      const item = data.data
      setRow(item)
      resetReplyForm(item)
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

  const saveReply = async (event) => {
    event.preventDefault()
    if (isRichTextEmpty(replyRemarks)) {
      setError('Remarks are required so the end user knows what to do next.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const form = new FormData()
      form.append('status', replyStatus)
      form.append('remarks', replyRemarks)
      if (clearEta) {
        form.append('clear_estimated_resolve_at', '1')
      } else if (etaPreset) {
        const preset = ST_ETA_PRESETS.find((item) => item.key === etaPreset)
        if (preset) form.append('estimated_hours', String(preset.hours))
      } else if (etaCustom) {
        form.append('estimated_resolve_at', new Date(etaCustom).toISOString())
      }
      appendReplyAttachments(form, replyFiles)
      const data = await api.supportTicketsReply(id, form, { asPowerAdmin })
      setRow(data.data)
      setMessage('Reply posted.')
      resetReplyForm(data.data)
    } catch (err) {
      setError(err.message || 'Could not post reply.')
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
      <section className="st-detail">
        <div className="page-head">
          <div>
            <p className="eyebrow">Support Tickets</p>
            <h1>Ticket</h1>
            <p className="muted">Support Tickets functionality is off for this hub.</p>
          </div>
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="st-detail">
        <p className="muted">Loading ticket…</p>
      </section>
    )
  }

  if (!row) {
    return (
      <section className="st-detail">
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

  const issueModule = row.module_area_label || row.module_area || '—'
  const showSubmitterCard = canViewAll && row.submitter?.profile_detailed
  const comments = row.comments || []
  const isOwner =
    Boolean(user?.id) &&
    (Number(row.user_id) === Number(user.id) ||
      Number(row.submitter?.id) === Number(user.id))
  // Members may follow up on their own tickets; staff use Reply instead.
  const canComment =
    !canReply &&
    isOwner &&
    (can('st_view_own_tickets') || can('st_submit_ticket'))

  return (
    <section className="st-detail">
      <div className="page-head">
        <div>
          <p className="eyebrow">Support Tickets</p>
          <h1>
            Ticket #{row.id}{' '}
            <StStatusBadge status={row.status} at={row.status_changed_at || row.updated_at} />
          </h1>
          <p className="muted">
            {row.submitter?.name
              ? `Submitted by ${row.submitter.name}`
              : 'Support ticket'}
            {row.submitter?.email ? ` (${row.submitter.email})` : ''}
            {' | '}
            <DateTimeText value={row.created_at} />
            {' | '}
            Module: {issueModule}
            {' | '}
            {row.priority_label || row.priority || '—'}
            {' | '}
            {row.category_label || row.category || '—'}
            {row.estimated_resolve_at ? (
              <>
                {' | ETA '}
                <DateTimeText value={row.estimated_resolve_at} />
              </>
            ) : null}
          </p>
        </div>
        <Link to={backTo} className="btn ghost">
          {backLabel}
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {canReply && (
        <form className="admin-form st-panel" onSubmit={saveReply}>
          <h2>Reply</h2>
          <p className="muted">
            Set the current status, an estimated resolve time, remarks for the end user, and
            optional screenshots or a short video.
          </p>

          <fieldset className="st-status-group">
            <legend>
              <RequiredMark>Current status</RequiredMark>
            </legend>
            {ST_STATUSES.map((status) => (
              <label
                key={status}
                className={`gc-radio ${stStatusClass(status)}${
                  replyStatus === status ? ' is-selected' : ''
                }`}
              >
                <input
                  type="radio"
                  name="st-reply-status"
                  value={status}
                  checked={replyStatus === status}
                  onChange={() => setReplyStatus(status)}
                />
                {status}
              </label>
            ))}
          </fieldset>

          <div className="admin-field">
            <span className="field-label-text">Estimated time to resolve</span>
            <div className="st-eta-row">
              <select
                value={etaPreset}
                disabled={clearEta || Boolean(etaCustom)}
                onChange={(e) => {
                  setEtaPreset(e.target.value)
                  if (e.target.value) setEtaCustom('')
                }}
              >
                <option value="">Keep current / choose…</option>
                {ST_ETA_PRESETS.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={etaCustom}
                disabled={clearEta || Boolean(etaPreset)}
                onChange={(e) => {
                  setEtaCustom(e.target.value)
                  if (e.target.value) setEtaPreset('')
                }}
                aria-label="Custom estimated resolve time"
              />
            </div>
            <label className="st-eta-clear">
              <input
                type="checkbox"
                checked={clearEta}
                onChange={(e) => {
                  setClearEta(e.target.checked)
                  if (e.target.checked) {
                    setEtaPreset('')
                    setEtaCustom('')
                  }
                }}
              />
              Clear estimated resolve time
            </label>
          </div>

          <div className="admin-field">
            <span className="field-label-text">
              <RequiredMark>Remarks</RequiredMark>
            </span>
            <RichTextEditor
              rows={4}
              value={replyRemarks}
              onChange={setReplyRemarks}
              placeholder="Explain the solution or what the user should do next…"
              required
            />
          </div>

          <FileDropzone
            id="st-reply-attachments"
            label="Screenshots or short video (optional)"
            hint="Images/PDF up to 5 MB each; video clips (mp4, webm, mov) up to 25 MB. Max 8 files."
            accept={ST_REPLY_MEDIA_ACCEPT}
            multiple
            maxFiles={8}
            files={replyFiles}
            onChange={setReplyFiles}
          />

          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Posting…' : 'Post reply'}
            </button>
          </div>
        </form>
      )}

      {canComment && (
        <form className="admin-form st-panel" onSubmit={saveComment}>
          <h2>Add comment</h2>
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

      {showSubmitterCard ? (
        <div className="st-panel">
          <p className="muted label">Submitted by</p>
          <StSubmitterProfile submitter={row.submitter} />
        </div>
      ) : null}

      <div className="st-panel">
        <p className="muted label">Module with issue</p>
        <p>{issueModule}</p>

        <p className="muted label" style={{ marginTop: '0.75rem' }}>
          Priority
        </p>
        <p>{row.priority_label || row.priority || '—'}</p>

        <p className="muted label" style={{ marginTop: '0.75rem' }}>
          Category
        </p>
        <p>{row.category_label || row.category || '—'}</p>

        {!showSubmitterCard && row.submitter?.name ? (
          <>
            <p className="muted label" style={{ marginTop: '0.75rem' }}>
              Submitted by
            </p>
            <p>
              {row.submitter.name}
              {row.submitter.email ? (
                <span className="muted"> ({row.submitter.email})</span>
              ) : null}
            </p>
          </>
        ) : null}

        {row.page_url ? (
          <>
            <p className="muted label" style={{ marginTop: '0.75rem' }}>
              Page URL
            </p>
            <p>
              <a href={row.page_url} target="_blank" rel="noreferrer">
                {row.page_url}
              </a>
            </p>
          </>
        ) : null}

        {row.browser_info ? (
          <>
            <p className="muted label" style={{ marginTop: '0.75rem' }}>
              Browser
            </p>
            <p>{row.browser_info}</p>
          </>
        ) : null}

        {row.status_note ? (
          <>
            <p className="muted label" style={{ marginTop: '0.75rem' }}>
              Latest staff note
            </p>
            <RichTextDisplay html={row.status_note} className="st-feedback" />
          </>
        ) : null}

        <p className="muted label" style={{ marginTop: '0.75rem' }}>
          Description
        </p>
        <RichTextDisplay html={row.description} className="st-pre" />

        <p className="muted label" style={{ marginTop: '0.75rem' }}>
          Attachments
        </p>
        <StScreenshotList
          attachments={row.attachments || []}
          emptyLabel="No screenshots or files attached."
        />
      </div>

      <div className="st-versions">
        <h2 className="st-versions__title">Activity</h2>
        <StCommentList comments={comments} />
      </div>
    </section>
  )
}
