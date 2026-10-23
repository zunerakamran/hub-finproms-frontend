import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FaCheckSquare,
  FaLayerGroup,
  FaSave,
  FaSearch,
  FaSquare,
  FaSync,
  FaUserShield,
  FaUsers,
} from 'react-icons/fa'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatUserRoles } from '../utils/roleLabels'

/**
 * Per-user capability overrides within the user's assigned-role UNION.
 * Combined view shows each capability once; Per-role view focuses one role at a time.
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
  const [viewMode, setViewMode] = useState('combined') // combined | by-role
  const [activeRole, setActiveRole] = useState(null)
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

    const sections = data.role_sections || []
    const multi = sections.length > 1
    setViewMode(multi ? 'combined' : 'by-role')
    setActiveRole(sections[0]?.role || null)
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

  const roleSections = matrix?.role_sections || []
  const multiRole = roleSections.length > 1

  const activeSection = useMemo(() => {
    if (!roleSections.length) return null
    const match = roleSections.find((s) => s.role === activeRole)
    return match || roleSections[0]
  }, [roleSections, activeRole])

  const filterRows = useCallback(
    (rows) => {
      const q = capQuery.trim().toLowerCase()
      if (!q) return rows || []
      return (rows || []).filter((row) => {
        const hay = `${row.label || ''} ${row.description || ''} ${row.key || ''} ${row.group_label || ''} ${(row.granted_by_labels || []).join(' ')}`.toLowerCase()
        return hay.includes(q)
      })
    },
    [capQuery]
  )

  const filteredActiveRows = useMemo(
    () => filterRows(activeSection?.rows || []),
    [activeSection, filterRows]
  )

  /** Unique capabilities grouped by matrix group — one row per capability. */
  const combinedGroups = useMemo(() => {
    const rows = filterRows(matrix?.rows || [])
    const byGroup = new Map()
    for (const row of rows) {
      const group = row.group_label || 'Other'
      if (!byGroup.has(group)) byGroup.set(group, [])
      byGroup.get(group).push(row)
    }
    return Array.from(byGroup.entries()).map(([group, groupRows]) => ({
      group,
      rows: groupRows,
    }))
  }, [matrix, filterRows])

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
      roles: roleSections.length,
      dirty: dirtyKeys.length,
    }
  }, [matrix, draft, dirtyKeys, roleSections.length])

  const onToggle = (key) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }))
    setMessage('')
  }

  const setRowsEnabled = (rows, enabledValue) => {
    setDraft((prev) => {
      const next = { ...prev }
      for (const row of rows || []) {
        next[row.key] = enabledValue
      }
      return next
    })
    setMessage('')
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

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedId) || null,
    [users, selectedId]
  )

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

  const renderCapRow = (row, { showRoles = false } = {}) => {
    const checked = !!draft[row.key]
    const changed =
      matrix.rows?.some((r) => r.key === row.key && !!draft[row.key] !== !!r.enabled) || false
    const roleLabels = row.granted_by_labels || []

    return (
      <li
        key={row.key}
        className={`ucap-cap ${checked ? '' : 'is-revoked'} ${changed ? 'is-changed' : ''}`}
      >
        <label className="ucap-cap__label" htmlFor={`ucap-${row.key}`}>
          <input
            id={`ucap-${row.key}`}
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(row.key)}
          />
          <span className="ucap-cap__text">
            <span className="ucap-cap__name">{row.label}</span>
            {row.description ? (
              <span className="ucap-cap__desc muted">{row.description}</span>
            ) : null}
            {showRoles && roleLabels.length > 0 ? (
              <span className="ucap-cap__roles">
                {roleLabels.map((label) => (
                  <span key={label} className="ucap-pill">
                    {label}
                  </span>
                ))}
              </span>
            ) : null}
          </span>
        </label>
        {!showRoles && row.group_label ? (
          <span className="ucap-cap__meta muted">{row.group_label}</span>
        ) : null}
      </li>
    )
  }

  return (
    <section className="user-capabilities-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>User capabilities</h1>
          <p className="muted">
            Refine what someone can do on <strong>{targetName}</strong>. Uncheck to revoke for that
            user only — you cannot grant beyond their assigned roles.
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
        <aside className="ucap-users panel" aria-label="Users">
          <div className="ucap-users__head">
            <div className="ucap-users__title">
              <FaUsers aria-hidden />
              <h2>People</h2>
            </div>
            <span className="ucap-users__count">{filteredUsers.length}</span>
          </div>

          <label className="ucap-search">
            <FaSearch aria-hidden />
            <input
              type="search"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search people…"
              aria-label="Search users"
            />
          </label>

          {/* Compact select for narrow / mobile layouts */}
          <div className="ucap-users__mobile-pick">
            <label className="muted" htmlFor="ucap-user-select">
              Select person
            </label>
            <select
              id="ucap-user-select"
              value={selectedId || ''}
              onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Choose a person…</option>
              {filteredUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email} — {formatUserRoles(user, null, roleLabel)}
                </option>
              ))}
            </select>
          </div>

          {loadingUsers ? (
            <p className="muted ucap-pad">Loading people…</p>
          ) : filteredUsers.length === 0 ? (
            <p className="muted ucap-pad">No people match your search.</p>
          ) : (
            <ul className="ucap-user-list">
              {filteredUsers.map((user) => {
                const active = selectedId === user.id
                const rolesText = formatUserRoles(user, null, roleLabel)
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      className={`ucap-user ${active ? 'is-active' : ''}`}
                      onClick={() => setSelectedId(user.id)}
                      aria-current={active ? 'true' : undefined}
                    >
                      <span className="ucap-user__avatar" aria-hidden>
                        {(user.name || user.email || '?').slice(0, 1).toUpperCase()}
                      </span>
                      <span className="ucap-user__body">
                        <span className="ucap-user__name">{user.name || '—'}</span>
                        <span className="ucap-user__email">{user.email}</span>
                        <span className="ucap-user__roles-line" title={rolesText}>
                          {rolesText}
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
              <h2>Select a person</h2>
              <p className="muted">
                Pick someone from the list to review and refine the capabilities their roles grant.
              </p>
            </div>
          ) : loadingMatrix ? (
            <div className="ucap-empty panel">
              <p className="muted">Loading capabilities…</p>
            </div>
          ) : !matrix ? (
            <div className="ucap-empty panel">
              <p className="muted">No capability data for this person.</p>
            </div>
          ) : (
            <>
              <div className="ucap-detail__head panel">
                <div className="ucap-detail__identity">
                  <span className="ucap-user__avatar ucap-user__avatar--lg" aria-hidden>
                    {(matrix.user?.name || matrix.user?.email || '?').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="ucap-detail__who">
                    <h2>{matrix.user?.name || selectedUser?.name || 'User'}</h2>
                    <p className="muted">{matrix.user?.email}</p>
                    <p className="ucap-detail__roles">
                      <span className="ucap-detail__roles-label">Roles</span>
                      {roleSections.map((section) => (
                        <button
                          key={section.role}
                          type="button"
                          className={`ucap-pill ucap-pill--action ${
                            viewMode === 'by-role' && activeSection?.role === section.role
                              ? 'is-active'
                              : ''
                          }`}
                          onClick={() => {
                            setViewMode('by-role')
                            setActiveRole(section.role)
                          }}
                          title={`View ${section.label} capabilities`}
                        >
                          {section.label}
                          <span className="ucap-pill__count">{section.count}</span>
                        </button>
                      ))}
                    </p>
                  </div>
                </div>
                <div className="ucap-stats" aria-label="Summary">
                  <div className="ucap-stat">
                    <strong>{liveSummary.enabled}</strong>
                    <span>Enabled</span>
                  </div>
                  <div className="ucap-stat">
                    <strong>{liveSummary.total}</strong>
                    <span>Total</span>
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
                <div className="ucap-view-toggle" role="tablist" aria-label="Capability view">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'combined'}
                    className={viewMode === 'combined' ? 'is-active' : ''}
                    onClick={() => setViewMode('combined')}
                  >
                    <FaLayerGroup aria-hidden /> Combined
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'by-role'}
                    className={viewMode === 'by-role' ? 'is-active' : ''}
                    onClick={() => {
                      setViewMode('by-role')
                      if (!activeRole && roleSections[0]) setActiveRole(roleSections[0].role)
                    }}
                  >
                    Per role
                  </button>
                </div>

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

                <div className="ucap-toolbar__bulk">
                  <button
                    type="button"
                    className="btn ghost"
                    title="Enable all visible"
                    onClick={() => {
                      const rows =
                        viewMode === 'combined'
                          ? combinedGroups.flatMap((g) => g.rows)
                          : filteredActiveRows
                      setRowsEnabled(rows, true)
                    }}
                  >
                    <FaCheckSquare aria-hidden /> Enable visible
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    title="Revoke all visible"
                    onClick={() => {
                      const rows =
                        viewMode === 'combined'
                          ? combinedGroups.flatMap((g) => g.rows)
                          : filteredActiveRows
                      setRowsEnabled(rows, false)
                    }}
                  >
                    <FaSquare aria-hidden /> Revoke visible
                  </button>
                </div>
              </div>

              {multiRole && viewMode === 'combined' ? (
                <p className="ucap-hint muted">
                  Each capability appears once. Role tags show which of this person’s roles grant it.
                  Toggling applies to the person, not a single role.
                </p>
              ) : null}

              {(matrix.rows || []).length === 0 ? (
                <div className="empty-state panel">
                  <h2>No role capabilities yet</h2>
                  <p className="muted">
                    This person’s roles do not grant any capabilities on this hub. Assign roles and
                    enable cells on the Capabilities matrix first.
                  </p>
                </div>
              ) : viewMode === 'combined' ? (
                combinedGroups.length === 0 ? (
                  <div className="empty-state panel">
                    <h2>No matches</h2>
                    <p className="muted">Nothing matches “{capQuery}”.</p>
                  </div>
                ) : (
                  <div className="ucap-sections">
                    {combinedGroups.map(({ group, rows }) => {
                      const enabledInGroup = rows.filter((r) => !!draft[r.key]).length
                      return (
                        <section key={group} className="ucap-role panel">
                          <header className="ucap-role__head">
                            <div className="ucap-role__heading">
                              <span className="ucap-role__title">{group}</span>
                              <span className="muted">
                                {enabledInGroup}/{rows.length} enabled
                              </span>
                            </div>
                            <div className="ucap-role__bulk">
                              <button
                                type="button"
                                className="btn ghost"
                                onClick={() => setRowsEnabled(rows, true)}
                              >
                                <FaCheckSquare aria-hidden /> All
                              </button>
                              <button
                                type="button"
                                className="btn ghost"
                                onClick={() => setRowsEnabled(rows, false)}
                              >
                                <FaSquare aria-hidden /> None
                              </button>
                            </div>
                          </header>
                          <ul className="ucap-cap-list">
                            {rows.map((row) => renderCapRow(row, { showRoles: multiRole }))}
                          </ul>
                        </section>
                      )
                    })}
                  </div>
                )
              ) : (
                <>
                  {multiRole ? (
                    <div className="ucap-role-tabs" role="tablist" aria-label="Roles">
                      {roleSections.map((section) => {
                        const selected = activeSection?.role === section.role
                        const enabledCount = (section.rows || []).filter((r) => !!draft[r.key]).length
                        return (
                          <button
                            key={section.role}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            className={`ucap-role-tab ${selected ? 'is-active' : ''}`}
                            onClick={() => setActiveRole(section.role)}
                          >
                            <span className="ucap-role-tab__label">{section.label}</span>
                            <span className="ucap-role-tab__meta">
                              {enabledCount}/{section.count}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}

                  {!activeSection || filteredActiveRows.length === 0 ? (
                    <div className="empty-state panel">
                      <h2>{capQuery ? 'No matches' : 'No capabilities'}</h2>
                      <p className="muted">
                        {capQuery
                          ? `Nothing matches “${capQuery}” in this role.`
                          : 'This role does not grant capabilities on this hub.'}
                      </p>
                    </div>
                  ) : (
                    <section className="ucap-role panel">
                      <header className="ucap-role__head">
                        <div className="ucap-role__heading">
                          <span className="ucap-role__title">{activeSection.label}</span>
                          <span className="muted">
                            {filteredActiveRows.filter((r) => !!draft[r.key]).length}/
                            {filteredActiveRows.length} shown
                          </span>
                        </div>
                        <div className="ucap-role__bulk">
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => setRowsEnabled(filteredActiveRows, true)}
                          >
                            <FaCheckSquare aria-hidden /> All
                          </button>
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => setRowsEnabled(filteredActiveRows, false)}
                          >
                            <FaSquare aria-hidden /> None
                          </button>
                        </div>
                      </header>
                      <ul className="ucap-cap-list">
                        {filteredActiveRows.map((row) => {
                          const shared = !!row.shared || (row.granted_by || []).length > 1
                          const otherLabels = (row.granted_by_labels || []).filter(
                            (label) => label !== activeSection.label
                          )
                          const checked = !!draft[row.key]
                          const changed =
                            matrix.rows?.some(
                              (r) => r.key === row.key && !!draft[row.key] !== !!r.enabled
                            ) || false
                          return (
                            <li
                              key={`${activeSection.role}-${row.key}`}
                              className={`ucap-cap ${checked ? '' : 'is-revoked'} ${changed ? 'is-changed' : ''}`}
                            >
                              <label
                                className="ucap-cap__label"
                                htmlFor={`ucap-${activeSection.role}-${row.key}`}
                              >
                                <input
                                  id={`ucap-${activeSection.role}-${row.key}`}
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => onToggle(row.key)}
                                />
                                <span className="ucap-cap__text">
                                  <span className="ucap-cap__name">
                                    {row.label}
                                    {shared ? (
                                      <span
                                        className="ucap-pill ucap-pill--muted"
                                        title="Also granted by another role"
                                      >
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
                    </section>
                  )}
                </>
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
