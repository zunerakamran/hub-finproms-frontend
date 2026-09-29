import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

/**
 * Admin-staff advisor picker — work on behalf of a firm-scoped advisor.
 * Optional: leave empty to use Admin-staff Capabilities matrix cells.
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
  const advisorLabel = roleLabel('advisor') || 'Advisor'

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
          <option value="">
            {staffLabel} (own access)
          </option>
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
          Dashboard and website match {actingAdvisorSwitcher.acting_advisor.name} (
          {advisorLabel}). Submissions are attributed as {staffLabel} on behalf of that{' '}
          {advisorLabel.toLowerCase()}.
        </p>
      ) : (
        <p className="muted acting-hub-switcher__hint">
          Using your {staffLabel} capabilities. Select a firm {advisorLabel.toLowerCase()} to
          work on their behalf.
        </p>
      )}
      {advisors.length === 0 ? (
        <p className="muted acting-hub-switcher__hint">
          No {advisorLabel.toLowerCase()}s in your firm have allowed {staffLabel} to act on
          their behalf yet.
        </p>
      ) : null}
      {error ? <p className="muted">{error}</p> : null}
    </div>
  )
}
