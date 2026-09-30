import { useEffect, useMemo, useRef, useState } from 'react'
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

function normalizeNames(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((item) => (typeof item === 'string' ? item : item?.name))
    .filter((name) => typeof name === 'string' && name.trim() !== '')
}

export default function CentralContentLibrary() {
  const { isPowerAdmin } = useAuth()
  const { isActingRemotely, can } = useHub()
  const apiOpts = { asPowerAdmin: isPowerAdmin }

  const [tab, setTab] = useState('manual') // manual | ai | distribute
  const [createMode, setCreateMode] = useState('one') // one | bulk
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
    if (isActingRemotely) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, isActingRemotely])

  const archivedPosts = useMemo(
    () => posts.filter((post) => post.archived_at || post.is_archived),
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
              Switch back to Central Hub Controller to manage the Central content library. Posts
              created here stay in the Central database until you distribute them.
            </p>
          </div>
        </div>
        <div className="alert">Hub switcher is on a remote hub — Central library is Central-only.</div>
      </section>
    )
  }

  if (!can('dashboard_central_content_library')) {
    return (
      <section>
        <div className="alert">You do not have the Central content library capability.</div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Central</p>
          <h1>Content library</h1>
          <p className="muted">
            Create manual posts in the Central database (one-by-one or Excel bulk), archive them with
            remarks, then distribute to Shared / White-labelled hubs. AI posts are under
            development. Target hubs must have matching Manual posts or AI posts functionality.
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="matrix-add-role__modes" style={{ marginBottom: 16 }}>
        <label>
          <input type="radio" checked={tab === 'manual'} onChange={() => setTab('manual')} />
          Manual posts
        </label>
        <label>
          <input type="radio" checked={tab === 'ai'} onChange={() => setTab('ai')} />
          AI posts
        </label>
        <label>
          <input
            type="radio"
            checked={tab === 'distribute'}
            onChange={() => setTab('distribute')}
          />
          Archive &amp; distribute
        </label>
      </div>

      {tab === 'ai' && (
        <div className="settings-block">
          <h2>AI posts</h2>
          <p className="muted">Under development — AI post generation is not available yet.</p>
          <div className="empty-state">
            <h2>Coming soon</h2>
            <p className="muted">This section is intentionally empty until AI generation ships.</p>
          </div>
        </div>
      )}

      {tab === 'manual' && (
        <>
          <div className="matrix-add-role__modes" style={{ marginBottom: 12 }}>
            <label>
              <input
                type="radio"
                checked={createMode === 'one'}
                onChange={() => setCreateMode('one')}
              />
              Create one by one
            </label>
            <label>
              <input
                type="radio"
                checked={createMode === 'bulk'}
                onChange={() => setCreateMode('bulk')}
              />
              Bulk via Excel
            </label>
          </div>

          {createMode === 'bulk' ? (
            <form className="admin-form settings-form" onSubmit={onImport}>
              <div className="settings-block">
                <h2>Bulk import</h2>
                <p className="muted" style={{ marginTop: 0 }}>
                  Download the template, fill rows, then upload. Attachments are not included in the
                  sheet — add media later per post if needed.
                </p>
                <div className="actions" style={{ marginBottom: 12 }}>
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
              </div>
              <div className="actions">
                <button className="btn primary" type="submit" disabled={importing || !file}>
                  {importing ? 'Importing…' : 'Import posts'}
                </button>
              </div>
            </form>
          ) : (
            <form className="admin-form settings-form" onSubmit={onCreate} ref={formRef}>
              <div className="settings-block">
                <h2>New manual post</h2>
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
                <label>
                  Description
                  <RichTextEditor
                    value={form.description}
                    onChange={(description) => setForm((p) => ({ ...p, description }))}
                  />
                </label>
              </div>
              <div className="actions sticky-actions">
                <button className="btn primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Add to Central library'}
                </button>
              </div>
            </form>
          )}

          <div className="settings-block" style={{ marginTop: 24 }}>
            <div className="page-head" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>Library posts</h2>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="active">Not archived</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            {loading ? (
              <div className="state">Loading…</div>
            ) : posts.length === 0 ? (
              <div className="empty-state">
                <h2>No posts yet</h2>
                <p className="muted">Create a post above or import from Excel.</p>
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
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
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
                        <td>{post.creation_source || 'manual'}</td>
                        <td>
                          {post.archived_at || post.is_archived ? (
                            <span title={post.archive_remarks || ''}>Archived</span>
                          ) : (
                            'Library'
                          )}
                        </td>
                        <td>{post.credits_cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'distribute' && (
        <>
          <div className="settings-block">
            <h2>Archive with remarks</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Archive a post before distributing it. Remarks are required.
            </p>
            {posts.filter((p) => !p.archived_at && !p.is_archived).length === 0 ? (
              <p className="muted">No unarchived library posts.</p>
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
                    {posts
                      .filter((p) => !p.archived_at && !p.is_archived)
                      .map((post) => (
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
                          <td>
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

          <form className="admin-form settings-form" onSubmit={onDistribute}>
            <div className="settings-block">
              <h2>Distribute archived posts</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Copies selected archived posts into the chosen hubs’ databases. Manual posts only go
                to hubs with Manual posts; AI posts only go to hubs with AI posts.
              </p>

              <h3>Archived posts</h3>
              {archivedPosts.length === 0 ? (
                <p className="muted">Archive posts first.</p>
              ) : (
                <div className="form-grid">
                  {archivedPosts.map((post) => (
                    <label key={post.id} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(post.id)}
                        onChange={() => toggleSelected(post.id)}
                      />
                      {post.title}{' '}
                      <span className="muted">({post.creation_source || 'manual'})</span>
                    </label>
                  ))}
                </div>
              )}

              <h3 style={{ marginTop: 16 }}>Target hubs</h3>
              {eligibleTargets.length === 0 ? (
                <p className="muted">
                  No eligible hubs. Each target needs Receive content from Central, remote DB
                  credentials, and Manual posts or AI posts.
                </p>
              ) : (
                <div className="form-grid">
                  {eligibleTargets.map((hub) => (
                    <label key={hub.id} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={selectedHubIds.includes(hub.id)}
                        onChange={() => toggleHub(hub.id)}
                      />
                      {hub.name}{' '}
                      <span className="muted">
                        ({hub.type}
                        {hub.manual_posts ? ', manual' : ''}
                        {hub.ai_posts ? ', AI' : ''})
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="actions sticky-actions">
              <button
                className="btn primary"
                type="submit"
                disabled={distributing || selectedIds.length === 0 || selectedHubIds.length === 0}
              >
                {distributing ? 'Distributing…' : 'Distribute to selected hubs'}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  )
}
