import { useEffect, useState } from 'react'
import { FaEdit, FaTrash } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function AdminTypes({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { actingHubId, isActingOnWhiteLabel, isActingRemotely, actingHub, isControlPlane, can } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const apiOpts = { asPowerAdmin }
  const canManage = can('dashboard_manage_types')

  const [types, setTypes] = useState([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = isActingRemotely
        ? await api.hubContentTypes(apiOpts)
        : await api.listTypes()
      setTypes(data.types || [])
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
    setSlug('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingHubId])

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
        await api.updateType(editingId, payload, apiOpts)
        setMessage('Type updated.')
      } else {
        const data = await api.createType(payload, apiOpts)
        setMessage(data.message || 'Type created.')
      }
      reset()
      await load()
    } catch (err) {
      setError(err.data?.errors?.name?.[0] || err.data?.errors?.slug?.[0] || err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">SM Template</p>
          <h1>{editingId ? 'Edit type' : 'Content types'}</h1>
          <p className="muted">
            {isActingRemotely
              ? `Managing types on ${actingHub?.name}. Switch hubs from the top bar.`
              : isControlPlane
                ? canManage
                  ? 'Managing Central Hub types used by the Central content library. When you distribute a post, matching type names are upserted into the target hub.'
                  : 'Listing Central Hub types. Enable Manage types in Capabilities to create or edit.'
                : canManage
                  ? 'Managing shared hub types. Use Control hub in the top bar for a white-labelled hub.'
                  : 'Types on this hub are list-only. New types arrive with posts distributed from the Central content library.'}
          </p>
        </div>
      </div>

      {canManage && (
      <form className="admin-form" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <label>
          Type name
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Post, Reel..." />
        </label>
        <label>
          Slug (optional)
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="post, reel..." />
        </label>
        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving
              ? 'Saving...'
              : editingId
                ? 'Update type'
                : isActingRemotely
                  ? `Add type on ${actingHub?.name || 'hub'}`
                  : 'Add type'}
          </button>
          {editingId && (
            <button type="button" className="btn ghost" onClick={reset}>
              Cancel edit
            </button>
          )}
        </div>
      </form>
      )}

      {!canManage && error && <div className="alert">{error}</div>}

      <h2 className="section-title">
        {isActingRemotely ? `Types on ${actingHub?.name}` : 'Existing types'}
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
          {
            key: 'slug',
            label: 'Slug',
            fit: true,
            filterValue: (row) => row.slug || '',
            render: (row) => row.slug || '—',
          },
        ]}
        rows={types}
        loading={loading}
        emptyMessage="No types yet."
        getRowKey={(row) => row.id}
        actions={
          canManage
            ? (row) => (
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
                if (!window.confirm('Delete this type?')) return
                try {
                  await api.deleteType(row.id, apiOpts)
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
