import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaArrowDown, FaArrowUp, FaEdit, FaTrash } from 'react-icons/fa'
import { api } from '../api/client'
import AdminPostThumb from '../components/AdminPostThumb'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
import MultiSelectField from '../components/MultiSelectField'
import FileDropzone from '../components/FileDropzone'
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
  const isCentralPosts = isControlPlane && !isActingRemotely
  const canManagePosts = can('dashboard_manage_posts')
  const canEditPosts =
    isCentralPosts && (can('dashboard_view_posts') || can('dashboard_manage_posts'))
  const canDeletePosts = can('dashboard_view_posts') || can('dashboard_manage_posts')
  const canArchivePosts = isCentralPosts && can('dashboard_central_content_library')
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
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [distributedOnly, setDistributedOnly] = useState(false)
  const [archiveRemarks, setArchiveRemarks] = useState({})
  const formRef = useRef(null)
  const showPostForm = canManagePosts || (canEditPosts && Boolean(editingId))

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
            api.adminPosts(
              {
                per_page: 50,
                ...(isCentralPosts && statusFilter !== 'all' ? { status: statusFilter } : {}),
                ...(isCentralPosts && sourceFilter ? { source: sourceFilter } : {}),
                ...(isCentralPosts && typeFilter ? { type: typeFilter } : {}),
                ...(isCentralPosts && search.trim() ? { search: search.trim() } : {}),
                ...(isCentralPosts && distributedOnly ? { distributed_only: true } : {}),
              },
              apiOpts
            ),
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
  }, [actingHubId, statusFilter, sourceFilter, typeFilter, distributedOnly])

  useEffect(() => {
    if (!isCentralPosts) return undefined
    const handle = window.setTimeout(() => {
      load()
    }, 300)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

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
    if (!editingId && !canManagePosts) {
      setError('Create new posts from the Central content library.')
      return
    }
    if (editingId && !canEditPosts && !canManagePosts) {
      setError('Editing posts is only available on the Central Hub.')
      return
    }
    if (!form.categories.length) {
      setError('Select at least one category.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (editingId) {
        const data = await api.updatePost(editingId, toFormData(), apiOpts)
        setMessage(
          data.message ||
            (isActingRemotely ? `Post updated on ${actingHub?.name}.` : 'Post updated.')
        )
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

  const onArchive = async (post) => {
    const remarks = (archiveRemarks[post.id] || '').trim()
    if (!remarks) {
      setError('Enter archive remarks before archiving.')
      return
    }
    setError('')
    setMessage('')
    try {
      const data = await api.archiveCentralLibraryPost(post.id, remarks, apiOpts)
      setMessage(data.message || 'Post archived.')
      setArchiveRemarks((prev) => {
        const next = { ...prev }
        delete next[post.id]
        return next
      })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const onUnarchive = async (post) => {
    setError('')
    setMessage('')
    try {
      const data = await api.unarchiveCentralLibraryPost(post.id, apiOpts)
      setMessage(data.message || 'Post unarchived.')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const formatDistributedHubs = (post) => {
    const hubs = Array.isArray(post.distributed_hubs) ? post.distributed_hubs : []
    if (hubs.length === 0) return 'Not distributed'
    return hubs.map((h) => h.hub_name).join(', ')
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
    () => {
      const cols = [
        {
          key: 'title',
          label: 'Title',
          grow: true,
          filterValue: (row) => row.title,
          render: (row) => (
            <div className="admin-post-grid-title">
              <Link to={`/posts/${row.id}`} className="admin-post-grid-title__link">
                <AdminPostThumb post={row} />
                <span>{row.title}</span>
              </Link>
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
      ]

      if (isCentralPosts) {
        cols.push(
          {
            key: 'creation_source',
            label: 'Source',
            fit: true,
            filterValue: (row) => row.creation_source || 'manual',
            render: (row) => (
              <span className="admin-status-pill is-on">{row.creation_source || 'manual'}</span>
            ),
          },
          {
            key: 'library_status',
            label: 'Library',
            fit: true,
            filterValue: (row) =>
              row.archived_at || row.is_archived
                ? `Archived ${row.archive_remarks || ''}`
                : 'Ready',
            render: (row) =>
              row.archived_at || row.is_archived ? (
                <span className="admin-status-pill is-off" title={row.archive_remarks || ''}>
                  Archived
                </span>
              ) : (
                <span className="admin-status-pill is-on">Ready</span>
              ),
          },
          {
            key: 'distributed_hubs',
            label: 'Published on',
            grow: true,
            filterValue: (row) => formatDistributedHubs(row),
            render: (row) => {
              const hubs = Array.isArray(row.distributed_hubs) ? row.distributed_hubs : []
              if (hubs.length === 0) {
                return <span className="muted">Not distributed</span>
              }
              return (
                <div className="admin-post-hubs">
                  {hubs.map((hub) => (
                    <span key={`${row.id}-${hub.hub_id}`} className="admin-status-pill is-on">
                      {hub.hub_name}
                    </span>
                  ))}
                </div>
              )
            },
          }
        )
      } else {
        cols.push({
          key: 'status',
          label: 'Status',
          fit: true,
          filterValue: (row) => (row.is_active === false ? 'Inactive' : 'Active'),
          render: (row) => (
            <span className={`admin-status-pill ${row.is_active === false ? 'is-off' : 'is-on'}`}>
              {row.is_active === false ? 'Inactive' : 'Active'}
            </span>
          ),
        })
      }

      if (canArchivePosts) {
        cols.push({
          key: 'archive_remarks_input',
          label: 'Archive remarks',
          grow: true,
          filterable: false,
          sortable: false,
          render: (row) =>
            row.archived_at || row.is_archived ? (
              <span className="muted">{row.archive_remarks || '—'}</span>
            ) : (
              <input
                className="data-grid__filter-input"
                value={archiveRemarks[row.id] || ''}
                onChange={(e) =>
                  setArchiveRemarks((prev) => ({ ...prev, [row.id]: e.target.value }))
                }
                placeholder="Remarks to archive"
                onClick={(e) => e.stopPropagation()}
              />
            ),
        })
      }

      return cols
    },
    [isCentralPosts, canArchivePosts, archiveRemarks]
  )

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">SM Template</p>
          <h1>
            {editingId && (canEditPosts || canManagePosts)
              ? 'Edit post'
              : hideCreateForm
                ? 'Posts / reels'
                : 'Add social media post'}
          </h1>
          <p className="muted">
            {isCentralPosts
              ? 'All Central library posts (ready and archived). Edit updates every hub this post was distributed to. Create and distribute from Central library.'
              : hideCreateForm
                ? 'New posts arrive from the Central content library. You can delete posts on this hub.'
                : isActingRemotely
                  ? `Creating on ${actingHub?.name}'s database (use Control hub in the top bar to switch).`
                  : 'Managing this hub’s catalog. Use Control hub in the top bar to work on another hub.'}
          </p>
        </div>
        {can('dashboard_central_content_library') && (
          <Link to="/my-dashboard/central-library" className="btn primary">
            Open Central library
          </Link>
        )}
      </div>

      {isCentralPosts && (
        <div className="library-toolbar" style={{ marginBottom: '1rem' }}>
          <div className="library-toolbar__filters">
            <button
              type="button"
              className={`btn ghost${statusFilter === 'all' ? ' is-selected' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`btn ghost${statusFilter === 'active' ? ' is-selected' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Ready
            </button>
            <button
              type="button"
              className={`btn ghost${statusFilter === 'archived' ? ' is-selected' : ''}`}
              onClick={() => setStatusFilter('archived')}
            >
              Archived
            </button>
            <button
              type="button"
              className={`btn ghost${distributedOnly ? ' is-selected' : ''}`}
              onClick={() => setDistributedOnly((v) => !v)}
            >
              Distributed only
            </button>
          </div>
          <div className="library-toolbar__filters">
            <input
              type="search"
              className="data-grid__filter-input"
              placeholder="Search title or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 220 }}
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by type"
            >
              <option value="">All types</option>
              {types.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              aria-label="Filter by source"
            >
              <option value="">All sources</option>
              <option value="manual">Manual</option>
              <option value="import">Import</option>
              <option value="ai">AI</option>
            </select>
          </div>
        </div>
      )}

      {showPostForm && (
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

          <FileDropzone
            id="admin-post-attachment"
            label={isReelType ? 'Video' : 'Attachment'}
            accept={
              isReelType
                ? 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm'
                : '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.mp4,.mov,.webm,.zip'
            }
            hint={
              isReelType
                ? 'Upload an MP4, MOV, or WebM file.'
                : 'Image, PDF, document, video, or ZIP.'
            }
            files={form.attachment ? [form.attachment] : []}
            onChange={(next) =>
              setForm((prev) => ({ ...prev, attachment: next[0] || null }))
            }
          />

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

      {!showPostForm && error && <div className="alert">{error}</div>}
      {!showPostForm && message && <div className="alert success">{message}</div>}

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
          isCentralPosts
            ? 'No Central posts match these filters. Create posts in the Central library.'
            : hideCreateForm
              ? 'No posts on this hub yet. Content arrives when Central distributes library posts.'
              : 'No posts yet. Create a post or reel above and it will show up here.'
        }
        pageSize={10}
        getRowKey={(row) => row.id}
        actions={
          canEditPosts || canDeletePosts || canArchivePosts
            ? (row) => {
                const archived = Boolean(row.archived_at || row.is_archived)
                return (
                  <>
                    {canEditPosts && !archived && (
                      <DataGridIconBtn
                        icon={FaEdit}
                        label={editingId === row.id ? 'Editing…' : 'Edit'}
                        onClick={() => edit(row)}
                      />
                    )}
                    {canArchivePosts &&
                      (archived ? (
                        <DataGridIconBtn
                          icon={FaArrowUp}
                          label="Unarchive"
                          onClick={() => onUnarchive(row)}
                        />
                      ) : (
                        <DataGridIconBtn
                          icon={FaArrowDown}
                          label="Archive"
                          onClick={() => onArchive(row)}
                        />
                      ))}
                    {canDeletePosts && (
                      <DataGridIconBtn
                        icon={FaTrash}
                        label="Delete"
                        variant="danger"
                        onClick={() => remove(row.id)}
                      />
                    )}
                  </>
                )
              }
            : null
        }
      />
      <style>{`
        .admin-post-grid-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0;
        }
        .admin-post-grid-title__link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0;
          color: inherit;
          text-decoration: none;
        }
        .admin-post-grid-title__link:hover span {
          color: var(--brand);
          text-decoration: underline;
        }
        .admin-post-grid-title .admin-thumb-wrap {
          flex-shrink: 0;
        }
        .admin-post-grid-title__link > span {
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .admin-post-hubs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }
      `}</style>
    </section>
  )
}
