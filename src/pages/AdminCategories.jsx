import { useEffect, useState } from 'react'
import AdminSubnav from '../components/AdminSubnav'
import { api } from '../api/client'

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.listCategories()
      setCategories(data.categories || data.types || [])
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
        await api.updateCategory(editingId, payload)
        setMessage('Content type updated.')
      } else {
        await api.createCategory(payload)
        setMessage('Content type created.')
      }
      reset()
      await load()
    } catch (err) {
      setError(err.data?.errors?.name?.[0] || err.data?.errors?.slug?.[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  const edit = (category) => {
    setEditingId(category.id)
    setName(category.name)
    setSlug(category.slug || '')
    setMessage('')
    setError('')
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this content type?')) return
    setError('')
    setMessage('')
    try {
      await api.deleteCategory(id)
      setMessage('Content type deleted.')
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
          <h1>{editingId ? 'Edit content type' : 'Content types'}</h1>
          <p className="muted">
            Category is the content type (Post, Reel, etc.). Use slug <code>reel</code> for play
            button behaviour on the listing.
          </p>
        </div>
        <AdminSubnav />
      </div>

      <form className="admin-form" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <label>
          Type name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Post, Reel..."
          />
        </label>
        <label>
          Slug (optional)
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="post, reel..."
          />
        </label>
        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update type' : 'Add type'}
          </button>
          {editingId && (
            <button type="button" className="btn ghost" onClick={reset}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 className="section-title">Existing types</h2>
      {loading ? (
        <div className="state">Loading...</div>
      ) : categories.length === 0 ? (
        <div className="state">No types yet. Add Post and Reel above.</div>
      ) : (
        <div className="admin-list">
          {categories.map((category) => (
            <div key={category.id} className="admin-row">
              <div>
                <strong>{category.name}</strong>
                <p className="muted">
                  slug: {category.slug || '—'} · {category.posts_count ?? 0} items
                </p>
              </div>
              <div className="actions">
                <button className="btn ghost" onClick={() => edit(category)}>
                  Edit
                </button>
                <button className="btn danger" onClick={() => remove(category.id)}>
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
