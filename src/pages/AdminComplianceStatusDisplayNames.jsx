import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'

export default function AdminComplianceStatusDisplayNames() {
  const { refreshHub } = useHub()
  const [statuses, setStatuses] = useState([])
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const applyPayload = (data) => {
    const list = Array.isArray(data?.statuses) ? data.statuses : []
    setStatuses(list)
    const next = {}
    list.forEach((item) => {
      next[item.key] = item.label ?? item.default_label ?? ''
    })
    setValues(next)
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.complianceStatusDisplayNames()
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
      const data = await api.updateComplianceStatusDisplayNames(values)
      applyPayload(data)
      await refreshHub({ silent: true })
      setMessage(data.message || 'Compliance status display names saved.')
    } catch (err) {
      setError(err.message || 'Failed to save compliance status display names.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Compliance status names</h1>
          <p className="muted">
            Customize how compliance statuses appear across Social Media, General, and Website
            Compliance. Leave a field as the default (or clear it) to reset that status.
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
            <h2>Statuses</h2>
            <div className="form-grid">
              {statuses.map((item) => (
                <label key={item.key}>
                  {item.default_label || item.key}
                  <span className="muted" style={{ display: 'block', fontSize: '0.85em', marginBottom: 4 }}>
                    Key: {item.key}
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      value={values[item.key] ?? ''}
                      onChange={(e) => onChange(item.key, e.target.value)}
                      placeholder={item.default_label || item.key}
                      maxLength={100}
                    />
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => onReset(item.key, item.default_label)}
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
              {saving ? 'Saving…' : 'Save status names'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
