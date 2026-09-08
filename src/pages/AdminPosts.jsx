import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminSubnav from '../components/AdminSubnav'
import { api } from '../api/client'

const emptyForm = {
  title: '',
  description: '',
  category: '',
  tags: [],
  credits_cost: 10,
  is_active: true,
  attachment: null,
}

export default function AdminPosts() {
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [postsRes, catsRes, tagsRes] = await Promise.all([
        api.posts({ per_page: 50 }),
        api.listCategories(),
        api.listTags(),
      ])
      setPosts(postsRes.data || [])
      setCategories(catsRes.categories || [])
      setTags(tagsRes.tags || [])
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
    fd.append('tags', JSON.stringify(form.tags))
    fd.append('credits_cost', String(form.credits_cost))
    fd.append('is_active', form.is_active ? '1' : '0')
    if (form.attachment) fd.append('attachment', form.attachment)
    return fd
  }

  const toggleTag = (tagName) => {
    setForm((prev) => {
      const selected = prev.tags.includes(tagName)
        ? prev.tags.filter((t) => t !== tagName)
        : [...prev.tags, tagName]
      return { ...prev, tags: selected }
    })
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
      const validation =
        err.data?.errors?.category?.[0] ||
        err.data?.errors?.tags?.[0] ||
        err.message
      setError(validation)
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
      tags: post.tags || [],
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

  const categoryOptions = categories.some((c) => c.name === form.category) || !form.category
    ? categories
    : [...categories, { id: `legacy-${form.category}`, name: form.category }]

  const tagOptions = (() => {
    const known = new Set(tags.map((t) => t.name))
    const extras = (form.tags || [])
      .filter((name) => !known.has(name))
      .map((name) => ({ id: `legacy-${name}`, name }))
    return [...tags, ...extras]
  })()

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client Admin</p>
          <h1>{editingId ? 'Edit post' : 'Add social media post'}</h1>
          <p className="muted">Upload attachment, set credits, type, and tags.</p>
        </div>
        <AdminSubnav />
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
            Type
            <select
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select a type</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <span className="field-hint">
                No types yet. <Link to="/client-admin/types">Add content types</Link> first.
              </span>
            )}
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
        </div>
        <fieldset className="tag-picker">
          <legend>Tags</legend>
          {tagOptions.length === 0 ? (
            <p className="field-hint">
              No tags yet. <Link to="/client-admin/tags">Add tags</Link> first.
            </p>
          ) : (
            <div className="tag-options">
              {tagOptions.map((tag) => (
                <label key={tag.id} className="checkbox tag-option">
                  <input
                    type="checkbox"
                    checked={form.tags.includes(tag.name)}
                    onChange={() => toggleTag(tag.name)}
                  />
                  {tag.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
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
          <button className="btn primary" disabled={saving || categories.length === 0}>
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
