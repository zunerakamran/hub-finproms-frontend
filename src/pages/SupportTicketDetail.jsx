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
  stPriorityClass,
  ST_ETA_PRESETS,
  ST_REPLY_MEDIA_ACCEPT,
  ST_SCREENSHOT_ACCEPT,
  ST_STATUSES,
  stStatusClass,
} from '../utils/supportTickets'

export default function SupportTicketDetail() {
  const { id } = useParams()
  const location = useLocation()
  const { isPowerAdmin } = useAuth()
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
  const canReply = can('st_reply_to_tickets') || can('st_change_ticket_status')
  const canViewAll =
    can('st_view_all_tickets') || can('st_change_ticket_status') || can('st_reply_to_tickets')
  const canComment = can('st_comment_on_tickets') && !canReply
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
  const attachmentCount = Array.isArray(row.attachments) ? row.attachments.length : 0
  const hasAside = canReply || canComment

  return (
    <section className="st-detail">
      <div className="page-head st-detail-head">
        <div className="st-detail-head__copy">
          <p className="eyebrow">Support Tickets</p>
          <div className="st-detail-head__title-row">
            <h1>
              <span className="st-detail-id">#{row.id}</span>
              {row.subject}
            </h1>
            <StStatusBadge status={row.status} at={row.status_changed_at || row.updated_at} />
          </div>
          <p className="st-detail-head__sub muted">
            {row.submitter?.name ? (
              <>
                From <strong>{row.submitter.name}</strong>
                {row.submitter.email ? ` · ${row.submitter.email}` : ''}
                {' · '}
              </>
            ) : null}
            Submitted <DateTimeText value={row.created_at} />
          </p>
          <div className="st-detail-pills" aria-label="Ticket labels">
            <span className="st-detail-chip st-detail-chip--module" title="Module with the issue">
              <span className="st-detail-chip__k">Module</span>
              {issueModule}
            </span>
            <span className={stPriorityClass(row.priority)} title="Priority">
              <span className="st-detail-chip__k">Priority</span>
              {row.priority_label || row.priority || '—'}
            </span>
            <span className="st-detail-chip" title="Category">
              <span className="st-detail-chip__k">Category</span>
              {row.category_label || row.category || '—'}
            </span>
            {row.estimated_resolve_at ? (
              <span className="st-detail-chip st-detail-chip--eta" title="Estimated resolve time">
                <span className="st-detail-chip__k">ETA</span>
                <DateTimeText value={row.estimated_resolve_at} />
              </span>
            ) : null}
          </div>
        </div>
        <Link to={backTo} className="btn ghost">
          {backLabel}
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className={`st-detail-layout${hasAside ? ' st-detail-layout--split' : ''}`}>
        <div className="st-detail-main">
          <article className="card st-detail-card st-detail-card--issue">
            <header className="st-detail-card__head">
              <h2 className="st-detail-card__title">Issue report</h2>
              {attachmentCount > 0 ? (
                <span className="muted st-detail-card__count">
                  {attachmentCount} attachment{attachmentCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </header>

            <div className="st-detail-description">
              <RichTextDisplay html={row.description} />
            </div>

            {(row.page_url || row.browser_info || row.status_note) && (
              <dl className="st-detail-facts">
                {row.page_url ? (
                  <div>
                    <dt>Page URL</dt>
                    <dd>
                      <a
                        href={row.page_url}
                        target="_blank"
                        rel="noreferrer"
                        className="st-detail-link"
                      >
                        {row.page_url}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {row.browser_info ? (
                  <div>
                    <dt>Browser</dt>
                    <dd>{row.browser_info}</dd>
                  </div>
                ) : null}
                {row.status_note ? (
                  <div className="st-detail-facts__wide">
                    <dt>Latest staff note</dt>
                    <dd>{row.status_note}</dd>
                  </div>
                ) : null}
              </dl>
            )}

            <div className="st-detail-section">
              <h3 className="st-detail-section__title">Attachments</h3>
              <StScreenshotList
                attachments={row.attachments || []}
                emptyLabel="No screenshots or files attached."
              />
            </div>
          </article>

          {showSubmitterCard ? (
            <article className="card st-detail-card">
              <header className="st-detail-card__head">
                <h2 className="st-detail-card__title">Submitted by</h2>
              </header>
              <StSubmitterProfile submitter={row.submitter} />
            </article>
          ) : null}

          <article className="card st-detail-card">
            <header className="st-detail-card__head">
              <h2 className="st-detail-card__title">Activity</h2>
              <span className="muted st-detail-card__count">
                {(row.comments || []).length} update{(row.comments || []).length === 1 ? '' : 's'}
              </span>
            </header>
            <StCommentList comments={row.comments || []} />
          </article>
        </div>

        {hasAside ? (
          <aside className="st-detail-aside">
            {canReply ? (
              <form className="admin-form card st-detail-card st-detail-reply" onSubmit={saveReply}>
                <header className="st-detail-card__head">
                  <h2 className="st-detail-card__title">Reply</h2>
                </header>
                <p className="muted st-detail-aside__hint">
                  Set status, ETA, and remarks. Attach screenshots or a short video to guide the
                  user.
                </p>

                <fieldset className="st-detail-status-fieldset">
                  <legend>
                    <RequiredMark>Status</RequiredMark>
                  </legend>
                  <div className="st-detail-status-row">
                    {ST_STATUSES.map((status) => {
                      const selected = replyStatus === status
                      return (
                        <label
                          key={status}
                          className={`st-detail-status-option ${stStatusClass(status)}${
                            selected ? ' is-selected' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="st-reply-status"
                            value={status}
                            checked={selected}
                            onChange={() => setReplyStatus(status)}
                          />
                          {status}
                        </label>
                      )
                    })}
                  </div>
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
                    rows={5}
                    value={replyRemarks}
                    onChange={setReplyRemarks}
                    placeholder="Explain the solution or what the user should do next…"
                    required
                  />
                </div>

                <FileDropzone
                  id="st-reply-attachments"
                  label="Screenshots or short video (optional)"
                  hint="Images/PDF up to 5 MB; video up to 25 MB. Max 8 files."
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
            ) : null}

            {canComment ? (
              <form className="admin-form card st-detail-card" onSubmit={saveComment}>
                <header className="st-detail-card__head">
                  <h2 className="st-detail-card__title">Add comment</h2>
                </header>
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
            ) : null}
          </aside>
        ) : null}
      </div>
    </section>
  )
}
