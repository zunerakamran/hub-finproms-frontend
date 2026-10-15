import { useCallback, useEffect, useState } from 'react'
import { FaSignOutAlt, FaSync } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const PRESET_MINUTES = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 240, label: '4 hours' },
  { value: 1440, label: '1 day' },
  { value: 10080, label: '7 days' },
]

function formatMinutes(minutes) {
  const n = Number(minutes) || 0
  if (n % 1440 === 0) {
    const days = n / 1440
    return `${days} day${days === 1 ? '' : 's'}`
  }
  if (n % 60 === 0) {
    const hours = n / 60
    return `${hours} hour${hours === 1 ? '' : 's'}`
  }
  return `${n} minute${n === 1 ? '' : 's'}`
}

export default function AdminActiveSessions({ shell = 'client-admin' }) {
  const navigate = useNavigate()
  const { isPowerAdmin, user, logout } = useAuth()
  const { can, loading: hubLoading, actingHub, isActingRemotely, roleLabel } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_manage_active_sessions')
  const apiOpts = { asPowerAdmin }

  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ total_users: 0, total_sessions: 0 })
  const [hubMeta, setHubMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loggingOutId, setLoggingOutId] = useState(null)

  const [timeoutMinutes, setTimeoutMinutes] = useState(10080)
  const [timeoutMeta, setTimeoutMeta] = useState({
    min_minutes: 15,
    max_minutes: 43200,
    default_minutes: 10080,
    is_custom: false,
  })
  const [timeoutLoading, setTimeoutLoading] = useState(true)
  const [timeoutSaving, setTimeoutSaving] = useState(false)
  const [timeoutDirty, setTimeoutDirty] = useState(false)

  const targetName = isActingRemotely
    ? actingHub?.name || hubMeta?.name || 'selected hub'
    : hubMeta?.name || 'this hub'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.activeSessions(apiOpts)
      setRows(data.data || [])
      setMeta(data.meta || { total_users: 0, total_sessions: 0 })
      setHubMeta(data.hub || null)
    } catch (err) {
      setError(err.message || 'Failed to load active sessions.')
      setRows([])
      setMeta({ total_users: 0, total_sessions: 0 })
    } finally {
      setLoading(false)
    }
  }, [asPowerAdmin])

  const loadTimeout = useCallback(async () => {
    setTimeoutLoading(true)
    try {
      const data = await api.sessionSettings(apiOpts)
      const settings = data.data || {}
      setTimeoutMinutes(settings.session_lifetime_minutes ?? 10080)
      setTimeoutMeta({
        min_minutes: settings.min_minutes ?? 15,
        max_minutes: settings.max_minutes ?? 43200,
        default_minutes: settings.default_minutes ?? 10080,
        is_custom: Boolean(settings.is_custom),
      })
      setTimeoutDirty(false)
      if (data.hub) setHubMeta((prev) => prev || data.hub)
    } catch (err) {
      setError((prev) => prev || err.message || 'Failed to load session timeout.')
    } finally {
      setTimeoutLoading(false)
    }
  }, [asPowerAdmin])

  useEffect(() => {
    if (hubLoading) return
    if (!enabled) {
      setLoading(false)
      setTimeoutLoading(false)
      return
    }
    load()
    loadTimeout()
  }, [hubLoading, enabled, load, loadTimeout, actingHub?.id, isActingRemotely])

  const forceLogout = async (row) => {
    const id = row.user?.id
    if (!id) return

    const label = row.user?.email || row.user?.name || `user #${id}`
    const selfNote = row.is_current_user ? ' This is your own account - you will be signed out.' : ''
    if (!window.confirm(`Force-logout ${label}? All of their sessions will end.${selfNote}`)) {
      return
    }

    setLoggingOutId(id)
    setError('')
    setMessage('')
    try {
      const data = await api.forceLogoutActiveSession(id, apiOpts)
      setMessage(data.message || 'User logged out.')
      if (data.logged_out_self) {
        await logout()
        navigate('/login', { replace: true })
        return
      }
      await load()
    } catch (err) {
      setError(err.message || 'Could not force-logout that user.')
    } finally {
      setLoggingOutId(null)
    }
  }

  const saveTimeout = async (event) => {
    event.preventDefault()
    const minutes = Number(timeoutMinutes)
    if (
      !Number.isFinite(minutes) ||
      minutes < timeoutMeta.min_minutes ||
      minutes > timeoutMeta.max_minutes
    ) {
      setError(
        `Session timeout must be between ${timeoutMeta.min_minutes} and ${timeoutMeta.max_minutes} minutes.`
      )
      return
    }

    if (
      !window.confirm(
        `Update session timeout for ${targetName}? Everyone currently logged in on this hub will be signed out immediately (including you if you are on this hub).`
      )
    ) {
      return
    }

    setTimeoutSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.updateSessionSettings(
        { session_lifetime_minutes: minutes },
        apiOpts
      )
      const settings = data.data || {}
      setTimeoutMinutes(settings.session_lifetime_minutes ?? minutes)
      setTimeoutMeta({
        min_minutes: settings.min_minutes ?? timeoutMeta.min_minutes,
        max_minutes: settings.max_minutes ?? timeoutMeta.max_minutes,
        default_minutes: settings.default_minutes ?? timeoutMeta.default_minutes,
        is_custom: Boolean(settings.is_custom),
      })
      setTimeoutDirty(false)
      setMessage(data.message || 'Session timeout updated. All active users were logged out.')

      if (data.logged_out_self) {
        await logout()
        navigate('/login', { replace: true })
        return
      }

      await load()
    } catch (err) {
      setError(err.message || 'Could not update session timeout.')
    } finally {
      setTimeoutSaving(false)
    }
  }

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Hub</p>
            <h1>Active sessions</h1>
            <p className="muted">This capability is not enabled for your role on this hub.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Active sessions</h1>
          <p className="muted">
            Users currently logged in on {targetName}. Force-logout ends every session for that
            user. You can also set how long idle sessions stay signed in.
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={() => { load(); loadTimeout() }} disabled={loading || timeoutLoading}>
          <FaSync aria-hidden /> Refresh
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="panel" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Session timeout</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Idle sign-out for everyone on {targetName}. Saving logs out all active users on this hub
          immediately so the new timeout applies from their next sign-in.
        </p>
        {timeoutLoading ? (
          <div className="state">Loading session timeout…</div>
        ) : (
          <form onSubmit={saveTimeout} className="stack" style={{ gap: '0.75rem', maxWidth: '28rem' }}>
            <label>
              Idle timeout
              <select
                value={
                  PRESET_MINUTES.some((p) => p.value === Number(timeoutMinutes))
                    ? String(timeoutMinutes)
                    : 'custom'
                }
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'custom') {
                    setTimeoutDirty(true)
                    return
                  }
                  setTimeoutMinutes(Number(v))
                  setTimeoutDirty(true)
                }}
              >
                {PRESET_MINUTES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
                <option value="custom">Custom (minutes)</option>
              </select>
            </label>
            <label>
              Minutes
              <input
                type="number"
                min={timeoutMeta.min_minutes}
                max={timeoutMeta.max_minutes}
                step={1}
                value={timeoutMinutes}
                onChange={(e) => {
                  setTimeoutMinutes(e.target.value)
                  setTimeoutDirty(true)
                }}
              />
            </label>
            <p className="muted" style={{ margin: 0 }}>
              Currently {formatMinutes(timeoutMinutes)}
              {timeoutMeta.is_custom ? '' : ' (platform default)'}. Allowed range:{' '}
              {timeoutMeta.min_minutes}–{timeoutMeta.max_minutes} minutes (
              {formatMinutes(timeoutMeta.max_minutes)} max).
            </p>
            <div>
              <button type="submit" className="btn" disabled={timeoutSaving || !timeoutDirty}>
                {timeoutSaving ? 'Saving…' : 'Save timeout'}
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="muted">
        {meta.total_users} logged-in user{meta.total_users === 1 ? '' : 's'} · {meta.total_sessions}{' '}
        active session{meta.total_sessions === 1 ? '' : 's'}
      </p>

      {loading ? (
        <div className="state">Loading active sessions…</div>
      ) : rows.length === 0 ? (
        <div className="state">No users are currently logged in.</div>
      ) : (
        <DataGrid
          columns={[
            {
              key: 'user',
              label: 'User',
              filterValue: (row) =>
                `${row.user?.name || ''} ${row.user?.email || ''}`.trim(),
              render: (row) => (
                <>
                  <strong>{row.user?.name || 'User'}</strong>
                  <div className="muted">{row.user?.email}</div>
                  {row.is_current_user ? (
                    <div className="muted">You (current login)</div>
                  ) : null}
                </>
              ),
            },
            {
              key: 'role',
              label: 'Role',
              filterValue: (row) => roleLabel(row.user?.role) || row.user?.role || '',
              render: (row) => roleLabel(row.user?.role) || row.user?.role || '-',
            },
            {
              key: 'session_count',
              label: 'Sessions',
              narrow: true,
              filterValue: (row) => String(row.session_count ?? 0),
            },
            {
              key: 'last_activity_at',
              label: 'Last activity',
              date: true,
              filterValue: (row) => row.last_activity_at || '',
              render: (row) => <DataGridDate value={row.last_activity_at} />,
            },
          ]}
          rows={rows}
          getRowKey={(row) => row.user?.id}
          emptyMessage="No active sessions."
          actions={(row) => (
            <DataGridIconBtn
              icon={FaSignOutAlt}
              label={
                row.is_current_user
                  ? 'Force-logout yourself'
                  : `Force-logout ${row.user?.name || 'user'}`
              }
              variant="danger"
              disabled={loggingOutId === row.user?.id}
              onClick={() => forceLogout(row)}
            />
          )}
        />
      )}

      {user?.email ? (
        <p className="muted" style={{ marginTop: '1rem' }}>
          Signed in as {user.email}. Force-logout removes API tokens so the user must sign in
          again.
        </p>
      ) : null}
    </section>
  )
}
