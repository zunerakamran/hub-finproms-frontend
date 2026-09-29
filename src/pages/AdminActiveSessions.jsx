import { useCallback, useEffect, useState } from 'react'
import { FaSignOutAlt, FaSync } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatDateTime } from '../utils/dateFormat'

export default function AdminActiveSessions({ shell = 'client-admin' }) {
  const navigate = useNavigate()
  const { isPowerAdmin, user, logout } = useAuth()
  const { can, loading: hubLoading, actingHub, isActingOnWhiteLabel, roleLabel } = useHub()
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

  const targetName = isActingOnWhiteLabel
    ? actingHub?.name || hubMeta?.name || 'selected white-labelled hub'
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

  useEffect(() => {
    if (hubLoading) return
    if (!enabled) {
      setLoading(false)
      return
    }
    load()
  }, [hubLoading, enabled, load, actingHub?.id, isActingOnWhiteLabel])

  const forceLogout = async (row) => {
    const id = row.user?.id
    if (!id) return

    const label = row.user?.email || row.user?.name || `user #${id}`
    const selfNote = row.is_current_user ? ' This is your own account — you will be signed out.' : ''
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
            user.
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={load} disabled={loading}>
          <FaSync aria-hidden /> Refresh
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

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
              filterValue: (row) => row.user?.role || '',
              render: (row) => roleLabel(row.user?.role) || row.user?.role || '—',
            },
            {
              key: 'session_count',
              label: 'Sessions',
              filterValue: (row) => String(row.session_count ?? 0),
            },
            {
              key: 'last_activity_at',
              label: 'Last activity',
              filterValue: (row) => row.last_activity_at || '',
              render: (row) =>
                row.last_activity_at ? formatDateTime(row.last_activity_at) : '—',
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
