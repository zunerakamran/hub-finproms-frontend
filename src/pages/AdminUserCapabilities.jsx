import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaSave, FaSync } from 'react-icons/fa'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatUserRoles } from '../utils/roleLabels'

/**
 * Per-user capability overrides within the user's assigned-role UNION.
 * Only role-granted capabilities are listed; unchecking revokes for that user.
 */
export default function AdminUserCapabilities({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub, isActingRemotely, roleLabel } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_manage_user_capabilities')
  const apiOpts = { asPowerAdmin }

  const [users, setUsers] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [matrix, setMatrix] = useState(null)
  const [draft, setDraft] = useState({})
  const [query, setQuery] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingMatrix, setLoadingMatrix] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const targetName = isActingRemotely
    ? actingHub?.name || matrix?.hub?.name || 'selected hub'
    : matrix?.hub?.name || actingHub?.name || 'this hub'

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    setError('')
    try {
      const data = await api.userCapabilitiesUsers({ per_page: 100, page: 1 }, apiOpts)
      setUsers(data.users || [])
    } catch (err) {
      setError(err.message || 'Failed to load users.')
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }, [asPowerAdmin])

  const loadMatrix = useCallback(
    async (userId) => {
      if (!userId) {
        setMatrix(null)
        setDraft({})
        return
      }
      setLoadingMatrix(true)
      setError('')
      setMessage('')
      try {
        const data = await api.userCapabilities(userId, apiOpts)
        setMatrix(data)
        const next = {}
        for (const row of data.rows || []) {
          next[row.key] = !!row.enabled
        }
        setDraft(next)
      } catch (err) {
        setError(err.message || 'Failed to load user capabilities.')
        setMatrix(null)
        setDraft({})
      } finally {
        setLoadingMatrix(false)
      }
    },
    [asPowerAdmin]
  )

  useEffect(() => {
    if (hubLoading) return
    if (!enabled) {
      setLoadingUsers(false)
      return
    }
    loadUsers()
  }, [hubLoading, enabled, loadUsers, actingHub?.id, isActingRemotely])

  useEffect(() => {
    if (!selectedId) return
    loadMatrix(selectedId)
  }, [selectedId, loadMatrix, actingHub?.id, isActingRemotely])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const hay = `${u.name || ''} ${u.email || ''} ${formatUserRoles(u, null, roleLabel)}`.toLowerCase()
      return hay.includes(q)
    })
  }, [users, query, roleLabel])

  const groupedRows = useMemo(() => {
    const rows = matrix?.rows || []
    const order = matrix?.group_order || []
    const groups = new Map()
    for (const row of rows) {
      const g = row.group || 'other'
      if (!groups.has(g)) {
        groups.set(g, {
          key: g,
          label: row.group_label || g,
          rows: [],
        })
      }
      groups.get(g).rows.push(row)
    }
    const ordered = []
    for (const key of order) {
      if (groups.has(key)) {
        ordered.push(groups.get(key))
        groups.delete(key)
      }
    }
    for (const group of groups.values()) {
      ordered.push(group)
    }
    return ordered
  }, [matrix])

  const dirty = useMemo(() => {
    if (!matrix?.rows) return false
    return matrix.rows.some((row) => !!draft[row.key] !== !!row.enabled)
  }, [matrix, draft])

  const onToggle = (key) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const onSave = async () => {
    if (!selectedId || !dirty) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.updateUserCapabilities(selectedId, { capabilities: draft }, apiOpts)
      setMatrix(data)
      const next = {}
      for (const row of data.rows || []) {
        next[row.key] = !!row.enabled
      }
      setDraft(next)
      setMessage(data.message || 'User capabilities updated.')
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && !enabled) {
    return (
      <div className="admin-page">
        <h1>User capabilities</h1>
        <p className="muted">You do not have permission to manage per-user capabilities.</p>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>User capabilities</h1>
          <p className="muted" style={{ margin: 0 }}>
            Refine capabilities for a user on <strong>{targetName}</strong>. Only capabilities
            granted by their assigned roles are shown — uncheck to revoke for that user.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={loadUsers} disabled={loadingUsers}>
          <FaSync style={{ marginRight: 6 }} /> Refresh users
        </button>
      </div>

      {error ? <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div> : null}
      {message ? <div className="alert alert-success" style={{ marginTop: '1rem' }}>{message}</div> : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 320px) 1fr',
          gap: '1.25rem',
          marginTop: '1.25rem',
          alignItems: 'start',
        }}
        className="user-capabilities-layout"
      >
        <aside className="card" style={{ padding: '1rem' }}>
          <label className="field" style={{ display: 'block', marginBottom: '0.75rem' }}>
            <span className="muted" style={{ fontSize: '0.85em' }}>Find user</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, email, role…"
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>
          {loadingUsers ? (
            <p className="muted">Loading users…</p>
          ) : filteredUsers.length === 0 ? (
            <p className="muted">No users found.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '70vh', overflow: 'auto' }}>
              {filteredUsers.map((user) => {
                const active = selectedId === user.id
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(user.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.65rem 0.75rem',
                        marginBottom: 4,
                        border: active ? '1px solid var(--color-primary, #2563eb)' : '1px solid transparent',
                        borderRadius: 6,
                        background: active ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{user.name || '—'}</div>
                      <div className="muted" style={{ fontSize: '0.85em' }}>{user.email}</div>
                      <div className="muted" style={{ fontSize: '0.8em', marginTop: 2 }}>
                        {formatUserRoles(user, null, roleLabel)}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <section className="card" style={{ padding: '1rem' }}>
          {!selectedId ? (
            <p className="muted">Select a user to view and edit their capabilities.</p>
          ) : loadingMatrix ? (
            <p className="muted">Loading capabilities…</p>
          ) : !matrix ? (
            <p className="muted">No capability data.</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem' }}>
                    {matrix.user?.name || 'User'}
                  </h2>
                  <p className="muted" style={{ margin: 0 }}>
                    {matrix.user?.email} · {formatUserRoles(matrix.user, null, roleLabel)}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onSave}
                  disabled={!dirty || saving}
                >
                  <FaSave style={{ marginRight: 6 }} />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>

              {(matrix.rows || []).length === 0 ? (
                <p className="muted">
                  This user’s roles do not grant any capabilities on this hub yet.
                  Assign roles (and enable cells on the Capabilities matrix) first.
                </p>
              ) : (
                groupedRows.map((group) => (
                  <div key={group.key} style={{ marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem' }}>{group.label}</h3>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {group.rows.map((row) => (
                        <li
                          key={row.key}
                          style={{
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'flex-start',
                            padding: '0.45rem 0',
                            borderBottom: '1px solid rgba(0,0,0,0.06)',
                          }}
                        >
                          <input
                            type="checkbox"
                            id={`ucap-${row.key}`}
                            checked={!!draft[row.key]}
                            onChange={() => onToggle(row.key)}
                            style={{ marginTop: 3 }}
                          />
                          <label htmlFor={`ucap-${row.key}`} style={{ cursor: 'pointer', flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{row.label}</div>
                            {row.description ? (
                              <div className="muted" style={{ fontSize: '0.85em' }}>{row.description}</div>
                            ) : null}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
