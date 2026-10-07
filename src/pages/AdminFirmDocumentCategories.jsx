import { useEffect, useState } from 'react'
import { FaEdit, FaTrash } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function AdminFirmDocumentCategories() {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const asPowerAdmin = isPowerAdmin
  const apiOpts = { asPowerAdmin }

  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const functionalityOn = can('firm_documents_view') || can('firm_documents_add') || can('firm_documents_manage_categories')
  const canManage = can('firm_documents_manage_categories')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.firmDocumentAdminCategories(apiOpts)
      setCategories(data.categories || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading || !canManage) {
      setLoading(false)
      return
    }
    load()
    setEditingId(null)
    setName('')
    setSlug('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, canManage])

  const reset = () => {
    setName('')
    setSlug('')
    setEditingId(null)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = { name: name.trim(), slug: slug.trim() || undefined }
      if (editingId) {
        await api.updateFirmDocumentCategory(editingId, payload, apiOpts)
        setMessage('Category updated.')
      } else {
        const data = await api.createFirmDocumentCategory(payload, apiOpts)
        setMessage(data.message || 'Category created.')
      }
      reset()
      await load()
    } catch (err) {
      setError(err.data?.errors?.name?.[0] || err.data?.errors?.slug?.[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && !canManage) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Hub</p>
            <h1>Document categories</h1>
            <p className="muted">
              {!functionalityOn
                ? 'Firm documents functionality / capabilities are off for this hub.'
                : 'You do not have permission to manage firm document categories.'}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>{editingId ? 'Edit category' : 'Document categories'}</h1>
          <p className="muted">
            Options shown in the Category dropdown when uploading a firm document.
          </p>
        </div>
      </div>

      <form className="admin-form" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <label>
          Category name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Policies, Handbooks, Marketing…"
          />
        </label>
        <label>
          Slug (optional)
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="policies, handbooks…"
          />
        </label>
        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update category' : 'Add category'}
          </button>
          {editingId && (
            <button type="button" className="btn ghost" onClick={reset}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 className="section-title">Existing categories</h2>
      <DataGrid
        columns={[
          {
            key: 'name',
            label: 'Name',
            grow: true,
            filterValue: (row) => row.name,
            render: (row) => <strong>{row.name}</strong>,
          },
          {
            key: 'slug',
            label: 'Slug',
            fit: true,
            filterValue: (row) => row.slug || '',
            render: (row) => row.slug || '—',
          },
          {
            key: 'usage',
            label: 'In use',
            fit: true,
            filterValue: (row) => String(row.usage_count ?? 0),
            render: (row) => row.usage_count ?? 0,
          },
        ]}
        rows={categories}
        loading={loading}
        emptyMessage="No categories yet. Add one above."
        getRowKey={(row) => row.id}
        actions={(row) => (
          <>
            <DataGridIconBtn
              icon={FaEdit}
              label="Edit"
              onClick={() => {
                setEditingId(row.id)
                setName(row.name)
                setSlug(row.slug || '')
              }}
            />
            <DataGridIconBtn
              icon={FaTrash}
              label="Delete"
              variant="danger"
              onClick={async () => {
                if (!window.confirm('Delete this category?')) return
                try {
                  await api.deleteFirmDocumentCategory(row.id, apiOpts)
                  await load()
                } catch (err) {
                  setError(err.message)
                }
              }}
            />
          </>
        )}
      />
    </section>
  )
}
