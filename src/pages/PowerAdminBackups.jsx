import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import HubBackupPanel from '../components/HubBackupPanel'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function hubTypeLabel(type) {
  if (type === 'central') return 'Central'
  if (type === 'shared') return 'Shared'
  return 'White-labelled'
}

function formatSchedule(backup) {
  if (!backup) return '—'
  if (!backup.enabled) return 'Disabled'
  const time = backup.time || '02:00'
  const tz = backup.timezone || 'UTC'
  const freq = backup.frequency || 'daily'
  if (freq === 'weekly') {
    const day = WEEKDAYS[backup.weekday ?? 0] || 'Sunday'
    return `Weekly ${day} at ${time} (${tz})`
  }
  return `Daily at ${time} (${tz})`
}

function formatWhen(iso) {
  if (!iso) return 'Never'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

/**
 * Platform tool: pick a hub, set backup schedule/time, run/download/restore.
 * Gated by pa_manage_hub_backups.
 */
export default function PowerAdminBackups() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [hubs, setHubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const selectedId = searchParams.get('hub') || ''

  const selectedHub = useMemo(
    () => hubs.find((h) => String(h.id) === String(selectedId)) || null,
    [hubs, selectedId]
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await api.powerAdminHubs()
        if (cancelled) return
        const list = Array.isArray(data.hubs) ? data.hubs : []
        setHubs(list)
        if (!searchParams.get('hub') && list.length > 0) {
          setSearchParams({ hub: String(list[0].id) }, { replace: true })
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load hubs.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, [])

  const onSelectHub = (hubId) => {
    setSearchParams(hubId ? { hub: String(hubId) } : {}, { replace: true })
  }

  return (
    <div className="admin-form">
      <h1>Hub backups &amp; restore</h1>
      <p className="muted">
        Set each hub&apos;s backup time and timezone, run Backup now, download Central copies, or
        restore a hub from a Central archive. Scheduled runs fire when the hub&apos;s local clock
        matches the configured time (cron must call <code>schedule:run</code> every minute).
      </p>

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <p className="muted">Loading hubs…</p>
      ) : hubs.length === 0 ? (
        <p className="muted">No hubs registered yet.</p>
      ) : (
        <>
          <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hub</th>
                  <th>Type</th>
                  <th>Schedule</th>
                  <th>Last run</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {hubs.map((hub) => {
                  const backup = hub.backup || {}
                  const active = String(hub.id) === String(selectedId)
                  return (
                    <tr key={hub.id} className={active ? 'is-active' : undefined}>
                      <td>
                        <strong>{hub.name}</strong>
                        <div className="muted">{hub.slug}</div>
                      </td>
                      <td>{hubTypeLabel(hub.type)}</td>
                      <td>{formatSchedule(backup)}</td>
                      <td>{formatWhen(backup.last_run_at)}</td>
                      <td>
                        <button
                          type="button"
                          className={active ? 'btn primary' : 'btn ghost'}
                          onClick={() => onSelectHub(hub.id)}
                        >
                          {active ? 'Selected' : 'Manage'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {selectedHub ? (
            <HubBackupPanel
              key={selectedHub.id}
              hubId={selectedHub.id}
              hubName={selectedHub.name}
              embedded
              onScheduleSaved={async () => {
                try {
                  const data = await api.powerAdminHubs()
                  setHubs(Array.isArray(data.hubs) ? data.hubs : [])
                } catch {
                  /* ignore refresh errors */
                }
              }}
            />
          ) : (
            <p className="muted">Select a hub to manage its backup schedule and restores.</p>
          )}
        </>
      )}
    </div>
  )
}
