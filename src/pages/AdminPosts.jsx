import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const emptyForm = {
  title: '',
  description: '',
  type: '',
  category: '',
  tags: [],
  credits_cost: 10,
  is_active: true,
  attachment: null,
}

export default function AdminPosts({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const apiOpts = { asPowerAdmin }
  const [posts, setPosts] = useState([])
  const [types, setTypes] = useState([])
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
      const [postsRes, typesRes, catsRes, tagsRes] = await Promise.all([
        api.posts({ per_page: 50 }),
        api.listTypes(),
        api.listCategories(),
        api.listTags(),
      ])
      setPosts(postsRes.data || [])
      setTypes(typesRes.types || [])
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
    fd.append('type', form.type)
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
        await api.updatePost(editingId, toFormData(), apiOpts)
        setMessage('Post updated.')
      } else {
        await api.createPost(toFormData(), apiOpts)
        setMessage('Post created.')
      }
      setForm(emptyForm)
      setEditingId(null)
      await load()
    } catch (err) {
      const validation =
        err.data?.errors?.type?.[0] ||
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
      type: post.type || '',
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
      await api.deletePost(id, apiOpts)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const typeOptions =
    types.some((t) => t.name === form.type) || !form.type
      ? types
      : [...types, { id: `legacy-type-${form.type}`, name: form.type }]

  const selectedType = types.find((t) => t.name === form.type)
  const isReelType =
    selectedType?.slug === 'reel' ||
    selectedType?.slug === 'reels' ||
    /^reels?$/i.test(String(form.type || '').trim())

  const categoryOptions =
    categories.some((c) => c.name === form.category) || !form.category
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
          <p className="muted">
            Set type, category, tags, credits, and attachment. Choose type Reel to upload a video.
          </p>
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
            Type
            <select
              required
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="">Select a type</option>
              {typeOptions.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>
            {types.length === 0 && (
              <span className="field-hint">
                No types yet. <Link to="/my-dashboard/types">Add types</Link> first.
              </span>
            )}
          </label>
          <label>
            Category
            <select
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select a category</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <span className="field-hint">
                No categories yet. <Link to="/my-dashboard/categories">Add categories</Link> first.
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
              No tags yet. <Link to="/my-dashboard/tags">Add tags</Link> first.
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
          {isReelType ? 'Video' : 'Attachment'}
          <input
            type="file"
            accept={
              isReelType
                ? 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm'
                : '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.mp4,.mov,.webm,.zip'
            }
            onChange={(e) => setForm({ ...form, attachment: e.target.files?.[0] || null })}
          />
          {isReelType ? (
            <span className="field-hint">
              Upload an MP4, MOV, or WEBM video. It autoplays on the listing and detail pages.
            </span>
          ) : (
            <span className="field-hint">Images, documents, or video files.</span>
          )}
        </label>
        {editingId && posts.find((p) => p.id === editingId)?.attachment_name && (
          <p className="muted field-hint">
            Current file: {posts.find((p) => p.id === editingId)?.attachment_name}
            {posts.find((p) => p.id === editingId)?.is_video ? ' (video)' : ''}
          </p>
        )}
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
              {post.cover_url ? (
                <img className="admin-thumb" src={post.cover_url} alt="" />
              ) : post.video_url || post.is_reel ? (
                <div className="admin-thumb fallback reel-thumb">Reel</div>
              ) : (
                <div className="admin-thumb fallback" />
              )}
              <div>
                <strong>{post.title}</strong>
                <p className="muted">
                  {post.type} · {post.category} · {post.credits_cost} credits
                  {post.is_video ? ' · video' : ''} · updated{' '}
                  {new Date(post.last_updated || post.updated_at).toLocaleString()}
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
