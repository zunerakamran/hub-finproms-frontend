import { useEffect, useState } from 'react'
import { api } from '../api/client'
import RichTextEditor from '../components/RichTextEditor'
import RichTextDisplay from '../components/RichTextDisplay'
import { isRichTextEmpty } from '../utils/richText'

export default function AdminTerms() {
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
      const data = await api.adminTerms()
      setContent(data?.terms?.content || '')
      setVersion(data?.terms?.version || 1)
      setUpdatedAt(data?.terms?.updated_at || null)
      setHubName(data?.hub?.name || '')
    } catch (err) {
      setError(err.message || 'Failed to load Terms & Conditions.')
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
      setError('Terms & Conditions content cannot be empty.')
      return
    }
    setSaving(true)
    try {
      const data = await api.updateAdminTerms({ content })
      setContent(data?.terms?.content || content)
      setVersion(data?.terms?.version || version)
      setUpdatedAt(data?.terms?.updated_at || null)
      setMessage(data.message || 'Saved.')
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const onReset = async () => {
    if (!window.confirm('Reset to the default Terms & Conditions for this hub type? Users will need to accept the new version.')) {
      return
    }
    setError('')
    setMessage('')
    setResetting(true)
    try {
      const data = await api.resetAdminTerms()
      setContent(data?.terms?.content || '')
      setVersion(data?.terms?.version || 1)
      setUpdatedAt(data?.terms?.updated_at || null)
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
        <p className="muted">Loading Terms & Conditions…</p>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>Terms & Conditions</h1>
          <p className="muted">
            Edit the content users must accept on first login
            {hubName ? ` for ${hubName}` : ''}. Saving creates a new version so users who
            already accepted an older copy will be asked again.
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
              rows={16}
              placeholder="Write the Terms & Conditions for this hub…"
            />
          </div>
        )}

        <button className="btn primary" disabled={saving || preview}>
          {saving ? 'Saving…' : 'Save Terms & Conditions'}
        </button>
      </form>
    </div>
  )
}
