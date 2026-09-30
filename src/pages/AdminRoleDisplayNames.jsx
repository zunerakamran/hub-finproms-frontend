import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'

/**
 * Manage roles for the acting hub: add roles to the Capabilities matrix
 * and rename display titles. Gated by dashboard_manage_role_display_names
 * (“Manage roles”).
 */
export default function AdminRoleDisplayNames() {
  const { refreshHub, actingHub, actingHubId, hub, isActingRemotely } = useHub()
  const hubName = actingHub?.name || hub?.name || 'this hub'

  const [roles, setRoles] = useState([])
  const [availableToAdd, setAvailableToAdd] = useState([])
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingRole, setAddingRole] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [addMode, setAddMode] = useState('catalog')
  const [addCatalogKey, setAddCatalogKey] = useState('')
  const [addCustomKey, setAddCustomKey] = useState('')
  const [addCustomLabel, setAddCustomLabel] = useState('')

  const applyPayload = (data) => {
    const list = Array.isArray(data?.roles) ? data.roles : []
    setRoles(list)
    const next = {}
    list.forEach((role) => {
      next[role.key] = role.label ?? role.default_label ?? ''
    })
    setValues(next)
    const nextAvailable = data?.available_to_add || []
    setAvailableToAdd(nextAvailable)
    setAddCatalogKey((prev) => {
      if (nextAvailable.some((role) => role.key === prev)) return prev
      return nextAvailable[0]?.key || ''
    })
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.roleDisplayNames()
      applyPayload(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Reload when Control hub switcher changes the acting hub.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingHubId])

  const onChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const onReset = (key, defaultLabel) => {
    setValues((prev) => ({ ...prev, [key]: defaultLabel || '' }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.updateRoleDisplayNames(values)
      applyPayload(data)
      await refreshHub({ silent: true })
      setMessage(data.message || 'Role display names saved.')
    } catch (err) {
      setError(err.message || 'Failed to save role display names.')
    } finally {
      setSaving(false)
    }
  }

  const onAddRole = async (e) => {
    e.preventDefault()
    setAddingRole(true)
    setError('')
    setMessage('')
    try {
      const payload =
        addMode === 'catalog'
          ? { key: addCatalogKey }
          : {
              key: addCustomKey.trim() || undefined,
              label: addCustomLabel.trim() || undefined,
            }
      const data = await api.addHubRole(payload)
      applyPayload(data)
      setAddCustomKey('')
      setAddCustomLabel('')
      if (data.available_to_add?.length) {
        setAddCatalogKey(data.available_to_add[0].key)
      } else {
        setAddCatalogKey('')
        setAddMode('custom')
      }
      await refreshHub({ silent: true })
      setMessage(data.message || 'Role added.')
    } catch (err) {
      setError(err.message || 'Failed to add role.')
    } finally {
      setAddingRole(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Manage roles</h1>
          <p className="muted">
            Add roles to the Capabilities matrix for <strong>{hubName}</strong>
            {isActingRemotely ? ' (via Control hub)' : ''} and customize how those role names appear
            in the UI. Capability checkboxes stay under{' '}
            <Link to="/my-dashboard/capabilities">Capabilities</Link>.
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <>
          <form className="matrix-add-role" onSubmit={onAddRole}>
            <div className="matrix-add-role__head">
              <h2>Add role to this hub</h2>
              <p className="muted">
                Adds a role column on <strong>{hubName}</strong> only (even before any users have
                that role). Other hubs are unchanged until you switch and add there too.
              </p>
            </div>
            <div className="matrix-add-role__modes">
              <label>
                <input
                  type="radio"
                  name="add-role-mode"
                  checked={addMode === 'catalog'}
                  onChange={() => setAddMode('catalog')}
                  disabled={availableToAdd.length === 0}
                />
                Existing system role
              </label>
              <label>
                <input
                  type="radio"
                  name="add-role-mode"
                  checked={addMode === 'custom'}
                  onChange={() => setAddMode('custom')}
                />
                New custom role
              </label>
            </div>
            {addMode === 'catalog' ? (
              <label className="matrix-add-role__field">
                Role
                <select
                  value={addCatalogKey}
                  onChange={(e) => setAddCatalogKey(e.target.value)}
                  disabled={availableToAdd.length === 0}
                >
                  {availableToAdd.length === 0 ? (
                    <option value="">All available roles already on this hub</option>
                  ) : (
                    availableToAdd.map((role) => (
                      <option key={role.key} value={role.key}>
                        {role.label}
                        {role.is_custom ? ' (custom)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </label>
            ) : (
              <div className="matrix-add-role__custom">
                <label className="matrix-add-role__field">
                  Display name
                  <input
                    type="text"
                    value={addCustomLabel}
                    onChange={(e) => setAddCustomLabel(e.target.value)}
                    placeholder="e.g. Compliance Lead"
                    maxLength={100}
                    required
                  />
                </label>
                <label className="matrix-add-role__field">
                  Key (optional)
                  <input
                    type="text"
                    value={addCustomKey}
                    onChange={(e) => setAddCustomKey(e.target.value)}
                    placeholder="auto from name, e.g. compliance_lead"
                    maxLength={41}
                  />
                </label>
              </div>
            )}
            <button
              className="btn primary"
              type="submit"
              disabled={
                addingRole ||
                (addMode === 'catalog' && (!addCatalogKey || availableToAdd.length === 0)) ||
                (addMode === 'custom' && !addCustomLabel.trim() && !addCustomKey.trim())
              }
            >
              {addingRole ? 'Adding…' : 'Add role to this hub'}
            </button>
          </form>

          <form className="admin-form settings-form" onSubmit={onSubmit}>
            <div className="settings-block">
              <h2>Role display names</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Customize how role names appear across this hub’s UI. Leave a field as the default
                (or clear it) to reset that role.
              </p>
              {roles.length === 0 ? (
                <div className="empty-state">
                  <h2>No roles on this hub yet</h2>
                  <p className="muted">Add a role above, or create users with roles first.</p>
                </div>
              ) : (
                <div className="form-grid">
                  {roles.map((role) => (
                    <label key={role.key}>
                      {role.default_label || role.key}
                      <span
                        className="muted"
                        style={{ display: 'block', fontSize: '0.85em', marginBottom: 4 }}
                      >
                        Key: {role.key}
                      </span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          value={values[role.key] ?? ''}
                          onChange={(e) => onChange(role.key, e.target.value)}
                          placeholder={role.default_label || role.key}
                          maxLength={100}
                        />
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => onReset(role.key, role.default_label)}
                          title="Reset to default"
                        >
                          Reset
                        </button>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {roles.length > 0 && (
              <div className="actions sticky-actions">
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save display names'}
                </button>
              </div>
            )}
          </form>
        </>
      )}
    </section>
  )
}
