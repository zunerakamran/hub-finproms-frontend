import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

/**
 * Admin-staff advisor picker — work on behalf of a firm-scoped advisor.
 */
export default function ActingAdvisorSwitcher() {
  const { isAdminStaff, refreshUser } = useAuth()
  const { actingAdvisorSwitcher, setActingAdvisor, roleLabel } = useHub()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!isAdminStaff || !actingAdvisorSwitcher?.enabled) {
    return null
  }

  const advisors = actingAdvisorSwitcher.advisors || []
  const currentId = String(actingAdvisorSwitcher.acting_advisor?.id || '')
  const staffLabel = roleLabel('admin_staff') || 'Admin-staff'

  const onChange = async (e) => {
    const next = e.target.value
    setSaving(true)
    setError('')
    try {
      await setActingAdvisor(next === '' ? null : next)
      await refreshUser()
    } catch (err) {
      setError(err.message || 'Could not select advisor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="acting-hub-switcher acting-advisor-switcher">
      <label className="acting-hub-switcher__label">
        <span>Work on behalf of</span>
        <select value={currentId} disabled={saving || advisors.length === 0} onChange={onChange}>
          <option value="">Select advisor…</option>
          {advisors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.email ? ` (${a.email})` : ''}
            </option>
          ))}
        </select>
      </label>
      {actingAdvisorSwitcher.acting_advisor ? (
        <p className="muted acting-hub-switcher__hint">
          Acting as <strong>{actingAdvisorSwitcher.acting_advisor.name}</strong> — compliance
          submissions are attributed to them, with you recorded as {staffLabel}.
        </p>
      ) : (
        <p className="muted acting-hub-switcher__hint">
          Choose an advisor in your firm before submitting compliance work.
        </p>
      )}
      {advisors.length === 0 ? (
        <p className="muted acting-hub-switcher__hint">
          No advisors found in your firm who have allowed Admin-staff to act on their behalf.
        </p>
      ) : null}
      {error ? <p className="muted">{error}</p> : null}
    </div>
  )
}
