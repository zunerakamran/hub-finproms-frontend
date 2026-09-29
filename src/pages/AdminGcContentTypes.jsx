import { useEffect, useState } from 'react'
import { FaEdit, FaTrash } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function AdminGcContentTypes() {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const asPowerAdmin = isPowerAdmin
  const apiOpts = { asPowerAdmin }

  const [types, setTypes] = useState([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const moduleOn = can('module_general_compliance')
  const canManage = can('gc_manage_content_types')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.generalComplianceAdminContentTypes(apiOpts)
      setTypes(data.types || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading || !moduleOn || !canManage) {
      setLoading(false)
      return
    }
    load()
    setEditingId(null)
    setName('')
    setSlug('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, moduleOn, canManage])

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
        await api.generalComplianceUpdateContentType(editingId, payload, apiOpts)
        setMessage('Content type updated.')
      } else {
        const data = await api.generalComplianceCreateContentType(payload, apiOpts)
        setMessage(data.message || 'Content type created.')
      }
      reset()
      await load()
    } catch (err) {
      setError(err.data?.errors?.name?.[0] || err.data?.errors?.slug?.[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && (!moduleOn || !canManage)) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">General Compliance</p>
            <h1>Content types</h1>
            <p className="muted">
              {!moduleOn
                ? 'Generic Content Pre Approval module is off for this hub.'
                : 'You do not have permission to manage general compliance content types.'}
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
          <p className="eyebrow">General Compliance</p>
          <h1>{editingId ? 'Edit content type' : 'Content types'}</h1>
          <p className="muted">
            Options shown in the Content type dropdown when submitting a general compliance request.
          </p>
        </div>
      </div>

      <form className="admin-form" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <label>
          Type name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Brochure, Email, Landing page…"
          />
        </label>
        <label>
          Slug (optional)
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="brochure, email…"
          />
        </label>
        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update type' : 'Add type'}
          </button>
          {editingId && (
            <button type="button" className="btn ghost" onClick={reset}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 className="section-title">Existing types</h2>
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
        rows={types}
        loading={loading}
        emptyMessage="No content types yet. Add one above."
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
                if (!window.confirm('Delete this content type?')) return
                try {
                  await api.generalComplianceDeleteContentType(row.id, apiOpts)
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
