import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function AdminTags({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { actingHubId, isActingOnWhiteLabel, actingHub } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const apiOpts = { asPowerAdmin }

  const [tags, setTags] = useState([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.listTags()
      setTags(data.tags || [])
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingHubId])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (editingId) {
        await api.updateTag(editingId, { name: name.trim() }, apiOpts)
        setMessage('Tag updated.')
      } else {
        const data = await api.createTag({ name: name.trim() }, apiOpts)
        setMessage(data.message || 'Tag created.')
      }
      setName('')
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err.data?.errors?.name?.[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client Admin</p>
          <h1>{editingId ? 'Edit tag' : 'Post tags'}</h1>
          <p className="muted">
            {isActingOnWhiteLabel
              ? `Managing tags on ${actingHub?.name}. Switch hubs from the top bar.`
              : 'Managing shared hub tags. Use Control hub in the top bar for a white-label hub.'}
          </p>
        </div>
      </div>

      <form className="admin-form" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <label>
          Tag name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="finance, promo..."
          />
        </label>
        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving
              ? 'Saving...'
              : editingId
                ? 'Update tag'
                : isActingOnWhiteLabel
                  ? `Add tag on ${actingHub?.name || 'hub'}`
                  : 'Add tag'}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setEditingId(null)
                setName('')
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 className="section-title">
        {isActingOnWhiteLabel ? `Tags on ${actingHub?.name}` : 'Existing tags'}
      </h2>
      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <div className="admin-list">
          {tags.map((tag) => (
            <div key={tag.id} className="admin-row">
              <div>
                <strong>{tag.name}</strong>
              </div>
              <div className="actions">
                <button
                  className="btn ghost"
                  onClick={() => {
                    setEditingId(tag.id)
                    setName(tag.name)
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn danger"
                  onClick={async () => {
                    if (!window.confirm('Delete this tag?')) return
                    try {
                      await api.deleteTag(tag.id, apiOpts)
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
