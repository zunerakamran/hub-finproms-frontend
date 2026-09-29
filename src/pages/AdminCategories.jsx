import { useEffect, useState } from 'react'
import { FaEdit, FaTrash } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function AdminCategories({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { actingHubId, isActingOnWhiteLabel, actingHub } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const apiOpts = { asPowerAdmin }

  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = isActingOnWhiteLabel
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
    setEditingId(null)
    setName('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingHubId])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (editingId) {
        await api.updateCategory(editingId, { name: name.trim() }, apiOpts)
        setMessage('Category updated.')
      } else {
        const data = await api.createCategory({ name: name.trim() }, apiOpts)
        setMessage(data.message || 'Category created.')
      }
      setName('')
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err.data?.errors?.name?.[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">SM Template</p>
          <h1>{editingId ? 'Edit category' : 'Categories'}</h1>
          <p className="muted">
            {isActingOnWhiteLabel
              ? `Managing categories on ${actingHub?.name}. Switch hubs from the top bar.`
              : 'Managing shared hub categories. Use Control hub in the top bar for a white-labelled hub.'}
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
            placeholder="Enter category name"
          />
        </label>
        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving
              ? 'Saving...'
              : editingId
                ? 'Update category'
                : isActingOnWhiteLabel
                  ? `Add category on ${actingHub?.name || 'hub'}`
                  : 'Add category'}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setEditingId(null)
                setName('')
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 className="section-title">
        {isActingOnWhiteLabel ? `Categories on ${actingHub?.name}` : 'Existing categories'}
      </h2>
      <DataGrid
        columns={[
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
        actions={(row) => (
          <>
            <DataGridIconBtn
              icon={FaEdit}
              label="Edit"
              onClick={() => {
                setEditingId(row.id)
                setName(row.name)
              }}
            />
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
        )}
      />
    </section>
  )
}
