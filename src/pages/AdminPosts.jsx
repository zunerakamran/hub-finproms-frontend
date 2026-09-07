import { useEffect, useState } from 'react'
import { api } from '../api/client'

const emptyForm = {
  title: '',
  description: '',
  category: '',
  tags: '',
  credits_cost: 10,
  is_active: true,
  attachment: null,
}

export default function AdminPosts() {
  const [posts, setPosts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.posts({ per_page: 50 })
      setPosts(data.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const toFormData = () => {
    const fd = new FormData()
    fd.append('title', form.title)
    fd.append('description', form.description || '')
    fd.append('category', form.category)
    fd.append('tags', form.tags)
    fd.append('credits_cost', String(form.credits_cost))
    fd.append('is_active', form.is_active ? '1' : '0')
    if (form.attachment) fd.append('attachment', form.attachment)
    return fd
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (editingId) {
        await api.updatePost(editingId, toFormData())
        setMessage('Post updated.')
      } else {
        await api.createPost(toFormData())
        setMessage('Post created.')
      }
      setForm(emptyForm)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const edit = (post) => {
    setEditingId(post.id)
    setForm({
      title: post.title || '',
      description: post.description || '',
      category: post.category || '',
      tags: (post.tags || []).join(', '),
      credits_cost: post.credits_cost || 10,
      is_active: post.is_active !== false,
      attachment: null,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this post?')) return
    try {
      await api.deletePost(id)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>{editingId ? 'Edit post' : 'Add social media post'}</h1>
          <p className="muted">Upload attachment, set credits, category, and tags.</p>
        </div>
      </div>

      <form className="admin-form" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <div className="form-grid">
          <label>
            Title
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            Category
            <input
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="LinkedIn, Instagram..."
            />
          </label>
          <label>
            Credits cost
            <input
              type="number"
              min="1"
              required
              value={form.credits_cost}
              onChange={(e) => setForm({ ...form, credits_cost: e.target.value })}
            />
          </label>
          <label>
            Tags (comma separated)
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="finance, promo"
            />
          </label>
        </div>
        <label>
          Description
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label>
          Attachment / cover image
          <input
            type="file"
            accept="image/*,.pdf,.doc,.docx,.mp4,.mov,.zip"
            onChange={(e) => setForm({ ...form, attachment: e.target.files?.[0] || null })}
          />
          <span className="field-hint">If you upload an image, it is also shown as the post cover.</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Active
        </label>
        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update post' : 'Create post'}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setEditingId(null)
                setForm(emptyForm)
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 className="section-title">Existing posts</h2>
      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <div className="admin-list">
          {posts.map((post) => (
            <div key={post.id} className="admin-row">
              {post.cover_url && (
                <img className="admin-thumb" src={post.cover_url} alt="" />
              )}
              <div>
                <strong>{post.title}</strong>
                <p className="muted">
                  {post.category} · {post.credits_cost} credits · updated{' '}
                  {new Date(post.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div className="actions">
                <button className="btn ghost" onClick={() => edit(post)}>
                  Edit
                </button>
                <button className="btn danger" onClick={() => remove(post.id)}>
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
