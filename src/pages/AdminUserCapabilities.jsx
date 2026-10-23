import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FaCheckSquare,
  FaChevronDown,
  FaChevronRight,
  FaSave,
  FaSearch,
  FaSquare,
  FaSync,
  FaUserShield,
} from 'react-icons/fa'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatUserRoles } from '../utils/roleLabels'

/**
 * Per-user capability overrides within the user's assigned-role UNION.
 * Capabilities are listed under each assigned role; shared caps stay in sync.
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
  const [userQuery, setUserQuery] = useState('')
  const [capQuery, setCapQuery] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingMatrix, setLoadingMatrix] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const targetName = isActingRemotely
    ? actingHub?.name || matrix?.hub?.name || 'selected hub'
    : matrix?.hub?.name || actingHub?.name || 'this hub'

  const applyMatrix = (data) => {
    setMatrix(data)
    const next = {}
    for (const row of data.rows || []) {
      next[row.key] = !!row.enabled
    }
    setDraft(next)
    // Expand all role sections by default when loading a user.
    const open = {}
    for (const section of data.role_sections || []) {
      open[section.role] = false
    }
    setCollapsed(open)
  }

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
        applyMatrix(data)
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
    const q = userQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const hay = `${u.name || ''} ${u.email || ''} ${formatUserRoles(u, null, roleLabel)}`.toLowerCase()
      return hay.includes(q)
    })
  }, [users, userQuery, roleLabel])

  const roleSections = useMemo(() => {
    const sections = matrix?.role_sections || []
    const q = capQuery.trim().toLowerCase()
    if (!q) return sections
    return sections
      .map((section) => ({
        ...section,
        rows: (section.rows || []).filter((row) => {
          const hay = `${row.label || ''} ${row.description || ''} ${row.key || ''} ${row.group_label || ''}`.toLowerCase()
          return hay.includes(q)
        }),
      }))
      .filter((section) => section.rows.length > 0)
  }, [matrix, capQuery])

  const dirtyKeys = useMemo(() => {
    if (!matrix?.rows) return []
    return matrix.rows.filter((row) => !!draft[row.key] !== !!row.enabled).map((row) => row.key)
  }, [matrix, draft])

  const dirty = dirtyKeys.length > 0

  const liveSummary = useMemo(() => {
    const rows = matrix?.rows || []
    let enabledCount = 0
    let overridden = 0
    for (const row of rows) {
      const on = draft[row.key] !== undefined ? !!draft[row.key] : !!row.enabled
      if (on) enabledCount++
      if (!on) overridden++
    }
    return {
      total: rows.length,
      enabled: enabledCount,
      overridden,
      roles: (matrix?.role_sections || []).length,
      dirty: dirtyKeys.length,
    }
  }, [matrix, draft, dirtyKeys])

  const onToggle = (key) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }))
    setMessage('')
  }

  const setSectionEnabled = (section, enabledValue) => {
    setDraft((prev) => {
      const next = { ...prev }
      for (const row of section.rows || []) {
        next[row.key] = enabledValue
      }
      return next
    })
    setMessage('')
  }

  const toggleCollapsed = (role) => {
    setCollapsed((prev) => ({ ...prev, [role]: !prev[role] }))
  }

  const expandAll = () => {
    const next = {}
    for (const section of matrix?.role_sections || []) {
      next[section.role] = false
    }
    setCollapsed(next)
  }

  const collapseAll = () => {
    const next = {}
    for (const section of matrix?.role_sections || []) {
      next[section.role] = true
    }
    setCollapsed(next)
  }

  const onSave = async () => {
    if (!selectedId || !dirty) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.updateUserCapabilities(selectedId, { capabilities: draft }, apiOpts)
      applyMatrix(data)
      setMessage(data.message || 'User capabilities updated.')
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const onDiscard = () => {
    if (!matrix?.rows) return
    const next = {}
    for (const row of matrix.rows) {
      next[row.key] = !!row.enabled
    }
    setDraft(next)
    setMessage('')
  }

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Hub</p>
            <h1>User capabilities</h1>
          </div>
        </div>
        <div className="empty-state">
          <h2>Capability disabled</h2>
          <p className="muted">
            Enable &quot;Manage user capabilities&quot; under Capabilities for your role on this hub.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="user-capabilities-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>User capabilities</h1>
          <p className="muted">
            Refine what a person can do on <strong>{targetName}</strong>. Capabilities are grouped
            by each assigned role — uncheck to revoke for that user only (cannot grant beyond their roles).
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={loadUsers} disabled={loadingUsers}>
            <FaSync aria-hidden /> Refresh
          </button>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <div className="ucap-layout">
        <aside className="ucap-users panel">
          <div className="ucap-users__head">
            <h2>Users</h2>
            <span className="muted">{filteredUsers.length}</span>
          </div>
          <label className="ucap-search">
            <FaSearch aria-hidden />
            <input
              type="search"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search name, email, role…"
              aria-label="Search users"
            />
          </label>
          {loadingUsers ? (
            <p className="muted ucap-pad">Loading users…</p>
          ) : filteredUsers.length === 0 ? (
            <p className="muted ucap-pad">No users match your search.</p>
          ) : (
            <ul className="ucap-user-list">
              {filteredUsers.map((user) => {
                const active = selectedId === user.id
                const roles = user.roles || (user.role ? [user.role] : [])
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      className={`ucap-user ${active ? 'is-active' : ''}`}
                      onClick={() => setSelectedId(user.id)}
                    >
                      <span className="ucap-user__avatar" aria-hidden>
                        {(user.name || user.email || '?').slice(0, 1).toUpperCase()}
                      </span>
                      <span className="ucap-user__body">
                        <span className="ucap-user__name">{user.name || '—'}</span>
                        <span className="ucap-user__email">{user.email}</span>
                        <span className="ucap-user__roles">
                          {roles.map((role) => (
                            <span key={role} className="ucap-chip ucap-chip--sm">
                              {roleLabel?.(role) || role}
                            </span>
                          ))}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <div className="ucap-detail">
          {!selectedId ? (
            <div className="ucap-empty panel">
              <FaUserShield className="ucap-empty__icon" aria-hidden />
              <h2>Select a user</h2>
              <p className="muted">
                Choose someone from the list to review capabilities granted by each of their roles.
              </p>
            </div>
          ) : loadingMatrix ? (
            <div className="ucap-empty panel">
              <p className="muted">Loading capabilities…</p>
            </div>
          ) : !matrix ? (
            <div className="ucap-empty panel">
              <p className="muted">No capability data for this user.</p>
            </div>
          ) : (
            <>
              <div className="ucap-detail__head panel">
                <div className="ucap-detail__identity">
                  <span className="ucap-user__avatar ucap-user__avatar--lg" aria-hidden>
                    {(matrix.user?.name || matrix.user?.email || '?').slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <h2>{matrix.user?.name || 'User'}</h2>
                    <p className="muted">{matrix.user?.email}</p>
                    <div className="ucap-user__roles">
                      {(matrix.role_sections || []).map((section) => (
                        <span key={section.role} className="ucap-chip">
                          {section.label}
                          <span className="ucap-chip__count">{section.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="ucap-stats">
                  <div className="ucap-stat">
                    <strong>{liveSummary.enabled}</strong>
                    <span>Enabled</span>
                  </div>
                  <div className="ucap-stat">
                    <strong>{liveSummary.total}</strong>
                    <span>From roles</span>
                  </div>
                  <div className="ucap-stat">
                    <strong>{liveSummary.overridden}</strong>
                    <span>Revoked</span>
                  </div>
                  <div className={`ucap-stat ${dirty ? 'is-dirty' : ''}`}>
                    <strong>{liveSummary.dirty}</strong>
                    <span>Unsaved</span>
                  </div>
                </div>
              </div>

              <div className="ucap-toolbar panel">
                <label className="ucap-search ucap-search--wide">
                  <FaSearch aria-hidden />
                  <input
                    type="search"
                    value={capQuery}
                    onChange={(e) => setCapQuery(e.target.value)}
                    placeholder="Filter capabilities…"
                    aria-label="Filter capabilities"
                  />
                </label>
                <div className="ucap-toolbar__actions">
                  <button type="button" className="btn ghost" onClick={expandAll}>
                    Expand all
                  </button>
                  <button type="button" className="btn ghost" onClick={collapseAll}>
                    Collapse all
                  </button>
                  {(matrix.role_sections || []).length > 1 ? (
                    <nav className="ucap-jump" aria-label="Jump to role">
                      {(matrix.role_sections || []).map((section) => (
                        <a key={section.role} href={`#ucap-role-${section.role}`}>
                          {section.label}
                        </a>
                      ))}
                    </nav>
                  ) : null}
                </div>
              </div>

              {(matrix.rows || []).length === 0 ? (
                <div className="empty-state panel">
                  <h2>No role capabilities yet</h2>
                  <p className="muted">
                    This user’s roles do not grant any capabilities on this hub. Assign roles and
                    enable cells on the Capabilities matrix first.
                  </p>
                </div>
              ) : roleSections.length === 0 ? (
                <div className="empty-state panel">
                  <h2>No matches</h2>
                  <p className="muted">Nothing matches “{capQuery}”.</p>
                </div>
              ) : (
                <div className="ucap-sections">
                  {roleSections.map((section) => {
                    const isCollapsed = !!collapsed[section.role]
                    const sectionEnabled = (section.rows || []).filter((r) => !!draft[r.key]).length
                    const sectionTotal = (section.rows || []).length
                    return (
                      <section
                        key={section.role}
                        id={`ucap-role-${section.role}`}
                        className="ucap-role panel"
                      >
                        <header className="ucap-role__head">
                          <button
                            type="button"
                            className="ucap-role__toggle"
                            onClick={() => toggleCollapsed(section.role)}
                            aria-expanded={!isCollapsed}
                          >
                            {isCollapsed ? <FaChevronRight aria-hidden /> : <FaChevronDown aria-hidden />}
                            <span className="ucap-role__title">
                              {section.label}
                            </span>
                            <span className="muted">
                              {sectionEnabled}/{sectionTotal} enabled
                            </span>
                          </button>
                          <div className="ucap-role__bulk">
                            <button
                              type="button"
                              className="btn ghost"
                              title="Enable all in this role"
                              onClick={() => setSectionEnabled(section, true)}
                            >
                              <FaCheckSquare aria-hidden /> All
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              title="Revoke all in this role"
                              onClick={() => setSectionEnabled(section, false)}
                            >
                              <FaSquare aria-hidden /> None
                            </button>
                          </div>
                        </header>

                        {!isCollapsed ? (
                          <ul className="ucap-cap-list">
                            {(section.rows || []).map((row) => {
                              const checked = !!draft[row.key]
                              const shared = !!row.shared || (row.granted_by || []).length > 1
                              const otherLabels = (row.granted_by_labels || []).filter(
                                (label) => label !== section.label
                              )
                              const changed =
                                matrix.rows?.some(
                                  (r) => r.key === row.key && !!draft[row.key] !== !!r.enabled
                                ) || false
                              return (
                                <li
                                  key={`${section.role}-${row.key}`}
                                  className={`ucap-cap ${checked ? '' : 'is-revoked'} ${changed ? 'is-changed' : ''}`}
                                >
                                  <label className="ucap-cap__label" htmlFor={`ucap-${section.role}-${row.key}`}>
                                    <input
                                      id={`ucap-${section.role}-${row.key}`}
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => onToggle(row.key)}
                                    />
                                    <span className="ucap-cap__text">
                                      <span className="ucap-cap__name">
                                        {row.label}
                                        {shared ? (
                                          <span className="ucap-chip ucap-chip--shared" title="Also granted by another role">
                                            Shared
                                          </span>
                                        ) : null}
                                      </span>
                                      {row.description ? (
                                        <span className="ucap-cap__desc muted">{row.description}</span>
                                      ) : null}
                                      {shared && otherLabels.length > 0 ? (
                                        <span className="ucap-cap__also muted">
                                          Also from {otherLabels.join(', ')} — toggle stays in sync
                                        </span>
                                      ) : null}
                                    </span>
                                  </label>
                                  <span className="ucap-cap__meta muted">{row.group_label}</span>
                                </li>
                              )
                            })}
                          </ul>
                        ) : null}
                      </section>
                    )
                  })}
                </div>
              )}

              {dirty ? (
                <div className="ucap-savebar">
                  <p>
                    <strong>{dirtyKeys.length}</strong> unsaved change
                    {dirtyKeys.length === 1 ? '' : 's'}
                  </p>
                  <div className="ucap-savebar__actions">
                    <button type="button" className="btn ghost" onClick={onDiscard} disabled={saving}>
                      Discard
                    </button>
                    <button type="button" className="btn" onClick={onSave} disabled={saving}>
                      <FaSave aria-hidden /> {saving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
