import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

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
  const { actingHubId, isActingOnWhiteLabel, actingHub } = useHub()
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
    setEditingId(null)
    setForm(emptyForm)
    setNewPosts([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingHubId])

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
    if (isActingOnWhiteLabel) {
      setError(
        'While controlling a white-label hub, select existing posts from that hub (inline new posts are shared-hub only).'
      )
      return
    }
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

    if (!isActingOnWhiteLabel) {
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
    }

    return fd
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (form.post_ids.length === 0 && (isActingOnWhiteLabel || newPosts.length === 0)) {
      setError(
        isActingOnWhiteLabel
          ? 'Select at least one post that already exists on this white-label hub.'
          : 'Add at least one existing post or a new post to the bundle.'
      )
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (editingId) {
        await api.updateBundle(editingId, toFormData(), apiOpts)
        setMessage(isActingOnWhiteLabel ? `Bundle updated on ${actingHub?.name}.` : 'Bundle updated.')
      } else {
        const data = await api.createBundle(toFormData(), apiOpts)
        setMessage(data.message || 'Bundle created.')
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
      if (isActingOnWhiteLabel) {
        setEditingId(bundle.id)
        setForm({
          title: bundle.title || '',
          description: bundle.description || '',
          credits_cost: bundle.credits_cost || 20,
          is_active: bundle.is_active !== false,
          post_ids: [],
        })
        setNewPosts([])
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
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
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this bundle?')) return
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
      String(post.title || '').toLowerCase().includes(q) ||
      String(post.type || '').toLowerCase().includes(q) ||
      String(post.category || '').toLowerCase().includes(q)
    )
  })

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client Admin</p>
          <h1>{editingId ? 'Edit bundle' : 'Post bundles'}</h1>
          <p className="muted">
            {isActingOnWhiteLabel
              ? `Bundles on ${actingHub?.name} use that hub's posts only. Switch hubs from the top bar.`
              : 'Group posts into a bundle. Use Control hub in the top bar to manage a white-label hub.'}
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

        <label>
          Description
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
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

        <fieldset className="tag-picker">
          <legend>Existing posts</legend>
          <input
            type="search"
            placeholder="Search posts..."
            value={postSearch}
            onChange={(e) => setPostSearch(e.target.value)}
          />
          <div className="tag-options">
            {filteredPosts.map((post) => (
              <label key={post.id} className="checkbox">
                <input
                  type="checkbox"
                  checked={form.post_ids.includes(post.id)}
                  onChange={() => toggleExistingPost(post.id)}
                />
                {post.title}
              </label>
            ))}
          </div>
          {posts.length === 0 && (
            <p className="muted field-hint">
              No posts yet. <Link to="/my-dashboard/posts">Add posts</Link> first.
            </p>
          )}
        </fieldset>

        {!isActingOnWhiteLabel && (
          <fieldset className="tag-picker">
            <legend>Or create new posts in this bundle</legend>
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
                  <option value="">Select</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
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
                  <option value="">Select</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Credits
                <input
                  type="number"
                  min={1}
                  value={draftPost.credits_cost}
                  onChange={(e) => setDraftPost({ ...draftPost, credits_cost: e.target.value })}
                />
              </label>
            </div>
            <div className="tag-options">
              {tags.map((tag) => (
                <label key={tag.id} className="checkbox">
                  <input
                    type="checkbox"
                    checked={draftPost.tags.includes(tag.name)}
                    onChange={() => toggleDraftTag(tag.name)}
                  />
                  {tag.name}
                </label>
              ))}
            </div>
            <label>
              Attachment
              <input
                type="file"
                onChange={(e) =>
                  setDraftPost({ ...draftPost, attachment: e.target.files?.[0] || null })
                }
              />
            </label>
            <button type="button" className="btn ghost" onClick={addDraftPost}>
              Add post to bundle draft
            </button>
            {newPosts.length > 0 && (
              <ul>
                {newPosts.map((p, i) => (
                  <li key={`draft-${i}`}>
                    {p.title}{' '}
                    <button type="button" className="btn ghost" onClick={() => removeDraftPost(i)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        )}

        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving
              ? 'Saving...'
              : editingId
                ? 'Update bundle'
                : isActingOnWhiteLabel
                  ? `Create on ${actingHub?.name || 'hub'}`
                  : 'Create bundle'}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setEditingId(null)
                setForm(emptyForm)
                setNewPosts([])
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 className="section-title">
        {isActingOnWhiteLabel ? `Bundles on ${actingHub?.name}` : 'Existing bundles'}
      </h2>
      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <div className="admin-list">
          {bundles.map((bundle) => (
            <div key={bundle.id} className="admin-row">
              <div>
                <strong>{bundle.title}</strong>
                <p className="muted">
                  {bundle.posts_count ?? bundle.posts?.length ?? 0} posts · {bundle.credits_cost}{' '}
                  credits
                </p>
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
