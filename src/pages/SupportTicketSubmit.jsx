import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import FileDropzone from '../components/FileDropzone'
import RequiredMark from '../components/RequiredMark'
import RichTextEditor, { isRichTextEmpty } from '../components/RichTextEditor'
import SupportTicketCapture from '../components/SupportTicketCapture'
import { useHub } from '../context/HubContext'
import {
  appendScreenshots,
  ST_SUBMIT_MEDIA_ACCEPT,
  ST_SUBMIT_PRIORITIES,
} from '../utils/supportTickets'

export default function SupportTicketSubmit() {
  const { can, loading: hubLoading } = useHub()
  const navigate = useNavigate()

  const [options, setOptions] = useState({
    modules: [],
    categories: [],
    submit_priorities: ST_SUBMIT_PRIORITIES,
  })
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [moduleArea, setModuleArea] = useState('')
  const [category, setCategory] = useState('bug')
  const [priority, setPriority] = useState('medium')
  const [description, setDescription] = useState('')
  const [pageUrl, setPageUrl] = useState(() => window.location.href)
  const [attachments, setAttachments] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const moduleOn = can('support_tickets')
  const canSubmit = can('st_submit_ticket')
  const urgencyOptions =
    options.submit_priorities?.length > 0 ? options.submit_priorities : ST_SUBMIT_PRIORITIES

  useEffect(() => {
    if (hubLoading || !moduleOn || !canSubmit) {
      setOptionsLoading(false)
      return
    }
    let cancelled = false
    setOptionsLoading(true)
    api
      .supportTicketsOptions()
      .then((data) => {
        if (cancelled) return
        setOptions({
          modules: data.modules || [],
          categories: data.categories || [],
          submit_priorities:
            data.submit_priorities?.length > 0 ? data.submit_priorities : ST_SUBMIT_PRIORITIES,
        })
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load ticket options.')
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hubLoading, moduleOn, canSubmit])

  const submit = async (event) => {
    event.preventDefault()
    if (!subject.trim()) {
      setError('Subject is required.')
      return
    }
    if (!moduleArea) {
      setError('Select the module where you found the issue.')
      return
    }
    if (isRichTextEmpty(description)) {
      setError('Please add remarks describing the issue.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const form = new FormData()
      form.append('subject', subject.trim())
      form.append('module_area', moduleArea)
      form.append('category', category || 'bug')
      form.append('priority', priority || 'medium')
      form.append('description', description)
      if (pageUrl.trim()) form.append('page_url', pageUrl.trim())
      form.append('browser_info', navigator.userAgent || '')
      appendScreenshots(form, attachments)
      const data = await api.supportTicketsSubmit(form)
      navigate(`/my-dashboard/support-tickets/${data.data.id}`, {
        state: { from: 'submit' },
      })
    } catch (err) {
      setError(err.message || 'Submit failed.')
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && (!moduleOn || !canSubmit)) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Support Tickets</p>
            <h1>New ticket</h1>
            <p className="muted">
              {!moduleOn
                ? 'Support Tickets functionality is off for this hub.'
                : 'You do not have permission to submit support tickets.'}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Support Tickets</p>
          <h1>Report an issue</h1>
          <p className="muted">
            Choose the module and type of issue, set urgency, add remarks, and attach screenshots or
            a short screen recording of the error.
          </p>
        </div>
        <Link to="/my-dashboard/support-tickets" className="btn ghost">
          My tickets
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}

      <form className="admin-form" onSubmit={submit}>
        <label>
          <RequiredMark>Subject</RequiredMark>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Short summary of the issue"
            required
            maxLength={255}
          />
        </label>

        <label>
          <RequiredMark>Module</RequiredMark>
          <select
            value={moduleArea}
            onChange={(e) => setModuleArea(e.target.value)}
            required
            disabled={optionsLoading}
          >
            <option value="">
              {optionsLoading ? 'Loading modules…' : 'Select module with the error…'}
            </option>
            {options.modules.map((mod) => (
              <option key={mod.key} value={mod.key}>
                {mod.label}
              </option>
            ))}
          </select>
        </label>

        <div
          className="admin-form-row"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
        >
          <label>
            <RequiredMark>Type of issue</RequiredMark>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={optionsLoading}
            >
              {options.categories.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <RequiredMark>Urgency</RequiredMark>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {urgencyOptions.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-field">
          <span className="field-label-text">
            <RequiredMark>Remarks</RequiredMark>
          </span>
          <RichTextEditor
            rows={6}
            value={description}
            onChange={setDescription}
            placeholder="Describe what you expected, what happened, and steps to reproduce…"
            required
          />
        </div>

        <label>
          Page URL (optional)
          <input
            type="text"
            value={pageUrl}
            onChange={(e) => setPageUrl(e.target.value)}
            placeholder="https://…"
            maxLength={500}
          />
        </label>

        <div className="admin-field">
          <span className="field-label-text">Attachments (optional)</span>
          <p className="muted" style={{ margin: '0 0 0.65rem' }}>
            Upload screenshots / PDF, or a short video of the error (up to 8 files; images/PDF ≤ 5
            MB, video ≤ 25 MB). Or capture directly in the app:
          </p>
          <SupportTicketCapture
            files={attachments}
            maxFiles={8}
            disabled={saving}
            onAddFiles={(incoming) =>
              setAttachments((prev) => [...prev, ...incoming].slice(0, 8))
            }
          />
          <FileDropzone
            id="st-submit-media"
            label="Browse or drop files"
            hint="JPG, PNG, GIF, WebP, PDF, MP4, WebM, MOV — up to 8 files"
            accept={ST_SUBMIT_MEDIA_ACCEPT}
            multiple
            maxFiles={8}
            files={attachments}
            onChange={setAttachments}
            disabled={saving}
          />
        </div>

        <div className="actions">
          <button className="btn primary" disabled={saving || optionsLoading}>
            {saving ? 'Submitting…' : 'Submit ticket'}
          </button>
        </div>
      </form>
    </section>
  )
}
