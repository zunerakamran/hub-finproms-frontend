import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const emptyForm = {
  title: '',
  description: '',
  credits_cost: 20,
  is_active: true,
  post_ids: [],
}

const emptyNewPost = {
  title: '',
  description: '',
  type: '',
  category: '',
  tags: [],
  credits_cost: 10,
  attachment: null,
}

export default function AdminBundles({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const apiOpts = { asPowerAdmin }
  const [bundles, setBundles] = useState([])
  const [posts, setPosts] = useState([])
  const [types, setTypes] = useState([])
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [newPosts, setNewPosts] = useState([])
  const [draftPost, setDraftPost] = useState(emptyNewPost)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [postSearch, setPostSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [bundlesRes, postsRes, typesRes, catsRes, tagsRes] = await Promise.all([
        api.adminBundles({ per_page: 50 }, apiOpts),
        api.posts({ per_page: 100 }),
        api.listTypes(),
        api.listCategories(),
        api.listTags(),
      ])
      setBundles(bundlesRes.data || [])
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

  const toggleExistingPost = (postId) => {
    setForm((prev) => {
      const selected = prev.post_ids.includes(postId)
        ? prev.post_ids.filter((id) => id !== postId)
        : [...prev.post_ids, postId]
      return { ...prev, post_ids: selected }
    })
  }

  const toggleDraftTag = (tagName) => {
    setDraftPost((prev) => {
      const selected = prev.tags.includes(tagName)
        ? prev.tags.filter((t) => t !== tagName)
        : [...prev.tags, tagName]
      return { ...prev, tags: selected }
    })
  }

  const addDraftPost = () => {
    if (!draftPost.title.trim() || !draftPost.type || !draftPost.category) {
      setError('New post needs a title, type, and category before adding to the bundle.')
      return
    }
    setError('')
    setNewPosts((prev) => [...prev, { ...draftPost }])
    setDraftPost(emptyNewPost)
  }

  const removeDraftPost = (index) => {
    setNewPosts((prev) => prev.filter((_, i) => i !== index))
  }

  const toFormData = () => {
    const fd = new FormData()
    fd.append('title', form.title)
    fd.append('description', form.description || '')
    fd.append('credits_cost', String(form.credits_cost))
    fd.append('is_active', form.is_active ? '1' : '0')
    fd.append('post_ids', JSON.stringify(form.post_ids))

    newPosts.forEach((post, index) => {
      fd.append(`new_posts[${index}][title]`, post.title)
      fd.append(`new_posts[${index}][description]`, post.description || '')
      fd.append(`new_posts[${index}][type]`, post.type)
      fd.append(`new_posts[${index}][category]`, post.category)
      fd.append(`new_posts[${index}][tags]`, JSON.stringify(post.tags || []))
      fd.append(`new_posts[${index}][credits_cost]`, String(post.credits_cost || 1))
      if (post.attachment) {
        fd.append(`new_posts[${index}][attachment]`, post.attachment)
      }
    })

    return fd
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (form.post_ids.length === 0 && newPosts.length === 0) {
      setError('Add at least one existing post or a new post to the bundle.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (editingId) {
        await api.updateBundle(editingId, toFormData(), apiOpts)
        setMessage('Bundle updated.')
      } else {
        await api.createBundle(toFormData(), apiOpts)
        setMessage('Bundle created.')
      }
      setForm(emptyForm)
      setNewPosts([])
      setDraftPost(emptyNewPost)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err.data?.errors?.post_ids?.[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  const edit = async (bundle) => {
    setError('')
    setMessage('')
    try {
      const data = await api.adminBundle(bundle.id, apiOpts)
      const full = data.bundle || bundle
      setEditingId(full.id)
      setForm({
        title: full.title || '',
        description: full.description || '',
        credits_cost: full.credits_cost || 20,
        is_active: full.is_active !== false,
        post_ids: (full.posts || []).map((p) => p.id),
      })
      setNewPosts([])
      setDraftPost(emptyNewPost)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this bundle? Posts inside it are not deleted.')) return
    try {
      await api.deleteBundle(id, apiOpts)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const filteredPosts = posts.filter((post) => {
    if (!postSearch.trim()) return true
    const q = postSearch.toLowerCase()
    return (
      post.title?.toLowerCase().includes(q) ||
      post.type?.toLowerCase().includes(q) ||
      post.category?.toLowerCase().includes(q)
    )
  })

  const selectedType = types.find((t) => t.name === draftPost.type)
  const isReelType =
    selectedType?.slug === 'reel' ||
    selectedType?.slug === 'reels' ||
    /^reels?$/i.test(String(draftPost.type || '').trim())

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client Admin</p>
          <h1>{editingId ? 'Edit bundle' : 'Create post bundle'}</h1>
          <p className="muted">
            Group existing posts/reels or add new ones, then set a description and total credits for
            the bundle.
          </p>
        </div>
      </div>

      <form className="admin-form" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        <div className="form-grid">
          <label>
            Bundle title
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            Total credits
            <input
              type="number"
              min="1"
              required
              value={form.credits_cost}
              onChange={(e) => setForm({ ...form, credits_cost: e.target.value })}
            />
          </label>
        </div>

        <label>
          Description
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What is included in this bundle?"
          />
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Active (visible in catalog)
        </label>

        <fieldset className="tag-picker">
          <legend>Add existing posts / reels</legend>
          <label>
            Search posts
            <input
              value={postSearch}
              onChange={(e) => setPostSearch(e.target.value)}
              placeholder="Filter by title, type, or category"
            />
          </label>
          {filteredPosts.length === 0 ? (
            <p className="field-hint">
              No posts yet. <Link to="/my-dashboard/posts">Create posts</Link> first, or add a new
              post below.
            </p>
          ) : (
            <div className="tag-options bundle-post-picker">
              {filteredPosts.map((post) => (
                <label key={post.id} className="checkbox tag-option">
                  <input
                    type="checkbox"
                    checked={form.post_ids.includes(post.id)}
                    onChange={() => toggleExistingPost(post.id)}
                  />
                  <span>
                    <strong>{post.title}</strong>
                    <span className="muted">
                      {' '}
                      · {post.type} · {post.category} · {post.credits_cost} cr
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <p className="field-hint">{form.post_ids.length} existing post(s) selected.</p>
        </fieldset>

        <fieldset className="tag-picker">
          <legend>Create new post / reel and add to bundle</legend>
          <div className="form-grid">
            <label>
              Title
              <input
                value={draftPost.title}
                onChange={(e) => setDraftPost({ ...draftPost, title: e.target.value })}
              />
            </label>
            <label>
              Type
              <select
                value={draftPost.type}
                onChange={(e) => setDraftPost({ ...draftPost, type: e.target.value })}
              >
                <option value="">Select a type</option>
                {types.map((type) => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Category
              <select
                value={draftPost.category}
                onChange={(e) => setDraftPost({ ...draftPost, category: e.target.value })}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Credits (individual)
              <input
                type="number"
                min="1"
                value={draftPost.credits_cost}
                onChange={(e) => setDraftPost({ ...draftPost, credits_cost: e.target.value })}
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              rows={2}
              value={draftPost.description}
              onChange={(e) => setDraftPost({ ...draftPost, description: e.target.value })}
            />
          </label>
          {tags.length > 0 && (
            <div className="tag-options">
              {tags.map((tag) => (
                <label key={tag.id} className="checkbox tag-option">
                  <input
                    type="checkbox"
                    checked={draftPost.tags.includes(tag.name)}
                    onChange={() => toggleDraftTag(tag.name)}
                  />
                  {tag.name}
                </label>
              ))}
            </div>
          )}
          <label>
            {isReelType ? 'Video' : 'Attachment'}
            <input
              type="file"
              accept={
                isReelType
                  ? 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm'
                  : '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.mp4,.mov,.webm,.zip'
              }
              onChange={(e) =>
                setDraftPost({ ...draftPost, attachment: e.target.files?.[0] || null })
              }
            />
          </label>
          <button type="button" className="btn ghost" onClick={addDraftPost}>
            Add this post to bundle
          </button>

          {newPosts.length > 0 && (
            <div className="admin-list" style={{ marginTop: '1rem' }}>
              {newPosts.map((post, index) => (
                <div key={`new-${index}`} className="admin-row">
                  <div>
                    <strong>{post.title}</strong>
                    <p className="muted">
                      New · {post.type} · {post.category}
                      {post.attachment ? ` · ${post.attachment.name}` : ''}
                    </p>
                  </div>
                  <button type="button" className="btn danger" onClick={() => removeDraftPost(index)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update bundle' : 'Create bundle'}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setEditingId(null)
                setForm(emptyForm)
                setNewPosts([])
                setDraftPost(emptyNewPost)
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 className="section-title">Existing bundles</h2>
      {loading ? (
        <div className="state">Loading...</div>
      ) : bundles.length === 0 ? (
        <div className="empty-state">
          <p className="muted">No bundles yet.</p>
        </div>
      ) : (
        <div className="admin-list">
          {bundles.map((bundle) => (
            <div key={bundle.id} className="admin-row">
              <div>
                <strong>{bundle.title}</strong>
                <p className="muted">
                  {bundle.posts_count ?? bundle.posts?.length ?? 0} posts · {bundle.credits_cost}{' '}
                  credits
                  {bundle.is_active === false ? ' · inactive' : ''}
                </p>
                {bundle.description && <p className="muted">{bundle.description}</p>}
              </div>
              <div className="actions">
                <button className="btn ghost" onClick={() => edit(bundle)}>
                  Edit
                </button>
                <button className="btn danger" onClick={() => remove(bundle.id)}>
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
