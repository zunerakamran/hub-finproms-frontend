import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'

const EMPTY_FORM = {
  subject: '',
  eyebrow: '',
  heading: '',
  intro: '',
  closing: '',
  cta_label: '',
}

export default function AdminEmailTemplateEdit() {
  const { event: eventKey } = useParams()
  const [event, setEvent] = useState(null)
  const [audience, setAudience] = useState('user')
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const audiences = useMemo(() => {
    const templates = event?.templates || {}
    return Object.keys(templates)
  }, [event])

  const activeTemplate = event?.templates?.[audience] || null

  const applyEvent = (payload) => {
    setEvent(payload)
    const keys = Object.keys(payload?.templates || {})
    const nextAudience = keys.includes(audience) ? audience : keys[0] || 'user'
    setAudience(nextAudience)
    const tpl = payload?.templates?.[nextAudience]
    setForm({
      subject: tpl?.subject ?? '',
      eyebrow: tpl?.eyebrow ?? '',
      heading: tpl?.heading ?? '',
      intro: tpl?.intro ?? '',
      closing: tpl?.closing ?? '',
      cta_label: tpl?.cta_label ?? '',
    })
  }

  const load = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const data = await api.emailTemplate(eventKey)
      applyEvent(data?.event)
    } catch (err) {
      setError(err.message || 'Failed to load email template.')
      setEvent(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventKey])

  useEffect(() => {
    if (!event?.templates?.[audience]) return
    const tpl = event.templates[audience]
    setForm({
      subject: tpl.subject ?? '',
      eyebrow: tpl.eyebrow ?? '',
      heading: tpl.heading ?? '',
      intro: tpl.intro ?? '',
      closing: tpl.closing ?? '',
      cta_label: tpl.cta_label ?? '',
    })
    setMessage('')
    setError('')
  }, [audience, event])

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.updateEmailTemplate(eventKey, audience, form)
      if (data?.template && event) {
        setEvent({
          ...event,
          templates: {
            ...event.templates,
            [audience]: data.template,
          },
        })
      } else {
        await load()
      }
      setMessage(data.message || 'Email template saved.')
    } catch (err) {
      setError(err.message || 'Failed to save email template.')
    } finally {
      setSaving(false)
    }
  }

  const onReset = async () => {
    if (!window.confirm('Reset this template to the default copy?')) return
    setResetting(true)
    setError('')
    setMessage('')
    try {
      const data = await api.resetEmailTemplate(eventKey, audience)
      if (data?.template && event) {
        const next = {
          ...event,
          templates: {
            ...event.templates,
            [audience]: data.template,
          },
        }
        setEvent(next)
        const tpl = data.template
        setForm({
          subject: tpl.subject ?? '',
          eyebrow: tpl.eyebrow ?? '',
          heading: tpl.heading ?? '',
          intro: tpl.intro ?? '',
          closing: tpl.closing ?? '',
          cta_label: tpl.cta_label ?? '',
        })
      } else {
        await load()
      }
      setMessage(data.message || 'Template reset to defaults.')
    } catch (err) {
      setError(err.message || 'Failed to reset template.')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <section>
        <div className="state">Loading...</div>
      </section>
    )
  }

  if (!event) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Hub</p>
            <h1>Email template</h1>
          </div>
        </div>
        {error && <div className="alert">{error}</div>}
        <Link className="btn ghost" to="/my-dashboard/email-templates">
          ← Back to email templates
        </Link>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Email templates</p>
          <h1>{event.label}</h1>
          <p className="muted">{event.description}</p>
        </div>
        <Link className="btn ghost" to="/my-dashboard/email-templates">
          ← All templates
        </Link>
      </div>

      {event.admin_recipients_note && (
        <p className="muted" style={{ marginBottom: '1rem' }}>{event.admin_recipients_note}</p>
      )}

      {audiences.length > 1 && (
        <div className="admin-subnav" style={{ marginBottom: '1rem' }}>
          {audiences.map((key) => {
            const tpl = event.templates[key]
            return (
              <button
                key={key}
                type="button"
                className={audience === key ? 'active' : ''}
                onClick={() => setAudience(key)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: 999,
                  border: '1px solid var(--line)',
                  background: audience === key ? 'var(--brand-soft)' : 'white',
                  color: audience === key ? 'var(--brand-dark)' : 'var(--muted)',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {tpl?.audience_label || key}
                {tpl?.is_customized ? ' •' : ''}
              </button>
            )
          })}
        </div>
      )}

      <form className="admin-form settings-form" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        <div className="settings-block">
          <h2>
            {activeTemplate?.audience_label || audience}
            {activeTemplate?.is_customized ? (
              <span className="muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                (customized)
              </span>
            ) : (
              <span className="muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                (default)
              </span>
            )}
          </h2>

          <div className="form-grid">
            <label>
              Subject
              <input
                value={form.subject}
                onChange={(e) => onChange('subject', e.target.value)}
                maxLength={255}
                required
              />
            </label>
            <label>
              Eyebrow
              <input
                value={form.eyebrow}
                onChange={(e) => onChange('eyebrow', e.target.value)}
                maxLength={120}
              />
            </label>
            <label>
              Heading
              <input
                value={form.heading}
                onChange={(e) => onChange('heading', e.target.value)}
                maxLength={255}
                required
              />
            </label>
            <label>
              CTA button label
              <input
                value={form.cta_label}
                onChange={(e) => onChange('cta_label', e.target.value)}
                maxLength={120}
                placeholder="Optional"
              />
            </label>
          </div>

          <label style={{ display: 'block', marginTop: '1rem' }}>
            Intro / body
            <textarea
              value={form.intro}
              onChange={(e) => onChange('intro', e.target.value)}
              rows={6}
              maxLength={5000}
              required
            />
          </label>

          <label style={{ display: 'block', marginTop: '1rem' }}>
            Closing
            <textarea
              value={form.closing}
              onChange={(e) => onChange('closing', e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Optional"
            />
          </label>
        </div>

        {Array.isArray(event.variables) && event.variables.length > 0 && (
          <div className="settings-block">
            <h2>Available variables</h2>
            <p className="muted">
              Use these placeholders in subject or body text. They are replaced when the email is
              sent.
            </p>
            <ul className="muted" style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
              {event.variables.map((variable) => (
                <li key={variable.key}>
                  <code>{`{{${variable.key}}}`}</code>
                  {variable.label ? ` — ${variable.label}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="actions sticky-actions">
          <button type="submit" className="btn primary" disabled={saving || resetting}>
            {saving ? 'Saving…' : 'Save template'}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={onReset}
            disabled={saving || resetting || !activeTemplate?.is_customized}
          >
            {resetting ? 'Resetting…' : 'Reset to default'}
          </button>
        </div>
      </form>
    </section>
  )
}
