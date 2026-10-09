import { useEffect, useMemo, useState } from 'react'
import { FaEdit, FaTrash, FaTimes } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import {
  CATEGORY_ICON_OPTIONS,
  categoryInitial,
  getCategoryIconComponent,
} from '../utils/categoryIcons'

function CategoryIconPreview({ icon, iconUrl, name }) {
  if (iconUrl) {
    return (
      <span className="category-icon-preview has-image">
        <img src={iconUrl} alt="" />
      </span>
    )
  }
  const Icon = getCategoryIconComponent(icon)
  if (Icon) {
    return (
      <span className="category-icon-preview">
        <Icon aria-hidden="true" />
      </span>
    )
  }
  return (
    <span className="category-icon-preview is-initial" aria-hidden="true">
      {categoryInitial(name)}
    </span>
  )
}

export default function AdminCategories({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { actingHubId, isActingRemotely, actingHub, isControlPlane, can } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const apiOpts = { asPowerAdmin }
  const canManage = can('dashboard_manage_categories')

  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [iconUrl, setIconUrl] = useState('')
  const [iconFile, setIconFile] = useState(null)
  const [iconPreview, setIconPreview] = useState('')
  const [removeIcon, setRemoveIcon] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const iconOptions = useMemo(() => CATEGORY_ICON_OPTIONS, [])

  const resetForm = () => {
    setName('')
    setIcon('')
    setIconUrl('')
    setIconFile(null)
    setIconPreview('')
    setRemoveIcon(false)
    setEditingId(null)
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = isActingRemotely
        ? await api.hubContentCategories(apiOpts)
        : await api.listCategories()
      setCategories(data.categories || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    resetForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingHubId])

  useEffect(() => {
    if (!iconFile) {
      setIconPreview('')
      return undefined
    }
    const url = URL.createObjectURL(iconFile)
    setIconPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [iconFile])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      if (icon) {
        formData.append('icon', icon)
        if (removeIcon) {
          formData.append('clear_upload', '1')
        }
      } else {
        formData.append('icon', '')
      }
      if (iconFile) {
        formData.append('icon_file', iconFile)
      }
      if (removeIcon && !iconFile) {
        formData.append('remove_icon', '1')
      }

      let data
      if (editingId) {
        data = await api.updateCategory(editingId, formData, apiOpts)
      } else {
        data = await api.createCategory(formData, apiOpts)
      }
      const sync = data?.hub_sync
      const syncNote = sync
        ? ` Synced to ${sync.synced || 0} hub(s)` +
          (sync.failed ? `, ${sync.failed} failed` : '') +
          (sync.skipped ? `, ${sync.skipped} skipped` : '') +
          '.'
        : ''
      setMessage(
        (data?.message || (editingId ? 'Category updated.' : 'Category created.')) + syncNote
      )
      resetForm()
      await load()
    } catch (err) {
      setError(err.data?.errors?.name?.[0] || err.data?.errors?.icon_file?.[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setName(row.name || '')
    setIcon(row.icon || '')
    setIconUrl(row.icon_url || '')
    setIconFile(null)
    setRemoveIcon(false)
    setMessage('')
    setError('')
  }

  const currentPreviewUrl = iconPreview || (!removeIcon ? iconUrl : '')

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">SM Template</p>
          <h1>{editingId ? 'Edit category' : 'Categories'}</h1>
          <p className="muted">
            {isActingRemotely
              ? canManage
                ? `Managing categories on ${actingHub?.name}. Switch hubs from the top bar.`
                : `Listing categories on ${actingHub?.name}. Create/edit is Central-only; categories arrive with distributed posts.`
              : isControlPlane
                ? canManage
                  ? 'Managing Central Hub categories used by the Central content library. On distribute, matching category names are upserted into the target hub.'
                  : 'Listing Central Hub categories. Enable Manage categories in Capabilities to create or edit.'
                : canManage
                  ? 'Managing shared hub categories. Use Control hub in the top bar for a white-labelled hub.'
                  : 'Categories on this hub are list-only. New categories arrive with posts distributed from the Central content library.'}
          </p>
        </div>
      </div>

      {canManage && (
        <form className="admin-form category-admin-form" onSubmit={onSubmit}>
          {error && <div className="alert">{error}</div>}
          {message && <div className="alert success">{message}</div>}
          <label>
            Category name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter category name"
            />
          </label>

          <div className="category-icon-field">
            <div className="category-icon-field__head">
              <span className="category-icon-field__label">Category icon</span>
              <span className="muted">Pick a font icon or upload an image.</span>
            </div>

            <div className="category-icon-field__preview-row">
              <CategoryIconPreview
                icon={iconFile || removeIcon ? (iconFile ? '' : icon) : icon}
                iconUrl={currentPreviewUrl}
                name={name || 'Category'}
              />
              <div className="category-icon-field__preview-actions">
                {(icon || iconUrl || iconFile) && (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setIcon('')
                      setIconFile(null)
                      if (iconUrl) setRemoveIcon(true)
                      setIconUrl('')
                    }}
                  >
                    <FaTimes aria-hidden="true" /> Clear icon
                  </button>
                )}
              </div>
            </div>

            <div className="category-icon-picker" role="listbox" aria-label="Font icons">
              {iconOptions.map((opt) => {
                const selected = icon === opt.value && !iconFile
                const Icon = opt.Icon
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    title={opt.label}
                    className={`category-icon-picker__btn${selected ? ' is-selected' : ''}`}
                    onClick={() => {
                      setIcon(opt.value)
                      setIconFile(null)
                      if (iconUrl) setRemoveIcon(true)
                    }}
                  >
                    <Icon aria-hidden="true" />
                    <span className="sr-only">{opt.label}</span>
                  </button>
                )
              })}
            </div>

            <label className="category-icon-upload">
              Upload custom icon
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setIconFile(file)
                  if (file) {
                    setIcon('')
                    setRemoveIcon(false)
                  }
                  e.target.value = ''
                }}
              />
            </label>
          </div>

          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Update category'
                  : isActingRemotely
                    ? `Add category on ${actingHub?.name || 'hub'}`
                    : 'Add category'}
            </button>
            {editingId && (
              <button type="button" className="btn ghost" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      )}

      {!canManage && error && <div className="alert">{error}</div>}

      <h2 className="section-title">
        {isActingRemotely ? `Categories on ${actingHub?.name}` : 'Existing categories'}
      </h2>
      <DataGrid
        columns={[
          {
            key: 'icon',
            label: 'Icon',
            width: 72,
            sortable: false,
            render: (row) => (
              <CategoryIconPreview icon={row.icon} iconUrl={row.icon_url} name={row.name} />
            ),
          },
          {
            key: 'name',
            label: 'Name',
            grow: true,
            filterValue: (row) => row.name,
            render: (row) => <strong>{row.name}</strong>,
          },
        ]}
        rows={categories}
        loading={loading}
        emptyMessage="No categories yet."
        getRowKey={(row) => row.id}
        actions={
          canManage
            ? (row) => (
                <>
                  <DataGridIconBtn icon={FaEdit} label="Edit" onClick={() => startEdit(row)} />
                  <DataGridIconBtn
                    icon={FaTrash}
                    label="Delete"
                    variant="danger"
                    onClick={async () => {
                      if (!window.confirm('Delete this category?')) return
                      try {
                        await api.deleteCategory(row.id, apiOpts)
                        await load()
                      } catch (err) {
                        setError(err.message)
                      }
                    }}
                  />
                </>
              )
            : undefined
        }
      />
    </section>
  )
}
