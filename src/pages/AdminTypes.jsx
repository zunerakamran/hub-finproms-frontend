import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function AdminTypes({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { actingHubId, isActingOnWhiteLabel, actingHub } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const apiOpts = { asPowerAdmin }

  const [types, setTypes] = useState([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.listTypes()
      setTypes(data.types || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    setEditingId(null)
    setName('')
    setSlug('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingHubId])

  const reset = () => {
    setName('')
    setSlug('')
    setEditingId(null)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = { name: name.trim(), slug: slug.trim() || undefined }
      if (editingId) {
        await api.updateType(editingId, payload, apiOpts)
        setMessage('Type updated.')
      } else {
        const data = await api.createType(payload, apiOpts)
        setMessage(data.message || 'Type created.')
      }
      reset()
      await load()
    } catch (err) {
      setError(err.data?.errors?.name?.[0] || err.data?.errors?.slug?.[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client Admin</p>
          <h1>{editingId ? 'Edit type' : 'Content types'}</h1>
          <p className="muted">
            {isActingOnWhiteLabel
              ? `Managing types on ${actingHub?.name}. Switch hubs from the top bar.`
              : 'Managing shared hub types. Use Control hub in the top bar for a white-label hub.'}
          </p>
        </div>
      </div>

      <form className="admin-form" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <label>
          Type name
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Post, Reel..." />
        </label>
        <label>
          Slug (optional)
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="post, reel..." />
        </label>
        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving
              ? 'Saving...'
              : editingId
                ? 'Update type'
                : isActingOnWhiteLabel
                  ? `Add type on ${actingHub?.name || 'hub'}`
                  : 'Add type'}
          </button>
          {editingId && (
            <button type="button" className="btn ghost" onClick={reset}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 className="section-title">
        {isActingOnWhiteLabel ? `Types on ${actingHub?.name}` : 'Existing types'}
      </h2>
      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <div className="admin-list">
          {types.map((type) => (
            <div key={type.id} className="admin-row">
              <div>
                <strong>{type.name}</strong>
                <p className="muted">slug: {type.slug || '—'}</p>
              </div>
              <div className="actions">
                <button
                  className="btn ghost"
                  onClick={() => {
                    setEditingId(type.id)
                    setName(type.name)
                    setSlug(type.slug || '')
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn danger"
                  onClick={async () => {
                    if (!window.confirm('Delete this type?')) return
                    try {
                      await api.deleteType(type.id, apiOpts)
                      await load()
                    } catch (err) {
                      setError(err.message)
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
