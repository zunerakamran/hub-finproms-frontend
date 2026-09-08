import { useEffect, useState } from 'react'
import AdminSubnav from '../components/AdminSubnav'
import { api } from '../api/client'

export default function AdminTags() {
  const [tags, setTags] = useState([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
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
  }, [])

  const reset = () => {
    setName('')
    setEditingId(null)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (editingId) {
        await api.updateTag(editingId, { name: name.trim() })
        setMessage('Tag updated.')
      } else {
        await api.createTag({ name: name.trim() })
        setMessage('Tag created.')
      }
      reset()
      await load()
    } catch (err) {
      setError(err.data?.errors?.name?.[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  const edit = (tag) => {
    setEditingId(tag.id)
    setName(tag.name)
    setMessage('')
    setError('')
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this tag?')) return
    setError('')
    setMessage('')
    try {
      await api.deleteTag(id)
      setMessage('Tag deleted.')
      if (editingId === id) reset()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client Admin</p>
          <h1>{editingId ? 'Edit tag' : 'Post tags'}</h1>
          <p className="muted">Manage tags available when creating posts.</p>
        </div>
        <AdminSubnav />
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
            {saving ? 'Saving...' : editingId ? 'Update tag' : 'Add tag'}
          </button>
          {editingId && (
            <button type="button" className="btn ghost" onClick={reset}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 className="section-title">Existing tags</h2>
      {loading ? (
        <div className="state">Loading...</div>
      ) : tags.length === 0 ? (
        <div className="state">No tags yet. Add one above.</div>
      ) : (
        <div className="admin-list">
          {tags.map((tag) => (
            <div key={tag.id} className="admin-row">
              <div>
                <strong>{tag.name}</strong>
              </div>
              <div className="actions">
                <button className="btn ghost" onClick={() => edit(tag)}>
                  Edit
                </button>
                <button className="btn danger" onClick={() => remove(tag.id)}>
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
