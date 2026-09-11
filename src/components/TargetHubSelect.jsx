import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

/**
 * Hub dropdown (same pattern as Capabilities / Functionalities).
 * Shared = manage this hub's catalog. White-label = create/list on that hub's own DB only.
 */
export default function TargetHubSelect({
  value,
  onChange,
  asPowerAdmin = false,
}) {
  const { can, hub } = useHub()
  const { isPowerAdmin } = useAuth()
  const apiOpts = { asPowerAdmin: asPowerAdmin || isPowerAdmin }
  const [hubs, setHubs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const enabled = Boolean(can('dashboard_push_content') && hub?.type === 'shared')

  useEffect(() => {
    if (!enabled) {
      setHubs([])
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await api.hubContentTargets(apiOpts)
        if (cancelled) return
        const list = data.hubs || []
        setHubs(list)
        if (!value && list[0]) {
          onChange(String(list[0].id))
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, asPowerAdmin, isPowerAdmin])

  if (!enabled) {
    return null
  }

  const selected = hubs.find((h) => String(h.id) === String(value))

  return (
    <div className="target-hub-select">
      <label className="hub-select-label">
        Hub
        <select
          value={value || ''}
          disabled={loading}
          onChange={(e) => onChange(e.target.value)}
        >
          {hubs.map((h) => (
            <option key={h.id} value={h.id} disabled={h.type === 'white_label' && !h.eligible}>
              {h.label || `${h.name} (${h.type})`}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="muted">{error}</p>}
      {selected?.type === 'white_label' && (
        <p className="muted field-hint">
          Content you create here is saved only on <strong>{selected.name}</strong>&apos;s own
          database — it will not appear on the shared hub.{' '}
          <Link to="/my-dashboard/hubs">Manage hubs</Link>
        </p>
      )}
      {selected?.type === 'shared' && (
        <p className="muted field-hint">Managing the shared hub catalog.</p>
      )}
    </div>
  )
}

export function isWhiteLabelTarget(hubs, hubId) {
  const selected = (hubs || []).find((h) => String(h.id) === String(hubId))
  return selected?.type === 'white_label'
}
