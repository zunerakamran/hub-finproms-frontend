import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import AdminPostThumb from '../components/AdminPostThumb'
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

const TABS = [
  { id: 'library', label: 'Library' },
  { id: 'create', label: 'Create' },
  { id: 'ai', label: 'AI posts' },
  { id: 'distribute', label: 'Distribute' },
]

function normalizeNames(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((item) => (typeof item === 'string' ? item : item?.name))
    .filter((name) => typeof name === 'string' && name.trim() !== '')
}

export default function CentralContentLibrary() {
  const { isPowerAdmin } = useAuth()
  const { isActingRemotely, can, refreshHub, hub } = useHub()
  const apiOpts = { asPowerAdmin: isPowerAdmin }

  const [tab, setTab] = useState('library')
  const [createMode, setCreateMode] = useState('one')
  const [posts, setPosts] = useState([])
  const [types, setTypes] = useState([])
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [targets, setTargets] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])
  const [selectedHubIds, setSelectedHubIds] = useState([])
  const [archiveRemarks, setArchiveRemarks] = useState({})
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [distributing, setDistributing] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const formRef = useRef(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (statusFilter === 'archived' || statusFilter === 'active') {
        params.status = statusFilter
      }
      const [postsRes, typesRes, catsRes, tagsRes, targetsRes] = await Promise.all([
        api.centralLibraryPosts({ per_page: 100, ...params }, apiOpts),
        api.listTypes(),
        api.listCategories(),
        api.listTags(),
        api.centralLibraryTargets(apiOpts),
      ])
      setPosts(postsRes.data || [])
      setTypes(typesRes.types || [])
      setCategories(catsRes.categories || [])
      setTags(tagsRes.tags || [])
      setTargets(targetsRes.hubs || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refreshHub({ silent: true })
      } catch {
        // Ignore — still attempt load with current caps.
      }
      if (cancelled) return
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isActingRemotely) return
    if (!can('dashboard_central_content_library')) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, isActingRemotely, hub?.effective_capabilities?.dashboard_central_content_library])

  const archivedPosts = useMemo(
    () => posts.filter((post) => post.archived_at || post.is_archived),
    [posts]
  )
  const livePosts = useMemo(
    () => posts.filter((post) => !post.archived_at && !post.is_archived),
    [posts]
  )
  const eligibleTargets = useMemo(
    () => targets.filter((hub) => hub.eligible),
    [targets]
  )

  const toFormData = () => {
    const fd = new FormData()
    fd.append('title', form.title.trim())
    fd.append('description', form.description || '')
    fd.append('type', form.type)
    fd.append('categories', JSON.stringify(form.categories))
    fd.append('tags', JSON.stringify(form.tags))
    fd.append('credits_cost', String(form.credits_cost))
    if (form.canva_link) fd.append('canva_link', form.canva_link)
    fd.append('is_active', form.is_active ? '1' : '0')
    if (form.attachment) fd.append('attachment', form.attachment)
    return fd
  }

  const onCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.createCentralLibraryPost(toFormData(), apiOpts)
      setMessage(data.message || 'Post created in Central library.')
      setForm(emptyForm)
      setTab('library')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const downloadTemplate = async () => {
    setError('')
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(api.centralLibraryTemplateUrl(apiOpts), {
        headers: {
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Could not download template.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'central-posts-import-template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  const onImport = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Choose an Excel (.xlsx) file to import.')
      return
    }
    setImporting(true)
    setError('')
    setMessage('')
    try {
      const data = await api.importCentralLibraryPosts(file, apiOpts)
      setMessage(data.message || 'Import finished.')
      setFile(null)
      setTab('library')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
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

  const toggleSelected = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleHub = (id) => {
    setSelectedHubIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const onDistribute = async (e) => {
    e.preventDefault()
    if (selectedIds.length === 0) {
      setError('Select at least one archived post to distribute.')
      return
    }
    if (selectedHubIds.length === 0) {
      setError('Select at least one target hub.')
      return
    }
    setDistributing(true)
    setError('')
    setMessage('')
    try {
      const data = await api.distributeCentralLibraryPosts(
        { post_ids: selectedIds, hub_ids: selectedHubIds },
        apiOpts
      )
      setMessage(data.message || 'Distribution finished.')
      setSelectedIds([])
      setSelectedHubIds([])
    } catch (err) {
      setError(err.message)
    } finally {
      setDistributing(false)
    }
  }

  if (isActingRemotely) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Central</p>
            <h1>Content library</h1>
            <p className="muted">
              Switch the Control hub back to Central to manage the Central content library.
            </p>
          </div>
        </div>
        <div className="alert">
          Hub switcher is on a remote hub. Central library posts stay on Central only.
        </div>
      </section>
    )
  }

  if (!can('dashboard_central_content_library')) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Central</p>
            <h1>Content library</h1>
          </div>
        </div>
        <div className="alert">
          Central content library is not enabled for your role yet. Run migrations, then open{' '}
          <strong>Capabilities</strong> on Central and enable{' '}
          <em>Central content library</em> for Power Admin / FinProms admin. Refresh the page
          afterwards.
        </div>
      </section>
    )
  }

  return (
    <section className="central-library">
      <div className="page-head">
        <div>
          <p className="eyebrow">Central</p>
          <h1>Content library</h1>
          <p className="muted">
            Build posts in the Central database, archive them with remarks, then distribute copies
            to Shared or White-labelled hubs. Target hubs must have matching{' '}
            <strong>Manual posts</strong> or <strong>AI posts</strong> in Functionalities.
          </p>
        </div>
        <button type="button" className="btn primary" onClick={() => setTab('create')}>
          New post
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="library-tabs" role="tablist" aria-label="Content library sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`library-tabs__btn${tab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'library' && (
        <div className="settings-block">
          <div className="library-toolbar">
            <h2 style={{ margin: 0 }}>Posts in Central</h2>
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
            </div>
          </div>

          {loading ? (
            <div className="state">Loading…</div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <h2>No posts yet</h2>
              <p className="muted">Create a post or import from Excel to get started.</p>
              <button type="button" className="btn primary" onClick={() => setTab('create')}>
                Create post
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Title</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Credits</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => {
                    const archived = Boolean(post.archived_at || post.is_archived)
                    return (
                      <tr key={post.id}>
                        <td>
                          <AdminPostThumb post={post} />
                        </td>
                        <td>
                          <strong>{post.title}</strong>
                          <div className="muted" style={{ fontSize: '0.85em' }}>
                            {post.type}
                          </div>
                        </td>
                        <td>
                          <span className="admin-status-pill is-on">
                            {post.creation_source || 'manual'}
                          </span>
                        </td>
                        <td>
                          {archived ? (
                            <span className="admin-status-pill is-off" title={post.archive_remarks || ''}>
                              Archived
                            </span>
                          ) : (
                            <span className="admin-status-pill is-on">Ready</span>
                          )}
                        </td>
                        <td>{post.credits_cost}</td>
                        <td style={{ textAlign: 'right' }}>
                          {!archived && (
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => setTab('distribute')}
                            >
                              Archive / send
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'create' && (
        <div className="settings-block">
          <div className="library-mode-switch">
            <button
              type="button"
              className={`library-mode-switch__btn${createMode === 'one' ? ' is-active' : ''}`}
              onClick={() => setCreateMode('one')}
            >
              One by one
            </button>
            <button
              type="button"
              className={`library-mode-switch__btn${createMode === 'bulk' ? ' is-active' : ''}`}
              onClick={() => setCreateMode('bulk')}
            >
              Bulk Excel
            </button>
          </div>

          {createMode === 'bulk' ? (
            <form className="admin-form" onSubmit={onImport}>
              <p className="muted">
                Download the template, fill rows, then upload. Media attachments are not included in
                the sheet.
              </p>
              <div className="actions" style={{ marginBottom: 16 }}>
                <button type="button" className="btn ghost" onClick={downloadTemplate}>
                  Download Excel template
                </button>
              </div>
              <label>
                Excel file (.xlsx)
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
              <div className="actions sticky-actions">
                <button className="btn primary" type="submit" disabled={importing || !file}>
                  {importing ? 'Importing…' : 'Import posts'}
                </button>
              </div>
            </form>
          ) : (
            <form className="admin-form" onSubmit={onCreate} ref={formRef}>
              <div className="form-grid">
                <label>
                  <RequiredMark>Title</RequiredMark>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  <RequiredMark>Type</RequiredMark>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                    required
                  >
                    <option value="">Select type</option>
                    {types.map((type) => (
                      <option key={type.id || type.name} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <RequiredMark>Credits</RequiredMark>
                  <input
                    type="number"
                    min={1}
                    value={form.credits_cost}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, credits_cost: Number(e.target.value) || 1 }))
                    }
                    required
                  />
                </label>
                <label>
                  Canva link
                  <input
                    value={form.canva_link}
                    onChange={(e) => setForm((p) => ({ ...p, canva_link: e.target.value }))}
                    placeholder="https://"
                  />
                </label>
                <div className="admin-field">
                  <RequiredMark>Categories</RequiredMark>
                  <MultiSelectField
                    options={normalizeNames(categories)}
                    value={form.categories}
                    onChange={(next) => setForm((p) => ({ ...p, categories: next }))}
                    placeholder="Select a category to add…"
                    emptyHint={
                      <>
                        No categories yet. <Link to="/my-dashboard/categories">Add categories</Link>.
                      </>
                    }
                  />
                </div>
                <div className="admin-field">
                  <span className="field-label-text">Tags</span>
                  <MultiSelectField
                    options={normalizeNames(tags)}
                    value={form.tags}
                    onChange={(next) => setForm((p) => ({ ...p, tags: next }))}
                    placeholder="Select a tag to add…"
                  />
                </div>
                <label>
                  Attachment
                  <input
                    type="file"
                    onChange={(e) =>
                      setForm((p) => ({ ...p, attachment: e.target.files?.[0] || null }))
                    }
                  />
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  />
                  Active in library
                </label>
              </div>
              <div className="admin-field form-grid__full" style={{ marginTop: 12 }}>
                <span className="field-label-text">Description</span>
                <RichTextEditor
                  value={form.description}
                  onChange={(description) => setForm((p) => ({ ...p, description }))}
                />
              </div>
              <div className="actions sticky-actions">
                <button className="btn primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Add to Central library'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {tab === 'ai' && (
        <div className="settings-block library-ai-stub">
          <h2>AI posts</h2>
          <p className="muted">Under development — AI generation is not available yet.</p>
          <div className="empty-state">
            <h2>Coming soon</h2>
            <p className="muted">This workspace is reserved for AI-generated posts.</p>
          </div>
        </div>
      )}

      {tab === 'distribute' && (
        <div className="library-distribute">
          <div className="settings-block">
            <h2>1. Archive with remarks</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Archive a ready post before distributing it. Remarks are required.
            </p>
            {livePosts.length === 0 ? (
              <p className="muted">No ready posts to archive.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Post</th>
                      <th>Remarks</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {livePosts.map((post) => (
                      <tr key={post.id}>
                        <td>
                          <strong>{post.title}</strong>
                          <div className="muted" style={{ fontSize: '0.85em' }}>
                            {post.creation_source || 'manual'}
                          </div>
                        </td>
                        <td>
                          <input
                            value={archiveRemarks[post.id] || ''}
                            onChange={(e) =>
                              setArchiveRemarks((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            placeholder="Why this post is ready to distribute"
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => onArchive(post)}
                          >
                            Archive
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <form className="settings-block" onSubmit={onDistribute}>
            <h2>2. Distribute archived posts</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Copies selected archived posts into chosen hubs. Manual → Manual posts hubs; AI → AI
              posts hubs.
            </p>

            <div className="library-distribute__columns">
              <div>
                <h3>Archived posts</h3>
                {archivedPosts.length === 0 ? (
                  <p className="muted">Archive posts first.</p>
                ) : (
                  <ul className="library-checklist">
                    {archivedPosts.map((post) => (
                      <li key={post.id}>
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(post.id)}
                            onChange={() => toggleSelected(post.id)}
                          />
                          <span>
                            {post.title}{' '}
                            <span className="muted">({post.creation_source || 'manual'})</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3>Target hubs</h3>
                {eligibleTargets.length === 0 ? (
                  <p className="muted">
                    No eligible hubs. Need Receive content from Central, remote DB, and Manual or AI
                    posts.
                  </p>
                ) : (
                  <ul className="library-checklist">
                    {eligibleTargets.map((hub) => (
                      <li key={hub.id}>
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={selectedHubIds.includes(hub.id)}
                            onChange={() => toggleHub(hub.id)}
                          />
                          <span>
                            {hub.name}{' '}
                            <span className="muted">
                              ({hub.type}
                              {hub.manual_posts ? ', manual' : ''}
                              {hub.ai_posts ? ', AI' : ''})
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="actions sticky-actions">
              <button
                className="btn primary"
                type="submit"
                disabled={
                  distributing || selectedIds.length === 0 || selectedHubIds.length === 0
                }
              >
                {distributing ? 'Distributing…' : 'Distribute to selected hubs'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
