import { useEffect, useState } from 'react'
import { api } from '../api/client'
import RichTextEditor from '../components/RichTextEditor'
import RichTextDisplay from '../components/RichTextDisplay'
import { isRichTextEmpty } from '../utils/richText'

export default function AdminCookies() {
  const [content, setContent] = useState('')
  const [version, setVersion] = useState(1)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [hubName, setHubName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.adminCookies()
      setContent(data?.cookies?.content || '')
      setVersion(data?.cookies?.version || 1)
      setUpdatedAt(data?.cookies?.updated_at || null)
      setHubName(data?.hub?.name || '')
    } catch (err) {
      setError(err.message || 'Failed to load Cookie Notice.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onSave = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (isRichTextEmpty(content)) {
      setError('Cookie notice content cannot be empty.')
      return
    }
    setSaving(true)
    try {
      const data = await api.updateAdminCookies({ content })
      setContent(data?.cookies?.content || content)
      setVersion(data?.cookies?.version || version)
      setUpdatedAt(data?.cookies?.updated_at || null)
      setMessage(data.message || 'Saved.')
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const onReset = async () => {
    if (!window.confirm('Reset to the default Cookie Notice for this hub type? Visitors will see the banner again for the new version.')) {
      return
    }
    setError('')
    setMessage('')
    setResetting(true)
    try {
      const data = await api.resetAdminCookies()
      setContent(data?.cookies?.content || '')
      setVersion(data?.cookies?.version || 1)
      setUpdatedAt(data?.cookies?.updated_at || null)
      setMessage(data.message || 'Reset to defaults.')
    } catch (err) {
      setError(err.message || 'Failed to reset.')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-page">
        <p className="muted">Loading Cookie Notice…</p>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>Cookie Notice</h1>
          <p className="muted">
            Edit the cookie banner text shown to visitors
            {hubName ? ` for ${hubName}` : ''}. Saving creates a new version so visitors who
            already dismissed an older notice will see the banner again.
          </p>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <p className="muted" style={{ marginBottom: '1rem' }}>
        Version <strong>{version}</strong>
        {updatedAt ? ` · Updated ${new Date(updatedAt).toLocaleString()}` : ''}
      </p>

      <form onSubmit={onSave} className="stack-form">
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn ghost" onClick={() => setPreview((v) => !v)}>
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button type="button" className="btn ghost" disabled={resetting} onClick={onReset}>
            {resetting ? 'Resetting…' : 'Reset to default'}
          </button>
        </div>

        {preview ? (
          <div className="panel" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <RichTextDisplay html={content} empty="No content yet." />
          </div>
        ) : (
          <div className="admin-field" style={{ marginBottom: '1rem' }}>
            <span className="field-label-text">Content</span>
            <RichTextEditor
              value={content}
              onChange={setContent}
              rows={12}
              placeholder="Write the Cookie Notice for this hub…"
            />
          </div>
        )}

        <button className="btn primary" disabled={saving || preview}>
          {saving ? 'Saving…' : 'Save Cookie Notice'}
        </button>
      </form>
    </div>
  )
}
