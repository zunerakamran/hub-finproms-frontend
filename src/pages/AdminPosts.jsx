import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import AdminPostThumb from '../components/AdminPostThumb'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

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
  const { actingHubId, isActingOnWhiteLabel, actingHub } = useHub()
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
    setError('')
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
    setEditingId(null)
    setForm(emptyForm)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingHubId])

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
        setMessage(isActingOnWhiteLabel ? `Post updated on ${actingHub?.name}.` : 'Post updated.')
      } else {
        const data = await api.createPost(toFormData(), apiOpts)
        setMessage(data.message || 'Post created.')
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
          <p className="eyebrow">Content</p>
          <h1>{editingId ? 'Edit post' : 'Add social media post'}</h1>
          <p className="muted">
            {isActingOnWhiteLabel
              ? `Creating on ${actingHub?.name}'s database (use Control hub in the top bar to switch).`
              : 'Managing the shared hub catalog. Use Control hub in the top bar to work on a white-label hub.'}
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
                No types yet. <Link to="/my-dashboard/types">Add types</Link> for this hub first.
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
                <option key={category.id || category.name} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Credits cost
            <input
              type="number"
              min={1}
              required
              value={form.credits_cost}
              onChange={(e) => setForm({ ...form, credits_cost: e.target.value })}
            />
          </label>
        </div>
        <fieldset className="tag-picker">
          <legend>Tags</legend>
          <div className="tag-options">
            {tagOptions.map((tag) => (
              <label key={tag.id || tag.name} className="checkbox">
                <input
                  type="checkbox"
                  checked={form.tags.includes(tag.name)}
                  onChange={() => toggleTag(tag.name)}
                />
                {tag.name}
              </label>
            ))}
          </div>
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
            {saving
              ? 'Saving...'
              : editingId
                ? 'Update post'
                : isActingOnWhiteLabel
                  ? `Create on ${actingHub?.name || 'white-label'}`
                  : 'Create post'}
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

      <div className="admin-posts-head">
        <div>
          <h2 className="section-title">
            {isActingOnWhiteLabel ? `Posts on ${actingHub?.name}` : 'Existing posts'}
          </h2>
          <p className="muted admin-posts-head__sub">
            {loading
              ? 'Loading catalog…'
              : posts.length === 0
                ? 'Nothing published yet.'
                : `${posts.length} item${posts.length === 1 ? '' : 's'} in this hub`}
          </p>
        </div>
      </div>
      {loading ? (
        <div className="state">Loading posts…</div>
      ) : posts.length === 0 ? (
        <div className="state admin-posts-empty">
          <strong>No posts yet</strong>
          <p className="muted">Create a post or reel above and it will show up here.</p>
        </div>
      ) : (
        <div className="admin-list admin-posts-list">
          {posts.map((post) => {
            const isReel = Boolean(post.is_reel)
            const isEditing = editingId === post.id
            const tags = Array.isArray(post.tags) ? post.tags.slice(0, 4) : []

            return (
              <article
                key={post.id}
                className={[
                  'admin-row',
                  'admin-post-row',
                  isReel ? 'is-reel' : '',
                  isEditing ? 'is-editing' : '',
                  post.is_active === false ? 'is-inactive' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <AdminPostThumb post={post} />
                <div className="admin-post-row__meta">
                  <div className="admin-post-row__title-line">
                    <h3 className="admin-post-row__title">{post.title}</h3>
                    <span className={`admin-status-pill ${post.is_active === false ? 'is-off' : 'is-on'}`}>
                      {post.is_active === false ? 'Inactive' : 'Active'}
                    </span>
                  </div>
                  <div className="admin-post-row__chips">
                    <span className={`admin-type-chip ${isReel ? 'is-reel' : ''}`.trim()}>
                      {isReel ? 'Reel' : post.type || 'Post'}
                    </span>
                    {post.category ? (
                      <span className="admin-meta-chip">{post.category}</span>
                    ) : null}
                    <span className="admin-meta-chip">{post.credits_cost ?? 0} credits</span>
                  </div>
                  {tags.length > 0 ? (
                    <div className="admin-post-row__tags">
                      {tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  ) : null}
                  <div className="admin-post-row__stats muted">
                    <span>{Number(post.reach_count ?? 0)} reach</span>
                    <span>{Number(post.views_count ?? 0)} views</span>
                    <span>{Number(post.buy_count ?? 0)} buys</span>
                  </div>
                </div>
                <div className="admin-post-row__actions actions">
                  <button className="btn ghost" type="button" onClick={() => edit(post)}>
                    {isEditing ? 'Editing…' : 'Edit'}
                  </button>
                  <button className="btn danger" type="button" onClick={() => remove(post.id)}>
                    Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
