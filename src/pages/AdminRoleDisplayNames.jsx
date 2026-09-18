import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'

export default function AdminRoleDisplayNames() {
  const { refreshHub } = useHub()
  const [roles, setRoles] = useState([])
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const applyPayload = (data) => {
    const list = Array.isArray(data?.roles) ? data.roles : []
    setRoles(list)
    const next = {}
    list.forEach((role) => {
      next[role.key] = role.label ?? role.default_label ?? ''
    })
    setValues(next)
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
  }, [])

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

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Role display names</h1>
          <p className="muted">
            Customize how role names appear across this hub’s UI. Leave a field as the default (or
            clear it) to reset that role.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <form className="admin-form settings-form" onSubmit={onSubmit}>
          {error && <div className="alert">{error}</div>}
          {message && <div className="alert success">{message}</div>}

          <div className="settings-block">
            <h2>Roles</h2>
            <div className="form-grid">
              {roles.map((role) => (
                <label key={role.key}>
                  {role.default_label || role.key}
                  <span className="muted" style={{ display: 'block', fontSize: '0.85em', marginBottom: 4 }}>
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
          </div>

          <div className="actions sticky-actions">
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save display names'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
