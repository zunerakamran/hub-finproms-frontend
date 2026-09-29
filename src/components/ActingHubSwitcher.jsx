import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

/**
 * Central Hub Controller switcher (Control hubs remotely).
 * Selecting a Shared or White-labelled hub scopes content tools to that hub’s database.
 */
export default function ActingHubSwitcher() {
  const { isPowerAdmin } = useAuth()
  const {
    hub,
    hubSwitcher,
    canControlWhiteLabelHubs,
    setActingHub,
    isActingRemotely,
    isActingOnWhiteLabel,
    actingHub,
    actingHubSwitching,
    isControlPlane,
  } = useHub()
  const [error, setError] = useState('')

  if (!canControlWhiteLabelHubs || !isControlPlane || !hubSwitcher?.enabled) {
    return null
  }

  const hubs = hubSwitcher.hubs || []
  const currentId = String(actingHub?.id || hubSwitcher.acting_hub?.id || hub?.id || '')
  const managedName = isActingRemotely
    ? actingHub?.name || (isActingOnWhiteLabel ? 'white-labelled hub' : 'shared hub')
    : hub?.name || 'Central Hub'

  const onChange = async (e) => {
    const next = e.target.value
    setError('')
    try {
      await setActingHub(next, { asPowerAdmin: isPowerAdmin })
    } catch (err) {
      setError(err.message || 'Could not switch hub')
    }
  }

  return (
    <div className="acting-hub-switcher">
      <label className="acting-hub-switcher-label">
        <span className="muted">Controlling</span>
        <select
          value={currentId}
          onChange={onChange}
          disabled={actingHubSwitching}
          aria-label="Hub switcher"
        >
          {hubs.map((h) => (
            <option key={h.id} value={String(h.id)} disabled={h.eligible === false}>
              {h.label || h.name}
            </option>
          ))}
        </select>
      </label>
      {isActingRemotely && (
        <span className="acting-hub-pill" title={managedName}>
          Controlling {managedName}
        </span>
      )}
      {error && <span className="acting-hub-error">{error}</span>}
    </div>
  )
}
