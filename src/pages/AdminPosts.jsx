import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEdit, FaTrash } from 'react-icons/fa'
import { api } from '../api/client'
import AdminPostThumb from '../components/AdminPostThumb'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
import MultiSelectField from '../components/MultiSelectField'
import RequiredMark from '../components/RequiredMark'
import RichTextEditor from '../components/RichTextEditor'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const emptyForm = {
  title: '',
  description: '',
  type: '',
  categories: [],
  tags: [],
  credits_cost: 10,
  canva_link: '',
  is_active: true,
  attachment: null,
}

function normalizeTagNames(tags) {
  if (!Array.isArray(tags)) return []
  return tags
    .map((tag) => (typeof tag === 'string' ? tag : tag?.name))
    .filter((name) => typeof name === 'string' && name.trim() !== '')
}

function normalizeCategoryNames(categories, legacyCategory) {
  if (Array.isArray(categories) && categories.length > 0) {
    return normalizeTagNames(categories)
  }
  if (typeof legacyCategory === 'string' && legacyCategory.trim()) {
    return legacyCategory.split(',').map((c) => c.trim()).filter(Boolean)
  }
  return []
}

function formatCategories(post) {
  const list = normalizeCategoryNames(post?.categories, post?.category)
  return list.length ? list.join(', ') : '—'
}

