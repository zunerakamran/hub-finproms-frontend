import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

/**
 * Shared-dashboard hub switcher (Control white labelled hubs).
 * Selecting a white-label hub scopes content tools to that hub’s database.
 */
export default function ActingHubSwitcher() {
  const { isPowerAdmin } = useAuth()
  const {
    hub,
    hubSwitcher,
    canControlWhiteLabelHubs,
    setActingHub,
    isActingOnWhiteLabel,
    actingHub,
  } = useHub()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!canControlWhiteLabelHubs || hub?.type !== 'shared' || !hubSwitcher?.enabled) {
    return null
  }

  const hubs = hubSwitcher.hubs || []
  const currentId = String(actingHub?.id || hubSwitcher.acting_hub?.id || hub?.id || '')

  const onChange = async (e) => {
    const next = e.target.value
    setSaving(true)
    setError('')
    try {
      await setActingHub(next, { asPowerAdmin: isPowerAdmin })
    } catch (err) {
      setError(err.message || 'Could not switch hub')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="acting-hub-switcher">
      <label className="acting-hub-switcher__label">
        <span>Control hub</span>
        <select value={currentId} disabled={saving || hubs.length === 0} onChange={onChange}>
          {hubs.map((h) => (
            <option
              key={h.id}
              value={h.id}
              disabled={h.type === 'white_label' && !h.eligible}
            >
              {h.label || `${h.name} (${h.type})`}
            </option>
          ))}
        </select>
      </label>
      {isActingOnWhiteLabel ? (
        <p className="muted acting-hub-switcher__hint">
          Managing <strong>{actingHub?.name}</strong> — posts / types / categories / tags /
          bundles save to that hub&apos;s database.
        </p>
      ) : (
        <p className="muted acting-hub-switcher__hint">Managing the shared hub catalog.</p>
      )}
      {error ? <p className="muted">{error}</p> : null}
    </div>
  )
}
