import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { pollJobStatus } from '../api/pollJob'
import DataGrid from '../components/DataGrid'
import FileDropzone from '../components/FileDropzone'
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
  { id: 'create', label: 'Create' },
  { id: 'ai', label: 'AI posts' },
  { id: 'distribute', label: 'Distribute' },
  { id: 'archive', label: 'Archive' },
]

const POSTS_PAGE_SIZE = 50

function normalizeNames(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((item) => (typeof item === 'string' ? item : item?.name))
    .filter((name) => typeof name === 'string' && name.trim() !== '')
}

function hubTypeLabel(type) {
  if (type === 'white_label') return 'White-labelled'
  if (type === 'shared') return 'Shared'
  return type || '—'
}

function isArchivedPost(post) {
  return Boolean(post?.archived_at || post?.is_archived)
}

function SelectCell({ checked, disabled, onChange, label }) {
  return (
    <label className="library-select-cell" title={label}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      />
    </label>
  )
}

export default function CentralContentLibrary() {
  const { isPowerAdmin } = useAuth()
  const { isActingRemotely, can, refreshHub, hub } = useHub()
  const apiOpts = { asPowerAdmin: isPowerAdmin }

  const [tab, setTab] = useState('create')
  const [createMode, setCreateMode] = useState('one')
  const [posts, setPosts] = useState([])
  const [postsMeta, setPostsMeta] = useState({ total: 0, current_page: 1, last_page: 1 })
  const [postsPage, setPostsPage] = useState(1)
  const [types, setTypes] = useState([])
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [targets, setTargets] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [selectedIds, setSelectedIds] = useState([])
  const [selectedHubIds, setSelectedHubIds] = useState([])
  const [archiveRemarks, setArchiveRemarks] = useState({})
  const [file, setFile] = useState(null)
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [distributing, setDistributing] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [postSearch, setPostSearch] = useState('')
  const [postSearchInput, setPostSearchInput] = useState('')
  const [postSource, setPostSource] = useState('')
  const [hubSearchInput, setHubSearchInput] = useState('')
  const [hubsReadyOnly, setHubsReadyOnly] = useState(true)
  const [hubTypeFilter, setHubTypeFilter] = useState('')
  const [archiveSearch, setArchiveSearch] = useState('')
  const [archiveSearchInput, setArchiveSearchInput] = useState('')
  const [archiveStatus, setArchiveStatus] = useState('all')

  const formRef = useRef(null)
  const metaLoadedRef = useRef(false)

  const targetHubs = useMemo(() => (Array.isArray(targets) ? targets : []), [targets])
  const selectableTargets = useMemo(
    () => targetHubs.filter((item) => item.eligible),
    [targetHubs]
  )

  const filteredHubs = useMemo(() => {
    const q = hubSearchInput.trim().toLowerCase()
    return targetHubs.filter((item) => {
      if (hubsReadyOnly && !item.eligible) return false
      if (hubTypeFilter && item.type !== hubTypeFilter) return false
      if (!q) return true
      const hay = `${item.name || ''} ${item.type || ''} ${item.reason || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [targetHubs, hubSearchInput, hubsReadyOnly, hubTypeFilter])

  const filteredSelectableHubIds = useMemo(
    () => filteredHubs.filter((item) => item.eligible).map((item) => item.id),
    [filteredHubs]
  )

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true)
    setError('')
    try {
      const opts = { asPowerAdmin: isPowerAdmin }
      const [typesRes, catsRes, tagsRes, targetsRes] = await Promise.all([
        api.listTypes().catch(() => ({ types: [] })),
        api.listCategories().catch(() => ({ categories: [] })),
        api.listTags().catch(() => ({ tags: [] })),
        api.centralLibraryTargets(opts),
      ])
      setTypes(typesRes.types || [])
      setCategories(catsRes.categories || [])
      setTags(tagsRes.tags || [])
      const nextTargets = targetsRes.hubs || []
      setTargets(nextTargets)
      const readyIds = new Set(nextTargets.filter((item) => item.eligible).map((item) => item.id))
      setSelectedHubIds((prev) => prev.filter((id) => readyIds.has(id)))
      metaLoadedRef.current = true
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingMeta(false)
    }
  }, [isPowerAdmin])

  const loadPosts = useCallback(
    async (overrideTab) => {
      const activeTab = overrideTab || tab
      if (activeTab !== 'distribute' && activeTab !== 'archive') return
      setLoadingPosts(true)
      setError('')
      try {
        const opts = { asPowerAdmin: isPowerAdmin }
        const params = {
          per_page: POSTS_PAGE_SIZE,
          page: postsPage,
        }
        if (activeTab === 'distribute') {
          params.status = 'active'
          if (postSearch.trim()) params.search = postSearch.trim()
          if (postSource) params.source = postSource
        } else {
          if (archiveStatus !== 'all') params.status = archiveStatus
          if (archiveSearch.trim()) params.search = archiveSearch.trim()
        }
        const postsRes = await api.centralLibraryPosts(params, opts)
        setPosts(postsRes.data || [])
        setPostsMeta({
          total: postsRes.total ?? (postsRes.data || []).length,
          current_page: postsRes.current_page ?? postsPage,
          last_page: postsRes.last_page ?? 1,
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoadingPosts(false)
      }
    },
    [tab, postsPage, postSearch, postSource, archiveSearch, archiveStatus, isPowerAdmin]
  )

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
    loadMeta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActingRemotely, hub?.effective_capabilities?.dashboard_central_content_library])

  useEffect(() => {
    if (isActingRemotely) return
    if (!can('dashboard_central_content_library')) return
    if (tab !== 'distribute' && tab !== 'archive') return
    loadPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, postsPage, postSearch, postSource, archiveSearch, archiveStatus, isActingRemotely])

  useEffect(() => {
    if (tab !== 'distribute') return
    const timer = setTimeout(() => {
      setPostsPage(1)
      setPostSearch(postSearchInput.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [postSearchInput, tab])

  useEffect(() => {
    if (tab !== 'archive') return
    const timer = setTimeout(() => {
      setPostsPage(1)
      setArchiveSearch(archiveSearchInput.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [archiveSearchInput, tab])

  useEffect(() => {
    setPostsPage(1)
  }, [tab, postSource, archiveStatus])

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
      setPostsPage(1)
      setTab('distribute')
      await loadPosts('distribute')
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
      setPostsPage(1)
      setTab('distribute')
      await loadPosts('distribute')
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
      setMessage(data.message || 'Post archived (kept in library, no longer distributable).')
      setArchiveRemarks((prev) => {
        const next = { ...prev }
        delete next[post.id]
        return next
      })
      setSelectedIds((prev) => prev.filter((id) => id !== post.id))
      await loadPosts()
    } catch (err) {
      setError(err.message)
    }
  }

  const onUnarchive = async (post) => {
    setError('')
    setMessage('')
    try {
      const data = await api.unarchiveCentralLibraryPost(post.id, apiOpts)
      setMessage(data.message || 'Post unarchived. It can be distributed again.')
      await loadPosts()
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

  const selectAllPostsOnPage = () => {
    const ids = posts.map((post) => post.id)
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])))
  }

  const clearPostSelection = () => setSelectedIds([])

  const selectAllFilteredHubs = () => {
    setSelectedHubIds((prev) => Array.from(new Set([...prev, ...filteredSelectableHubIds])))
  }

  const clearHubSelection = () => setSelectedHubIds([])

  const formatDistributeResult = (data) => {
    if (data?.message) return data.message
    const parts = []
    if ((data?.pushed ?? 0) > 0) parts.push(`Distributed ${data.pushed} post(s)`)
    if ((data?.skipped ?? 0) > 0) parts.push(`${data.skipped} already on hub (skipped)`)
    if ((data?.failed ?? 0) > 0) parts.push(`${data.failed} failed`)
    return parts.length ? `${parts.join('. ')}.` : 'Distribution finished.'
  }

  const onDistribute = async (e) => {
    e.preventDefault()
    if (selectedIds.length === 0) {
      setError('Select at least one ready (non-archived) post to distribute.')
      return
    }
    if (selectedHubIds.length === 0) {
      setError('Select at least one target hub.')
      return
    }
    setDistributing(true)
    setError('')
    setMessage('Queuing distribution…')
    const postIds = [...selectedIds]
    const hubIds = [...selectedHubIds]
    try {
      const queued = await api.queueCentralLibraryDistribute(
        { post_ids: postIds, hub_ids: hubIds },
        apiOpts
      )
      if (!queued?.queued || !queued?.job_id) {
        setMessage(formatDistributeResult(queued))
        setSelectedIds([])
        setSelectedHubIds([])
        setDistributing(false)
        return
      }

      setMessage(
        queued.message ||
          'Distribution started in the background. You can keep working — this updates when finished.'
      )
      setSelectedIds([])
      setSelectedHubIds([])
      setDistributing(false)

      const jobId = queued.job_id
      ;(async () => {
        try {
          const data = await pollJobStatus(
            () => api.centralLibraryDistributeStatus(jobId, apiOpts),
            { intervalMs: 700, immediate: true }
          )
          setMessage(formatDistributeResult(data))
          if (tab === 'distribute') {
            await loadPosts('distribute')
          }
        } catch (err) {
          setError(err.message)
        }
      })()
    } catch (err) {
      setError(err.message)
      setMessage('')
      setDistributing(false)
    }
  }

  const distributePostColumns = useMemo(
    () => [
      {
        key: 'select',
        label: 'Select',
        filterable: false,
        sortable: false,
        width: 72,
        truncate: false,
        render: (row) => (
          <SelectCell
            checked={selectedIds.includes(row.id)}
            onChange={() => toggleSelected(row.id)}
            label={`Select ${row.title}`}
          />
        ),
      },
      {
        key: 'title',
        label: 'Post',
        grow: true,
        filterValue: (row) => row.title,
        render: (row) => {
          const hubs = Array.isArray(row.distributed_hubs) ? row.distributed_hubs : []
          const hubNames = hubs.map((h) => h.hub_name).filter(Boolean)
          return (
            <div className="library-grid-title">
              <strong>{row.title}</strong>
              <span className="muted">
                {row.type || '—'} · {row.credits_cost ?? '—'} credits
              </span>
              {hubNames.length > 0 ? (
                <span className="library-already-on" title={hubNames.join(', ')}>
                  Already on: {hubNames.slice(0, 3).join(', ')}
                  {hubNames.length > 3 ? ` +${hubNames.length - 3}` : ''}
                </span>
              ) : (
                <span className="muted">Not distributed yet</span>
              )}
            </div>
          )
        },
      },
      {
        key: 'creation_source',
        label: 'Source',
        width: 110,
        filterValue: (row) => row.creation_source || 'manual',
        render: (row) => row.creation_source || 'manual',
      },
      {
        key: 'updated_at',
        label: 'Updated',
        width: 150,
        filterValue: (row) => row.updated_at || '',
        render: (row) =>
          row.updated_at ? new Date(row.updated_at).toLocaleDateString() : '—',
      },
    ],
    [selectedIds]
  )

  const distributeHubColumns = useMemo(
    () => [
      {
        key: 'select',
        label: 'Select',
        filterable: false,
        sortable: false,
        width: 72,
        truncate: false,
        render: (row) => (
          <SelectCell
            checked={Boolean(row.eligible) && selectedHubIds.includes(row.id)}
            disabled={!row.eligible}
            onChange={() => {
              if (!row.eligible) return
              toggleHub(row.id)
            }}
            label={`Select ${row.name}`}
          />
        ),
      },
      {
        key: 'name',
        label: 'Hub',
        grow: true,
        filterValue: (row) => row.name,
        render: (row) => (
          <div className="library-grid-title">
            <strong>{row.name}</strong>
            {!row.eligible && row.reason ? (
              <span className="muted">{row.reason}</span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        width: 130,
        filterValue: (row) => hubTypeLabel(row.type),
        render: (row) => hubTypeLabel(row.type),
      },
      {
        key: 'channels',
        label: 'Channels',
        width: 120,
        filterable: false,
        sortable: false,
        render: (row) => {
          const parts = []
          if (row.manual_posts) parts.push('Manual')
          if (row.ai_posts) parts.push('AI')
          return parts.length ? parts.join(', ') : '—'
        },
      },
      {
        key: 'status',
        label: 'Status',
        width: 110,
        filterValue: (row) => (row.eligible ? 'Ready' : 'Not ready'),
        render: (row) => (
          <span className={`library-pill${row.eligible ? ' is-ready' : ' is-blocked'}`}>
            {row.eligible ? 'Ready' : 'Not ready'}
          </span>
        ),
      },
    ],
    [selectedHubIds]
  )

  const archiveColumns = useMemo(
    () => [
      {
        key: 'title',
        label: 'Post',
        grow: true,
        filterValue: (row) => row.title,
        render: (row) => (
          <div className="library-grid-title">
            <strong>{row.title}</strong>
            <span className="muted">
              {row.creation_source || 'manual'} · {row.type || '—'}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        width: 110,
        filterValue: (row) => (isArchivedPost(row) ? 'Archived' : 'Ready'),
        render: (row) => (
          <span className={`library-pill${isArchivedPost(row) ? ' is-blocked' : ' is-ready'}`}>
            {isArchivedPost(row) ? 'Archived' : 'Ready'}
          </span>
        ),
      },
      {
        key: 'remarks',
        label: 'Remarks',
        grow: true,
        filterable: false,
        sortable: false,
        truncate: false,
        wrap: true,
        render: (row) =>
          isArchivedPost(row) ? (
            <span className="muted">{row.archive_remarks || '—'}</span>
          ) : (
            <input
              className="library-remarks-input"
              value={archiveRemarks[row.id] || ''}
              onChange={(e) =>
                setArchiveRemarks((prev) => ({
                  ...prev,
                  [row.id]: e.target.value,
                }))
              }
              placeholder="Why this post is being archived"
              aria-label={`Archive remarks for ${row.title}`}
            />
          ),
      },
    ],
    [archiveRemarks]
  )

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

  const postsLoading = loadingPosts || (loadingMeta && !metaLoadedRef.current)

  return (
    <section className="central-library">
      <div className="page-head">
        <div>
          <p className="eyebrow">Central</p>
          <h1>Content library</h1>
          <p className="muted">
            Create posts here (one-by-one or Excel), distribute ready copies to Shared /
            White-labelled hubs, or archive / unarchive from the Archive tab. Browse, edit, and see
            which hubs received each post on <Link to="/my-dashboard/posts">Posts / reels</Link>.
          </p>
        </div>
        <div className="actions" style={{ gap: 8 }}>
          <Link to="/my-dashboard/posts" className="btn ghost">
            View all posts
          </Link>
          <button type="button" className="btn primary" onClick={() => setTab('create')}>
            New post
          </button>
        </div>
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
              <FileDropzone
                id="central-library-import-xlsx"
                label="Excel file (.xlsx)"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                files={file ? [file] : []}
                onChange={(next) => setFile(next[0] || null)}
                disabled={importing}
              />
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
                  <input
                    list="central-library-types"
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                    placeholder="Post, Reel, or a new type name"
                    required
                  />
                  <datalist id="central-library-types">
                    {types.map((type) => (
                      <option key={type.id || type.name} value={type.name} />
                    ))}
                  </datalist>
                  <span className="field-hint">
                    Pick an existing Central type or type a new name — it is saved to Central when
                    you add the post. <Link to="/my-dashboard/types">Manage types</Link>
                  </span>
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
                    allowCreate
                    createPlaceholder="Or type a new category and press Enter…"
                    emptyHint={
                      <>
                        No categories yet — type a new name above, or{' '}
                        <Link to="/my-dashboard/categories">manage categories</Link>.
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
                    allowCreate
                    createPlaceholder="Or type a new tag and press Enter…"
                    emptyHint={
                      <>
                        No tags yet — type a new name above, or{' '}
                        <Link to="/my-dashboard/tags">manage tags</Link>.
                      </>
                    }
                  />
                </div>
                <FileDropzone
                  id="central-library-post-attachment"
                  label="Attachment"
                  files={form.attachment ? [form.attachment] : []}
                  onChange={(next) =>
                    setForm((p) => ({ ...p, attachment: next[0] || null }))
                  }
                />
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
          <form className="library-picker" onSubmit={onDistribute}>
            <div className="library-picker__intro">
              <h2>Distribute ready posts</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Search and page through the library, then pick target hubs. Distribution runs in the
                background so the page stays usable. If a hub already has a post, that copy is
                skipped (no duplicate). Manual posts go to Manual hubs; AI posts go to AI hubs.
              </p>
            </div>

            <div className="library-picker__panel">
              <div className="library-picker__panel-head">
                <div>
                  <h3>Ready posts</h3>
                  <p className="muted library-picker__meta">
                    {postsMeta.total} match{postsMeta.total === 1 ? '' : 'es'}
                    {selectedIds.length > 0 ? ` · ${selectedIds.length} selected` : ''}
                  </p>
                </div>
                <div className="library-picker__actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={selectAllPostsOnPage}
                    disabled={posts.length === 0}
                  >
                    Select page
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={clearPostSelection}
                    disabled={selectedIds.length === 0}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="library-picker__toolbar">
                <input
                  type="search"
                  className="library-picker__search"
                  placeholder="Search posts by title or description…"
                  value={postSearchInput}
                  onChange={(e) => setPostSearchInput(e.target.value)}
                  aria-label="Search ready posts"
                />
                <div className="library-toolbar__filters" role="group" aria-label="Post source">
                  {[
                    { id: '', label: 'All sources' },
                    { id: 'manual', label: 'Manual' },
                    { id: 'ai', label: 'AI' },
                  ].map((item) => (
                    <button
                      key={item.id || 'all'}
                      type="button"
                      className={`library-chip${postSource === item.id ? ' is-active' : ''}`}
                      onClick={() => setPostSource(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <DataGrid
                columns={distributePostColumns}
                rows={posts}
                loading={postsLoading}
                emptyMessage="No ready posts match. Create posts or clear filters."
                pageSize={10}
                getRowKey={(row) => row.id}
              />

              {postsMeta.last_page > 1 ? (
                <div className="library-server-pager">
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={postsPage <= 1 || loadingPosts}
                    onClick={() => setPostsPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="muted">
                    Server page {postsMeta.current_page} of {postsMeta.last_page}
                  </span>
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={postsPage >= postsMeta.last_page || loadingPosts}
                    onClick={() => setPostsPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>

            <div className="library-picker__panel">
              <div className="library-picker__panel-head">
                <div>
                  <h3>Target hubs</h3>
                  <p className="muted library-picker__meta">
                    {filteredSelectableHubIds.length} ready of {targetHubs.length}
                    {selectedHubIds.length > 0 ? ` · ${selectedHubIds.length} selected` : ''}
                  </p>
                </div>
                <div className="library-picker__actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={selectAllFilteredHubs}
                    disabled={filteredSelectableHubIds.length === 0}
                  >
                    Select filtered ready
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={clearHubSelection}
                    disabled={selectedHubIds.length === 0}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="library-picker__toolbar">
                <input
                  type="search"
                  className="library-picker__search"
                  placeholder="Search hubs…"
                  value={hubSearchInput}
                  onChange={(e) => setHubSearchInput(e.target.value)}
                  aria-label="Search target hubs"
                />
                <div className="library-toolbar__filters" role="group" aria-label="Hub filters">
                  <button
                    type="button"
                    className={`library-chip${hubsReadyOnly ? ' is-active' : ''}`}
                    onClick={() => setHubsReadyOnly((v) => !v)}
                  >
                    Ready only
                  </button>
                  {[
                    { id: '', label: 'All types' },
                    { id: 'shared', label: 'Shared' },
                    { id: 'white_label', label: 'White-labelled' },
                  ].map((item) => (
                    <button
                      key={item.id || 'all-types'}
                      type="button"
                      className={`library-chip${hubTypeFilter === item.id ? ' is-active' : ''}`}
                      onClick={() => setHubTypeFilter(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <DataGrid
                columns={distributeHubColumns}
                rows={filteredHubs}
                loading={loadingMeta}
                emptyMessage="No hubs match these filters."
                pageSize={10}
                getRowKey={(row) => row.id}
              />
            </div>

            <div className="library-picker__summary sticky-actions">
              <div className="library-picker__summary-text">
                <strong>
                  {selectedIds.length} post{selectedIds.length === 1 ? '' : 's'}
                </strong>
                <span className="muted">→</span>
                <strong>
                  {selectedHubIds.length} hub{selectedHubIds.length === 1 ? '' : 's'}
                </strong>
              </div>
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

      {tab === 'archive' && (
        <div className="library-archive">
          <div className="library-picker">
            <div className="library-picker__intro">
              <h2>Archive / unarchive</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Search the full library, filter by status, and archive with remarks — or restore
                archived posts to the distribute pool.
              </p>
            </div>

            <div className="library-picker__panel">
              <div className="library-picker__panel-head">
                <div>
                  <h3>Library posts</h3>
                  <p className="muted library-picker__meta">
                    {postsMeta.total} match{postsMeta.total === 1 ? '' : 'es'}
                  </p>
                </div>
              </div>

              <div className="library-picker__toolbar">
                <input
                  type="search"
                  className="library-picker__search"
                  placeholder="Search posts by title or description…"
                  value={archiveSearchInput}
                  onChange={(e) => setArchiveSearchInput(e.target.value)}
                  aria-label="Search archive posts"
                />
                <div className="library-toolbar__filters" role="group" aria-label="Archive status">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'active', label: 'Ready' },
                    { id: 'archived', label: 'Archived' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`library-chip${archiveStatus === item.id ? ' is-active' : ''}`}
                      onClick={() => setArchiveStatus(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <DataGrid
                columns={archiveColumns}
                rows={posts}
                loading={postsLoading}
                emptyMessage="No posts match. Create posts or clear filters."
                pageSize={10}
                getRowKey={(row) => row.id}
                actions={(row) =>
                  isArchivedPost(row) ? (
                    <button type="button" className="btn ghost" onClick={() => onUnarchive(row)}>
                      Unarchive
                    </button>
                  ) : (
                    <button type="button" className="btn ghost" onClick={() => onArchive(row)}>
                      Archive
                    </button>
                  )
                }
                actionsLabel="Action"
                actionsWidth={120}
              />

              {postsMeta.last_page > 1 ? (
                <div className="library-server-pager">
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={postsPage <= 1 || loadingPosts}
                    onClick={() => setPostsPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="muted">
                    Server page {postsMeta.current_page} of {postsMeta.last_page}
                  </span>
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={postsPage >= postsMeta.last_page || loadingPosts}
                    onClick={() => setPostsPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