export default function AdminPosts({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const {
    actingHubId,
    isActingOnWhiteLabel,
    isActingRemotely,
    actingHub,
    isControlPlane,
    can,
  } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  // Create/edit only when manage_posts is on (Central library owns create; content hubs are list-only).
  const canManagePosts = can('dashboard_manage_posts')
  const hideCreateForm = !canManagePosts
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
  const formRef = useRef(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [postsRes, typesRes, catsRes, tagsRes] = isActingRemotely
        ? await Promise.all([
            api.hubContentPosts({ per_page: 50 }, apiOpts),
            api.hubContentTypes(apiOpts),
            api.hubContentCategories(apiOpts),
            api.hubContentTags(apiOpts),
          ])
        : await Promise.all([
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
    fd.append('categories', JSON.stringify(form.categories))
    fd.append('tags', JSON.stringify(form.tags))
    fd.append('credits_cost', String(form.credits_cost))
    fd.append('canva_link', form.canva_link || '')
    fd.append('is_active', form.is_active ? '1' : '0')
    if (form.attachment) fd.append('attachment', form.attachment)
    return fd
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.categories.length) {
      setError('Select at least one category.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (editingId) {
        await api.updatePost(editingId, toFormData(), apiOpts)
        setMessage(isActingRemotely ? `Post updated on ${actingHub?.name}.` : 'Post updated.')
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
        err.data?.errors?.categories?.[0] ||
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
      categories: normalizeCategoryNames(post.categories, post.category),
      tags: normalizeTagNames(post.tags),
      credits_cost: post.credits_cost || 10,
      canva_link: post.canva_link || '',
      is_active: post.is_active !== false,
      attachment: null,
    })
    // Scroll the form into view (dashboard content may not scroll via window).
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
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

  const categoryOptions = (() => {
    const known = new Set(categories.map((c) => c.name))
    const extras = (form.categories || [])
      .filter((name) => !known.has(name))
      .map((name) => ({ id: `legacy-${name}`, name }))
    return [...categories, ...extras]
  })()

  const tagOptions = (() => {
    const known = new Set(tags.map((t) => t.name))
    const extras = (form.tags || [])
      .filter((name) => !known.has(name))
      .map((name) => ({ id: `legacy-${name}`, name }))
    return [...tags, ...extras]
  })()

  const postColumns = useMemo(
    () => [
      {
        key: 'title',
        label: 'Title',
        grow: true,
        filterValue: (row) => row.title,
        render: (row) => (
          <div className="admin-post-grid-title">
            <AdminPostThumb post={row} />
            <span>{row.title}</span>
          </div>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        fit: true,
        filterValue: (row) =>
          row.is_reel || /^reels?$/i.test(String(row.type || '')) ? 'Reel' : row.type || 'Post',
        render: (row) =>
          row.is_reel || /^reels?$/i.test(String(row.type || '')) ? 'Reel' : row.type || 'Post',
      },
      {
        key: 'categories',
        label: 'Categories',
        fit: true,
        filterValue: (row) => formatCategories(row),
        render: (row) => formatCategories(row),
      },
      {
        key: 'credits_cost',
        label: 'Credits',
        fit: true,
        filterValue: (row) => String(row.credits_cost ?? 0),
        render: (row) => row.credits_cost ?? 0,
      },
      {
        key: 'status',
        label: 'Status',
        fit: true,
        filterValue: (row) => (row.is_active === false ? 'Inactive' : 'Active'),
        render: (row) => (
          <span className={`admin-status-pill ${row.is_active === false ? 'is-off' : 'is-on'}`}>
            {row.is_active === false ? 'Inactive' : 'Active'}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">SM Template</p>
          <h1>
            {hideCreateForm
              ? 'Posts / reels'
              : editingId
                ? 'Edit post'
                : 'Add social media post'}
          </h1>
          <p className="muted">
            {hideCreateForm
              ? isControlPlane && !isActingRemotely
                ? 'Central catalog create/distribute lives under Central library. This page lists local posts only.'
                : 'Posts on this hub are list-only. New posts/reels are created in the Central content library and distributed here.'
              : isActingRemotely
                ? `Creating on ${actingHub?.name}'s database (use Control hub in the top bar to switch).`
                : 'Managing this hub’s catalog. Use Control hub in the top bar to work on another hub.'}
          </p>
        </div>
        {hideCreateForm && can('dashboard_central_content_library') && (
          <Link to="/my-dashboard/central-library" className="btn primary">
            Open Central library
          </Link>
        )}
      </div>

      {!hideCreateForm && (
      <form ref={formRef} className="admin-form" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        <div className="form-grid">
          <label>
            <RequiredMark>Title</RequiredMark>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Post title"
            />
          </label>

          <label>
            <RequiredMark>Type</RequiredMark>
            <select
              required
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
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
            <RequiredMark>Credits cost</RequiredMark>
            <input
              type="number"
              min={1}
              required
              value={form.credits_cost}
              onChange={(e) => setForm((prev) => ({ ...prev, credits_cost: e.target.value }))}
            />
          </label>

          <label>
            Canva link
            <input
              type="url"
              placeholder="https://www.canva.com/design/..."
              value={form.canva_link}
              onChange={(e) => setForm((prev) => ({ ...prev, canva_link: e.target.value }))}
            />
            <span className="field-hint">
              Optional. Buyers can open this after purchase.
            </span>
          </label>

          <div className="admin-field">
            <RequiredMark>Categories</RequiredMark>
            <MultiSelectField
              options={categoryOptions}
              value={form.categories}
              onChange={(categories) => setForm((prev) => ({ ...prev, categories }))}
              placeholder="Select a category to add…"
              emptyHint={
                <>
                  No categories yet. <Link to="/my-dashboard/categories">Add categories</Link> first.
                </>
              }
            />
          </div>

          <div className="admin-field">
            <span className="field-label-text">Tags</span>
            <MultiSelectField
              options={tagOptions}
              value={form.tags}
              onChange={(tags) => setForm((prev) => ({ ...prev, tags }))}
              placeholder="Select a tag to add…"
            />
          </div>

          <div className="admin-field form-grid__full">
            <span className="field-label-text">Description</span>
            <RichTextEditor
              key={editingId != null ? `edit-${editingId}` : 'create'}
              rows={4}
              value={form.description}
              onChange={(html) => setForm((prev) => ({ ...prev, description: html }))}
              placeholder="Describe this post or reel…"
            />
          </div>

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
                setForm((prev) => ({ ...prev, attachment: e.target.files?.[0] || null }))
              }
            />
            <span className="field-hint">
              {isReelType
                ? 'Upload an MP4, MOV, or WebM file.'
                : 'Image, PDF, document, video, or ZIP.'}
            </span>
          </label>

          <label className="admin-field admin-field--check">
            <span className="field-label-text">Visibility</span>
            <span className="checkbox">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
              Active in catalog
            </span>
          </label>
        </div>

        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving
              ? 'Saving...'
              : editingId
                ? 'Update post'
                : isActingRemotely
                  ? `Create on ${actingHub?.name || 'white-labelled'}`
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
      )}

      {hideCreateForm && error && <div className="alert">{error}</div>}
      {hideCreateForm && message && <div className="alert success">{message}</div>}

      <div className="admin-posts-head">
        <div>
          <h2 className="section-title">
            {isActingRemotely ? `Posts on ${actingHub?.name}` : 'Existing posts'}
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
      <DataGrid
        columns={postColumns}
        rows={posts}
        loading={loading}
        emptyMessage={
          hideCreateForm
            ? isControlPlane && !isActingRemotely
              ? 'No local posts on Central. Create and distribute from Central library.'
              : 'No posts on this hub yet. Content arrives when Central distributes archived library posts.'
            : 'No posts yet. Create a post or reel above and it will show up here.'
        }
        pageSize={10}
        getRowKey={(row) => row.id}
        actions={(row) =>
          hideCreateForm ? null : (
          <>
            <DataGridIconBtn
              icon={FaEdit}
              label={editingId === row.id ? 'Editing…' : 'Edit'}
              onClick={() => edit(row)}
            />
            <DataGridIconBtn
              icon={FaTrash}
              label="Delete"
              variant="danger"
              onClick={() => remove(row.id)}
            />
          </>
          )
        }
      />
      <style>{`
        .admin-post-grid-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0;
        }
        .admin-post-grid-title .admin-thumb-wrap {
          flex-shrink: 0;
        }
        .admin-post-grid-title > span {
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </section>
  )
}
