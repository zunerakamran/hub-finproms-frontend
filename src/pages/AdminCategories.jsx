import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function AdminCategories({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const apiOpts = { asPowerAdmin }
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.listCategories()
      setCategories(data.categories || [])
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
        await api.updateCategory(editingId, { name: name.trim() }, apiOpts)
        setMessage('Category updated.')
      } else {
        await api.createCategory({ name: name.trim() }, apiOpts)
        setMessage('Category created.')
      }
      reset()
      await load()
    } catch (err) {
      setError(err.data?.errors?.name?.[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  const edit = (category) => {
    setEditingId(category.id)
    setName(category.name)
    setMessage('')
    setError('')
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this category?')) return
    setError('')
    setMessage('')
    try {
      await api.deleteCategory(id, apiOpts)
      setMessage('Category deleted.')
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
          <h1>{editingId ? 'Edit category' : 'Categories'}</h1>
          <p className="muted">
            Categories are separate from type (post/reel) and tags. Use them for topical grouping.
          </p>
        </div>
      </div>

      <form className="admin-form" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <label>
          Category name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="LinkedIn, Instagram, Mortgages..."
          />
        </label>
        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update category' : 'Add category'}
          </button>
          {editingId && (
            <button type="button" className="btn ghost" onClick={reset}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 className="section-title">Existing categories</h2>
      {loading ? (
        <div className="state">Loading...</div>
      ) : categories.length === 0 ? (
        <div className="state">No categories yet. Add one above.</div>
      ) : (
        <div className="admin-list">
          {categories.map((category) => (
            <div key={category.id} className="admin-row">
              <div>
                <strong>{category.name}</strong>
                <p className="muted">{category.posts_count ?? 0} items</p>
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
