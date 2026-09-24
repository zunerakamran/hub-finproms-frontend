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
    actingHubSwitching,
  } = useHub()
  const [error, setError] = useState('')

  if (!canControlWhiteLabelHubs || hub?.type !== 'shared' || !hubSwitcher?.enabled) {
    return null
  }

  const hubs = hubSwitcher.hubs || []
  const currentId = String(actingHub?.id || hubSwitcher.acting_hub?.id || hub?.id || '')
  const managedName = isActingOnWhiteLabel
    ? actingHub?.name || 'white-label hub'
    : hub?.name || 'shared hub'

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
      <select
        className="acting-hub-switcher__select"
        aria-label="Control hub"
        value={currentId}
        disabled={actingHubSwitching || hubs.length === 0}
        onChange={onChange}
      >
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
      <p className="muted acting-hub-switcher__hint">
        Managing <strong>{managedName}</strong> — posts / types / categories / tags / bundles save
        to that hub&apos;s database.
      </p>
      {error ? <p className="acting-hub-switcher__error">{error}</p> : null}
    </div>
  )
}
