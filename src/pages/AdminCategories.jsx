import { useEffect, useState } from 'react'
import { api } from '../api/client'
import TargetHubSelect from '../components/TargetHubSelect'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function AdminCategories({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, hub } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const apiOpts = { asPowerAdmin }
  const canTargetHubs = Boolean(can('dashboard_push_content') && hub?.type === 'shared')

  const [targetHubId, setTargetHubId] = useState('')
  const [targetHubs, setTargetHubs] = useState([])
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const selectedTarget = targetHubs.find((h) => String(h.id) === String(targetHubId))
  const isRemote = Boolean(canTargetHubs && selectedTarget?.type === 'white_label')

  useEffect(() => {
    if (!canTargetHubs) return
    ;(async () => {
      try {
        const data = await api.hubContentTargets(apiOpts)
        setTargetHubs(data.hubs || [])
      } catch {
        setTargetHubs([])
      }
    })()
  }, [canTargetHubs])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      if (isRemote && targetHubId) {
        const data = await api.hubContentCategories(targetHubId, apiOpts)
        setCategories(data.categories || [])
      } else {
        const data = await api.listCategories()
        setCategories(data.categories || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canTargetHubs && !targetHubId) return
    load()
    setEditingId(null)
    setName('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetHubId, isRemote])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (editingId) {
        if (isRemote) {
          setError('Edit on white-label hubs is not available here yet.')
          return
        }
        await api.updateCategory(editingId, { name: name.trim() }, apiOpts)
        setMessage('Category updated.')
      } else if (isRemote) {
        const data = await api.hubContentCreateCategory(targetHubId, { name: name.trim() }, apiOpts)
        setMessage(data.message || 'Category created on white-label hub.')
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
          <p className="eyebrow">Client Admin</p>
          <h1>{editingId ? 'Edit category' : 'Categories'}</h1>
          <p className="muted">
            Select the hub. White-label categories are stored only on that hub&apos;s database.
          </p>
        </div>
      </div>

      <TargetHubSelect value={targetHubId} onChange={setTargetHubId} asPowerAdmin={asPowerAdmin} />

      <form className="admin-form" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <label>
          Category name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="LinkedIn, Instagram, Mortgages..."
          />
        </label>
        <div className="actions">
          <button className="btn primary" disabled={saving || (canTargetHubs && !targetHubId)}>
            {saving
              ? 'Saving...'
              : editingId
                ? 'Update category'
                : isRemote
                  ? `Add category on ${selectedTarget?.name || 'hub'}`
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
        {isRemote ? `Categories on ${selectedTarget?.name}` : 'Existing categories'}
      </h2>
      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <div className="admin-list">
          {categories.map((category) => (
            <div key={category.id} className="admin-row">
              <div>
                <strong>{category.name}</strong>
              </div>
              {!isRemote && (
                <div className="actions">
                  <button
                    className="btn ghost"
                    onClick={() => {
                      setEditingId(category.id)
                      setName(category.name)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn danger"
                    onClick={async () => {
                      if (!window.confirm('Delete this category?')) return
                      await api.deleteCategory(category.id, apiOpts)
                      await load()
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
