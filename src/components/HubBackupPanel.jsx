import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import FileNameLabel from './FileNameLabel'
import { useAuth } from '../context/AuthContext'
import { fileDisplayName } from '../utils/fileDisplay'

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

function formatBytes(n) {
  const size = Number(n) || 0
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Power Admin backup schedule + list/restore for one hub (Central control plane).
 */
export default function HubBackupPanel({ hubId, hubName }) {
  const { canPower } = useAuth()
  const allowed = canPower('pa_manage_hub_backups')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [backups, setBackups] = useState([])
  const [schedule, setSchedule] = useState({
    backup_enabled: false,
    backup_time: '02:00',
    backup_timezone: 'UTC',
    backup_frequency: 'daily',
    backup_weekday: 0,
    backup_retention_local: 3,
    backup_retention_central: 14,
  })

  const load = useCallback(async () => {
    if (!allowed || !hubId) return
    setLoading(true)
    setError('')
    try {
      const data = await api.powerAdminHubBackups(hubId)
      const s = data.schedule || {}
      setSchedule({
        backup_enabled: Boolean(s.enabled),
        backup_time: s.time || '02:00',
        backup_timezone: s.timezone || 'UTC',
        backup_frequency: s.frequency || 'daily',
        backup_weekday: s.weekday != null ? s.weekday : 0,
        backup_retention_local: s.retention_local ?? 3,
        backup_retention_central: s.retention_central ?? 14,
      })
      setBackups(Array.isArray(data.backups) ? data.backups : [])
    } catch (err) {
      setError(err.message || 'Could not load backups.')
    } finally {
      setLoading(false)
    }
  }, [allowed, hubId])

  useEffect(() => {
    load()
  }, [load])

  if (!allowed) {
    return null
  }

  const onSaveSchedule = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.updatePowerAdminHubBackupSchedule(hubId, schedule)
      setMessage(data.message || 'Backup schedule saved.')
      const s = data.schedule || {}
      setSchedule((prev) => ({
        ...prev,
        backup_enabled: Boolean(s.enabled),
        backup_time: s.time || prev.backup_time,
        backup_timezone: s.timezone || prev.backup_timezone,
        backup_frequency: s.frequency || prev.backup_frequency,
        backup_weekday: s.weekday != null ? s.weekday : prev.backup_weekday,
        backup_retention_local: s.retention_local ?? prev.backup_retention_local,
        backup_retention_central: s.retention_central ?? prev.backup_retention_central,
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const onRunNow = async () => {
    setRunning(true)
    setError('')
    setMessage('')
    try {
      const data = await api.createPowerAdminHubBackup(hubId)
      setMessage(data.message || 'Backup created.')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  const onDownload = async (backup) => {
    setError('')
    try {
      await api.downloadPowerAdminHubBackup(hubId, backup.id, backup.filename || 'backup.zip')
    } catch (err) {
      setError(err.message || 'Download failed.')
    }
  }

  const onRestore = async (backup) => {
    const ok = window.confirm(
      `Restore ${hubName || 'this hub'} from backup ${fileDisplayName(backup.filename) || backup.filename || backup.id}?\n\nThis overwrites the hub database and media files. Continue only if you are sure.`
    )
    if (!ok) return
    setError('')
    setMessage('')
    try {
      const data = await api.restorePowerAdminHubBackup(hubId, backup.id)
      setMessage(data.message || 'Restore completed.')
    } catch (err) {
      setError(err.message)
    }
  }

  const onDelete = async (backup) => {
    if (!window.confirm(`Delete backup ${fileDisplayName(backup.filename) || backup.filename || backup.id}?`)) return
    setError('')
    try {
      await api.deletePowerAdminHubBackup(hubId, backup.id)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-form" style={{ marginTop: '2rem' }}>
      <h2>Backups</h2>
      <p className="muted">
        Scheduled backups save on the hub&apos;s own server and upload a copy to Central. Restore
        uses the Central copy. Each hub can have its own time and timezone.
      </p>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {loading ? (
        <p className="muted">Loading backups…</p>
      ) : (
        <>
          <form onSubmit={onSaveSchedule}>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={schedule.backup_enabled}
                onChange={(e) => setSchedule({ ...schedule, backup_enabled: e.target.checked })}
              />
              <span>Enable scheduled backups</span>
            </label>
            <label>
              Time (24h)
              <input
                type="time"
                required
                value={schedule.backup_time}
                onChange={(e) => setSchedule({ ...schedule, backup_time: e.target.value })}
              />
            </label>
            <label>
              Timezone
              <input
                value={schedule.backup_timezone}
                onChange={(e) => setSchedule({ ...schedule, backup_timezone: e.target.value })}
                placeholder="Asia/Karachi"
              />
            </label>
            <label>
              Frequency
              <select
                value={schedule.backup_frequency}
                onChange={(e) => setSchedule({ ...schedule, backup_frequency: e.target.value })}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            {schedule.backup_frequency === 'weekly' && (
              <label>
                Weekday
                <select
                  value={schedule.backup_weekday}
                  onChange={(e) =>
                    setSchedule({ ...schedule, backup_weekday: Number(e.target.value) })
                  }
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Keep local copies
              <input
                type="number"
                min={1}
                max={60}
                value={schedule.backup_retention_local}
                onChange={(e) =>
                  setSchedule({ ...schedule, backup_retention_local: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Keep Central copies
              <input
                type="number"
                min={1}
                max={90}
                value={schedule.backup_retention_central}
                onChange={(e) =>
                  setSchedule({ ...schedule, backup_retention_central: Number(e.target.value) })
                }
              />
            </label>
            <div className="actions">
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save backup schedule'}
              </button>
              <button type="button" className="btn" disabled={running} onClick={onRunNow}>
                {running ? 'Running…' : 'Backup now'}
              </button>
            </div>
          </form>

          <h3 style={{ marginTop: '1.5rem' }}>Stored backups</h3>
          {backups.length === 0 ? (
            <p className="muted">No backups yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Size</th>
                    <th>File</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.id}>
                      <td>{b.completed_at || b.created_at || '—'}</td>
                      <td>{b.location}</td>
                      <td>{b.status}</td>
                      <td>{formatBytes(b.size_bytes)}</td>
                      <td>
                        {b.filename ? (
                          <FileNameLabel name={b.filename} mimeType="application/zip" />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="actions">
                        {b.downloadable && b.location === 'central' && (
                          <>
                            <button type="button" className="btn ghost" onClick={() => onDownload(b)}>
                              Download
                            </button>
                            <button type="button" className="btn ghost" onClick={() => onRestore(b)}>
                              Restore
                            </button>
                          </>
                        )}
                        {b.downloadable && b.location === 'local' && (
                          <button type="button" className="btn ghost" onClick={() => onDownload(b)}>
                            Download
                          </button>
                        )}
                        <button type="button" className="btn ghost" onClick={() => onDelete(b)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
