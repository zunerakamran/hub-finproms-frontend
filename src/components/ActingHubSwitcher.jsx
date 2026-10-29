import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

/**
 * Central Hub Controller switcher (Control hubs remotely).
 * Selecting a Shared or White-labelled hub scopes content tools to that hub’s database.
 */
export default function ActingHubSwitcher() {
  const { isPowerAdmin } = useAuth()
  const navigate = useNavigate()
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
      // Soft navigate: strip trailing detail ids so we never keep another hub's
      // resource open. Outlet remounts via actingHubId — no full page reload.
      const path = (window.location.pathname || '/my-dashboard').replace(/\/$/, '') || '/my-dashboard'
      const safePath = path.replace(/\/\d+$/, '') || '/my-dashboard'
      const target = safePath.startsWith('/my-dashboard') ? safePath : '/my-dashboard'
      if (target !== path) {
        navigate(target, { replace: true })
      } else if (!path.startsWith('/my-dashboard')) {
        navigate('/my-dashboard', { replace: true })
      }
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
            <option
              key={h.id}
              value={String(h.id)}
              disabled={h.eligible === false}
              title={h.eligible === false ? h.reason || 'Not ready for remote control' : undefined}
            >
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
      {error && <span className="acting-hub-error">{error</span>}
      {hubs.some((h) => h.eligible === false) && (
        <p className="muted acting-hub-switcher__hint" style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>
          Greyed hubs need deploy wiring (remote DB credentials) on Power Admin → Hubs.
        </p>
      )}
    </div>
  )
}
