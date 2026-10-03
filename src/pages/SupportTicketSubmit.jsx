import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import FileDropzone from '../components/FileDropzone'
import RequiredMark from '../components/RequiredMark'
import RichTextEditor, { isRichTextEmpty } from '../components/RichTextEditor'
import { useHub } from '../context/HubContext'
import { appendScreenshots, ST_SCREENSHOT_ACCEPT } from '../utils/supportTickets'

export default function SupportTicketSubmit() {
  const { can, loading: hubLoading } = useHub()
  const navigate = useNavigate()

  const [options, setOptions] = useState({ modules: [], categories: [], priorities: [] })
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [moduleArea, setModuleArea] = useState('')
  const [category, setCategory] = useState('bug')
  const [priority, setPriority] = useState('medium')
  const [description, setDescription] = useState('')
  const [pageUrl, setPageUrl] = useState(() => window.location.href)
  const [screenshots, setScreenshots] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const moduleOn = can('module_support_tickets')
  const canSubmit = can('st_submit_ticket')

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
          priorities: data.priorities || [],
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
      setError('Please describe the issue.')
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
      appendScreenshots(form, screenshots)
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
                ? 'Support Tickets module is off for this hub.'
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
            Tell us which module has the problem, describe what went wrong, and attach screenshots if
            you can.
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

        <div className="admin-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {options.categories.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {options.priorities.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-field">
          <span className="field-label-text">
            <RequiredMark>What is the issue?</RequiredMark>
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

        <FileDropzone
          id="st-submit-screenshots"
          label="Screenshots (optional)"
          hint="JPG, PNG, GIF, WebP or PDF — up to 8 files"
          accept={ST_SCREENSHOT_ACCEPT}
          multiple
          maxFiles={8}
          files={screenshots}
          onChange={setScreenshots}
        />

        <div className="actions">
          <button className="btn primary" disabled={saving || optionsLoading}>
            {saving ? 'Submitting…' : 'Submit ticket'}
          </button>
        </div>
      </form>
    </section>
  )
}
