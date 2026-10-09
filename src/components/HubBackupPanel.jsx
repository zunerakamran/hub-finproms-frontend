import { useCallback, useEffect, useMemo, useState } from 'react'
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

const TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Dublin',
  'Asia/Karachi',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
]

function formatBytes(n) {
  const size = Number(n) || 0
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function scheduleSummary(schedule) {
  if (!schedule.backup_enabled) return 'Automatic backups are off'
  const time = schedule.backup_time || '02:00'
  const tz = schedule.backup_timezone || 'UTC'
  if (schedule.backup_frequency === 'weekly') {
    const day = WEEKDAYS.find((d) => d.value === Number(schedule.backup_weekday))?.label || 'Sunday'
    return `Every ${day} at ${time} (${tz})`
  }
  return `Every day at ${time} (${tz})`
}

/**
 * Power Admin backup schedule + list/restore for one hub (Central control plane).
 */
export default function HubBackupPanel({ hubId, hubName, embedded = false, onScheduleSaved }) {
  const { canPower } = useAuth()
  const allowed = canPower('pa_manage_hub_backups')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [backups, setBackups] = useState([])
  const [lastRunAt, setLastRunAt] = useState(null)
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
      setLastRunAt(s.last_run_at || null)
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

  const timezoneOptions = useMemo(() => {
    const tz = schedule.backup_timezone
    if (tz && !TIMEZONES.includes(tz)) {
      return [tz, ...TIMEZONES]
    }
    return TIMEZONES
  }, [schedule.backup_timezone])

  const centralCount = backups.filter((b) => b.location === 'central' && b.status === 'completed').length
  const localCount = backups.filter((b) => b.location === 'local' && b.status === 'completed').length

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
      setLastRunAt(s.last_run_at || null)
      if (typeof onScheduleSaved === 'function') {
        await onScheduleSaved(data)
      }
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
      if (typeof onScheduleSaved === 'function') {
        await onScheduleSaved(data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  const onDownload = async (backup) => {
    setError('')
    setBusyId(backup.id)
    try {
      await api.downloadPowerAdminHubBackup(hubId, backup.id, backup.filename || 'backup.zip')
    } catch (err) {
      setError(err.message || 'Download failed.')
    } finally {
      setBusyId(null)
    }
  }

  const onRestore = async (backup) => {
    const ok = window.confirm(
      `Restore ${hubName || 'this hub'} from backup ${fileDisplayName(backup.filename) || backup.filename || backup.id}?\n\nThis overwrites the hub database and media files. Continue only if you are sure.`
    )
    if (!ok) return
    setError('')
    setMessage('')
    setBusyId(backup.id)
    try {
      const data = await api.restorePowerAdminHubBackup(hubId, backup.id)
      setMessage(data.message || 'Restore completed.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const onDelete = async (backup) => {
    if (!window.confirm(`Delete backup ${fileDisplayName(backup.filename) || backup.filename || backup.id}?`)) return
    setError('')
    setBusyId(backup.id)
    try {
      await api.deletePowerAdminHubBackup(hubId, backup.id)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={`hub-backup-panel${embedded ? ' hub-backup-panel--embedded' : ''}`}>
      {!embedded && (
        <div className="hub-backup-panel__intro">
          <h2>Backups</h2>
          <p className="muted">
            Scheduled backups save on the hub&apos;s own server and upload a copy to Central. Restore
            uses the Central copy.
          </p>
        </div>
      )}

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {loading ? (
        <div className="state">Loading backup settings…</div>
      ) : (
        <>
          <div className="hub-backup-stats" aria-label="Backup overview">
            <div className="hub-backup-stat">
              <span className="hub-backup-stat__label">Schedule</span>
              <span
                className={`admin-status-pill ${schedule.backup_enabled ? 'is-on' : 'is-off'}`}
              >
                {schedule.backup_enabled ? 'Enabled' : 'Disabled'}
              </span>
              <strong className="hub-backup-stat__value">{scheduleSummary(schedule)}</strong>
            </div>
            <div className="hub-backup-stat">
              <span className="hub-backup-stat__label">Last run</span>
              <strong className="hub-backup-stat__value">{formatWhen(lastRunAt)}</strong>
            </div>
            <div className="hub-backup-stat">
              <span className="hub-backup-stat__label">Stored copies</span>
              <strong className="hub-backup-stat__value">
                {centralCount} Central · {localCount} local
              </strong>
            </div>
          </div>

          <section className="hub-backup-card">
            <div className="hub-backup-card__head">
              <div>
                <h3>Schedule</h3>
                <p className="muted">
                  Cron checks every minute. A backup runs when this hub&apos;s local clock matches the
                  time below.
                </p>
              </div>
              <button
                type="button"
                className="btn primary"
                disabled={running || loading}
                onClick={onRunNow}
              >
                {running ? 'Creating backup…' : 'Backup now'}
              </button>
            </div>

            <form className="hub-backup-form" onSubmit={onSaveSchedule}>
              <label className="hub-backup-enable">
                <input
                  type="checkbox"
                  checked={schedule.backup_enabled}
                  onChange={(e) => setSchedule({ ...schedule, backup_enabled: e.target.checked })}
                />
                <span>
                  <strong>Enable scheduled backups</strong>
                  <small className="muted">
                    When off, only manual “Backup now” runs. Time settings are still saved.
                  </small>
                </span>
              </label>

              <div className="form-grid">
                <label>
                  Time
                  <input
                    type="time"
                    required
                    value={schedule.backup_time}
                    onChange={(e) => setSchedule({ ...schedule, backup_time: e.target.value })}
                  />
                </label>
                <label>
                  Timezone
                  <select
                    value={schedule.backup_timezone}
                    onChange={(e) => setSchedule({ ...schedule, backup_timezone: e.target.value })}
                  >
                    {timezoneOptions.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
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
                {schedule.backup_frequency === 'weekly' ? (
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
                ) : (
                  <div className="hub-backup-field-spacer" aria-hidden="true" />
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
                      setSchedule({
                        ...schedule,
                        backup_retention_central: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>

              <div className="actions">
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save schedule'}
                </button>
              </div>
            </form>
          </section>

          <section className="hub-backup-card">
            <div className="hub-backup-card__head">
              <div>
                <h3>Archives</h3>
                <p className="muted">
                  Restore is only available from completed <strong>Central</strong> copies (safe
                  source of truth).
                </p>
              </div>
            </div>

            {backups.length === 0 ? (
              <div className="hub-backup-empty">
                <p className="muted">No backups yet for this hub.</p>
                <button type="button" className="btn" disabled={running} onClick={onRunNow}>
                  {running ? 'Creating backup…' : 'Create first backup'}
                </button>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table hub-backup-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Size</th>
                      <th>File</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((b) => {
                      const busy = busyId === b.id
                      return (
                        <tr key={b.id}>
                          <td>
                            <div className="hub-backup-when">
                              <strong>{formatWhen(b.completed_at || b.created_at)}</strong>
                              {b.triggered_by ? (
                                <span className="muted">{b.triggered_by}</span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`badge ${b.location === 'central' ? 'ok' : 'warn'}`}
                            >
                              {b.location === 'central' ? 'Central' : 'Local'}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`admin-status-pill ${
                                b.status === 'completed'
                                  ? 'is-on'
                                  : b.status === 'failed'
                                    ? 'is-off'
                                    : ''
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td>{formatBytes(b.size_bytes)}</td>
                          <td>
                            {b.filename ? (
                              <FileNameLabel name={b.filename} mimeType="application/zip" />
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <div className="hub-backup-actions">
                              {b.downloadable && (
                                <button
                                  type="button"
                                  className="btn ghost"
                                  disabled={busy}
                                  onClick={() => onDownload(b)}
                                >
                                  Download
                                </button>
                              )}
                              {b.downloadable && b.location === 'central' && (
                                <button
                                  type="button"
                                  className="btn ghost hub-backup-restore"
                                  disabled={busy}
                                  onClick={() => onRestore(b)}
                                >
                                  Restore
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn ghost"
                                disabled={busy}
                                onClick={() => onDelete(b)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
