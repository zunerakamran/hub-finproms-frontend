import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FaBan,
  FaEnvelope,
  FaKey,
  FaMobileAlt,
  FaPuzzlePiece,
  FaShieldAlt,
  FaSync,
  FaUserGraduate,
  FaUserTag,
} from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatUserRoles, userHasAnyRole, userRoleKeys } from '../utils/roleLabels'

const BASE_MODULE_LABELS = new Set(['Shared Hub', 'White Label Hub'])
const CONTROL_PLANE_ROLES = new Set(['power_admin', 'finproms_admin'])

function moduleLabels(user) {
  const mods = user?.modules
  if (!mods) return []
  if (mods.unrestricted) return ['All hub modules']
  const labels = (mods.labels || []).filter((label) => !BASE_MODULE_LABELS.has(label))
  if (labels.length === 0) return ['Base hub only']
  return labels
}

function statusLabel(user) {
  if (user?.is_discontinued || user?.is_suspended || user?.status === 'inactive') return 'Inactive'
  return 'Active'
}

function canManageUser(user) {
  if (!user || user.is_discontinued) return false
  if (userHasAnyRole(user, [...CONTROL_PLANE_ROLES])) return false
  return true
}

function ChipList({ items, empty = '-' }) {
  if (!items?.length) return <span className="hub-users-empty">{empty}</span>
  return (
    <div className="hub-users-chips">
      {items.map((item) => (
        <span key={item} className="hub-users-chip">
          {item}
        </span>
      ))}
    </div>
  )
}

function MetaLine({ label, children }) {
  return (
    <div className="hub-users-meta">
      <span className="hub-users-meta__label">{label}</span>
      <span className="hub-users-meta__value">{children}</span>
    </div>
  )
}

function ToggleChip({ on, label, pending = false, onClick }) {
  return (
    <button
      type="button"
      className={`hub-users-toggle ${on ? 'is-on' : 'is-off'}${pending ? ' is-pending' : ''}`}
      onClick={onClick}
      title={`View ${label} history`}
    >
      <span className="hub-users-toggle__dot" aria-hidden="true" />
      <span className="hub-users-toggle__label">{label}</span>
      <span className="hub-users-toggle__state">{on ? 'On' : pending ? 'Pending' : 'Off'}</span>
    </button>
  )
}

/** Prefer same-origin /api/media for local Vite proxy; keep absolute remote hub URLs. */
function resolveAvatarSrc(url) {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  if (!trimmed) return ''

  try {
    const parsed = new URL(trimmed, window.location.origin)
    const marker = parsed.pathname.match(/\/(?:api\/)?media\/(.+)$/i)
    if (!marker) return trimmed

    const mediaPath = marker[1]
    // Same host as the SPA (or relative) → use Vite/production proxy path.
    if (parsed.origin === window.location.origin || trimmed.startsWith('/')) {
      return `/api/media/${mediaPath}`
    }

    // Local backend host while SPA is on Vite — rewrite through proxy.
    if (
      /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname) &&
      /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
    ) {
      return `/api/media/${mediaPath}`
    }

    return trimmed
  } catch {
    if (trimmed.startsWith('/api/media/') || trimmed.startsWith('/media/')) {
      return trimmed.startsWith('/media/') ? `/api${trimmed}` : trimmed
    }
    return trimmed
  }
}

function UserAvatar({ user }) {
  const [failed, setFailed] = useState(false)
  const src = resolveAvatarSrc(user?.avatar_url)
  const initial = String(user?.name || '?').slice(0, 1).toUpperCase()

  if (!src || failed) {
    return (
      <span className="hub-users-avatar hub-users-avatar--placeholder" aria-hidden="true">
        {initial}
      </span>
    )
  }

  return (
    <span className="hub-users-avatar" aria-hidden="true">
      <img src={src} alt="" onError={() => setFailed(true)} />
    </span>
  )
}

export default function AdminHubUsers({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub, isActingRemotely, roleLabel } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_view_hub_users')
  const caps = {
    suspend: can('advisor_discontinue'),
    password: can('hub_users_change_password'),
    roles: can('hub_users_edit_roles'),
    modules: can('hub_users_edit_modules'),
    email: can('hub_users_change_email'),
    otp: can('hub_users_toggle_otp'),
    authenticator: can('hub_users_toggle_authenticator'),
    training: can('hub_users_edit_training'),
  }
  const apiOpts = { asPowerAdmin }

  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState({ total: 0 })
  const [hubMeta, setHubMeta] = useState(null)
  const [roleOptions, setRoleOptions] = useState([])
  const [moduleOptions, setModuleOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState(null)

  const [panel, setPanel] = useState(null) // { type, user }
  const [form, setForm] = useState({})
  const [loginLogs, setLoginLogs] = useState([])
  const [toggleLogs, setToggleLogs] = useState({ otp: [], authenticator: [] })
  const [panelLoading, setPanelLoading] = useState(false)

  const targetName = isActingRemotely
    ? actingHub?.name || hubMeta?.name || 'selected hub'
    : hubMeta?.name || 'this hub'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.hubUsers({ per_page: 100, page: 1 }, apiOpts)
      setUsers(data.users || [])
      setMeta(data.meta || { total: 0 })
      setHubMeta(data.hub || null)
      setRoleOptions(data.roles || [])
      setModuleOptions(data.module_options || [])
    } catch (err) {
      setError(err.message || 'Failed to load users.')
      setUsers([])
      setMeta({ total: 0 })
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
  }, [hubLoading, enabled, load, actingHub?.id, isActingRemotely])

  const patchUser = (updated) => {
    if (!updated?.id) return
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
  }

  const runAction = async (userId, fn) => {
    setBusyId(userId)
    setError('')
    setMessage('')
    try {
      const data = await fn()
      setMessage(data.message || 'Updated.')
      if (data.user) patchUser(data.user)
      else await load()
      setPanel(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const openLoginHistory = async (user) => {
    setPanel({ type: 'login', user })
    setPanelLoading(true)
    setLoginLogs([])
    try {
      const data = await api.hubUserLoginHistory(user.id, { per_page: 50 }, apiOpts)
      setLoginLogs(data.logs || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setPanelLoading(false)
    }
  }

  const openToggleLogs = async (user, kind) => {
    setPanel({ type: 'toggle-logs', user, kind })
    setPanelLoading(true)
    try {
      const data = await api.hubUserSecurityToggleLogs(user.id, apiOpts)
      setToggleLogs({ otp: data.otp || [], authenticator: data.authenticator || [] })
    } catch (err) {
      setError(err.message)
    } finally {
      setPanelLoading(false)
    }
  }

  const openForm = (type, user, initial = {}) => {
    setForm(initial)
    setPanel({ type, user })
  }

  const columns = useMemo(
    () => [
      {
        key: 'user',
        label: 'User',
        grow: true,
        wrap: true,
        truncate: false,
        filterValue: (row) => `${row.name || ''} ${row.email || ''}`,
        render: (row) => (
          <div className="hub-users-person">
            <UserAvatar user={row} />
            <div className="hub-users-person__text">
              <div className="hub-users-person__name">{row.name || '-'}</div>
              <div className="hub-users-person__email" title={row.email || undefined}>
                {row.email || '-'}
              </div>
              <span
                className={`hub-users-flag ${row.email_verified ? 'is-ok' : 'is-warn'}`}
                title={row.email_verified ? 'Email verified' : 'Email not verified'}
              >
                {row.email_verified ? 'Verified' : 'Not verified'}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'security',
        label: 'Login security',
        wrap: true,
        truncate: false,
        filterValue: (row) =>
          [
            row.otp_enabled ? 'OTP on' : 'OTP off',
            row.mfa_enabled ? 'MFA on' : 'MFA off',
          ].join(' '),
        render: (row) => (
          <div className="hub-users-security">
            <ToggleChip
              on={!!row.otp_enabled}
              label="OTP"
              onClick={() => openToggleLogs(row, 'otp')}
            />
            <ToggleChip
              on={!!row.mfa_enabled}
              pending={!!row.mfa_pending && !row.mfa_enabled}
              label="Authenticator"
              onClick={() => openToggleLogs(row, 'authenticator')}
            />
          </div>
        ),
      },
      {
        key: 'dates',
        label: 'Dates',
        wrap: true,
        truncate: false,
        filterValue: (row) => row.signup_at || row.created_at || '',
        render: (row) => (
          <div className="hub-users-dates">
            <MetaLine label="Signup">
              <DataGridDate value={row.signup_at || row.created_at} />
            </MetaLine>
            <MetaLine label="Password">
              {row.password_changed_at ? (
                <DataGridDate value={row.password_changed_at} />
              ) : (
                <span className="hub-users-empty">Never</span>
              )}
            </MetaLine>
          </div>
        ),
      },
      {
        key: 'training',
        label: 'Training',
        wrap: true,
        truncate: false,
        filterValue: (row) => (row.training_attended ? 'Attended' : 'Not yet'),
        render: (row) => (
          <span className={`hub-users-training ${row.training_attended ? 'is-done' : ''}`}>
            {row.training_attended ? 'Attended' : 'Not yet'}
          </span>
        ),
      },
      {
        key: 'access',
        label: 'Roles & modules',
        grow: true,
        wrap: true,
        truncate: false,
        filterValue: (row) =>
          `${formatUserRoles(row, null, roleLabel)} ${moduleLabels(row).join(' ')} ${row.firm?.name || ''}`,
        render: (row) => (
          <div className="hub-users-access">
            <MetaLine label="Roles">
              <ChipList
                items={
                  (row.role_labels?.length
                    ? row.role_labels
                    : userRoleKeys(row).map((r) => roleLabel?.(r) || r)) || []
                }
              />
            </MetaLine>
            <MetaLine label="Firm">
              <span className="hub-users-firm">{row.firm?.name || '—'}</span>
            </MetaLine>
            <MetaLine label="Modules">
              <ChipList items={moduleLabels(row)} />
            </MetaLine>
          </div>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        wrap: true,
        truncate: false,
        filterValue: (row) => statusLabel(row),
        render: (row) => {
          const label = statusLabel(row)
          const ok = label === 'Active'
          return (
            <div className="hub-users-status">
              <span className={`badge ${ok ? 'ok' : 'hub-users-badge-inactive'}`}>{label}</span>
              {row.status_remarks ? (
                <p className="hub-users-remarks" title={row.status_remarks}>
                  {row.status_remarks}
                </p>
              ) : null}
              <button
                type="button"
                className="hub-users-login-link"
                onClick={() => openLoginHistory(row)}
              >
                Login history
              </button>
            </div>
          )
        },
      },
    ],
    [roleLabel]
  )

  const anyActionCap = Object.values(caps).some(Boolean)

  const renderActions = (user) => {
    if (!anyActionCap || !canManageUser(user)) return null
    const busy = busyId === user.id
    return (
      <div className="hub-users-actions">
        {caps.suspend ? (
          <DataGridIconBtn
            icon={FaBan}
            label="Suspend / discontinue"
            variant="danger"
            disabled={busy}
            onClick={() =>
              openForm('suspend', user, { remarks: user.status_remarks || '' })
            }
          />
        ) : null}
        {caps.password ? (
          <DataGridIconBtn
            icon={FaKey}
            label="Change password"
            disabled={busy || !user.email_verified}
            onClick={() =>
              runAction(user.id, () => api.hubUserChangePassword(user.id, apiOpts))
            }
          />
        ) : null}
        {caps.roles ? (
          <DataGridIconBtn
            icon={FaUserTag}
            label="Edit roles"
            disabled={busy}
            onClick={() => openForm('roles', user, { roles: userRoleKeys(user) })}
          />
        ) : null}
        {caps.modules ? (
          <DataGridIconBtn
            icon={FaPuzzlePiece}
            label="Edit modules"
            disabled={busy}
            onClick={() =>
              openForm('modules', user, {
                unrestricted: !!user.modules?.unrestricted,
                modules: user.modules?.keys || [],
              })
            }
          />
        ) : null}
        {caps.email ? (
          <DataGridIconBtn
            icon={FaEnvelope}
            label="Change email"
            disabled={busy}
            onClick={() => openForm('email', user, { email: user.email || '' })}
          />
        ) : null}
        {caps.otp ? (
          <DataGridIconBtn
            icon={FaMobileAlt}
            label={user.otp_enabled ? 'Disable OTP' : 'Enable OTP'}
            disabled={busy}
            onClick={() =>
              runAction(user.id, () =>
                api.hubUserToggleOtp(user.id, { enabled: !user.otp_enabled }, apiOpts)
              )
            }
          />
        ) : null}
        {caps.authenticator ? (
          <DataGridIconBtn
            icon={FaShieldAlt}
            label={user.mfa_enabled ? 'Disable Authenticator' : 'Request Authenticator'}
            disabled={busy}
            onClick={() =>
              runAction(user.id, () =>
                api.hubUserToggleAuthenticator(
                  user.id,
                  { enabled: !user.mfa_enabled },
                  apiOpts
                )
              )
            }
          />
        ) : null}
        {caps.training ? (
          <DataGridIconBtn
            icon={FaUserGraduate}
            label={user.training_attended ? 'Mark training not attended' : 'Mark training attended'}
            disabled={busy}
            onClick={() =>
              runAction(user.id, () =>
                api.hubUserUpdateTraining(
                  user.id,
                  { training_attended: !user.training_attended },
                  apiOpts
                )
              )
            }
          />
        ) : null}
      </div>
    )
  }

  if (!enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Hub</p>
            <h1>Users</h1>
          </div>
        </div>
        <div className="empty-state">
          <h2>Capability disabled</h2>
          <p className="muted">
            Enable &quot;View hub users&quot; under Capabilities for your role on this hub.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Users</h1>
          <p className="muted">
            All users on <strong>{targetName}</strong>
            {meta?.total != null ? ` | ${meta.total} total` : ''}
          </p>
        </div>
        <div className="actions">
          <DataGridIconBtn icon={FaSync} label="Refresh" onClick={load} disabled={loading} />
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <DataGrid
        className="hub-users-grid"
        columns={columns}
        rows={users}
        loading={loading}
        getRowKey={(row) => row.id}
        emptyMessage="No users found on this hub."
        actions={anyActionCap ? renderActions : undefined}
        actionsLabel="Actions"
        actionsMinWidth="8.5rem"
      />

      {panel ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setPanel(null)}>
          <div
            className="modal hub-users-modal"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2>
                {panel.type === 'login' && 'Login details'}
                {panel.type === 'toggle-logs' &&
                  (panel.kind === 'otp' ? 'OTP activation log' : 'Authenticator log')}
                {panel.type === 'suspend' && 'Suspend / discontinue'}
                {panel.type === 'roles' && 'Edit roles'}
                {panel.type === 'modules' && 'Edit modules'}
                {panel.type === 'email' && 'Change registered email'}
              </h2>
              <button type="button" className="btn ghost" onClick={() => setPanel(null)}>
                Close
              </button>
            </div>
            <p className="muted">
              {panel.user?.name} — {panel.user?.email}
            </p>

            {panelLoading ? <p className="muted">Loading…</p> : null}

            {panel.type === 'login' && !panelLoading ? (
              <div className="hub-users-log-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date / time</th>
                      <th>Outcome</th>
                      <th>IP</th>
                      <th>Device</th>
                      <th>OS</th>
                      <th>Browser</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="muted">
                          No login events recorded yet.
                        </td>
                      </tr>
                    ) : (
                      loginLogs.map((log) => (
                        <tr key={log.id}>
                          <td>
                            <DataGridDate value={log.created_at} />
                          </td>
                          <td>
                            <span className={`badge ${log.success ? 'ok' : ''}`}>
                              {log.outcome}
                            </span>
                          </td>
                          <td>{log.ip_address || '-'}</td>
                          <td>{log.device}</td>
                          <td>{log.os}</td>
                          <td>{log.browser}</td>
                          <td className="muted">{log.action}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            {panel.type === 'toggle-logs' && !panelLoading ? (
              <div className="hub-users-log-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date / time</th>
                      <th>Event</th>
                      <th>Enabled</th>
                      <th>Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(panel.kind === 'otp' ? toggleLogs.otp : toggleLogs.authenticator).length ===
                    0 ? (
                      <tr>
                        <td colSpan={4} className="muted">
                          No toggle events yet.
                        </td>
                      </tr>
                    ) : (
                      (panel.kind === 'otp' ? toggleLogs.otp : toggleLogs.authenticator).map(
                        (log) => (
                          <tr key={log.id}>
                            <td>
                              <DataGridDate value={log.created_at} />
                            </td>
                            <td>{log.description || log.action}</td>
                            <td>
                              {log.enabled == null ? '-' : log.enabled ? 'Yes' : 'No'}
                            </td>
                            <td>{log.actor_email || '-'}</td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            {panel.type === 'suspend' ? (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault()
                  runAction(panel.user.id, () =>
                    api.hubUserSuspend(panel.user.id, { remarks: form.remarks || null }, apiOpts)
                  )
                }}
              >
                <label>
                  Remarks (when deactivated)
                  <textarea
                    rows={3}
                    value={form.remarks || ''}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  />
                </label>
                <button type="submit" className="btn danger" disabled={busyId === panel.user.id}>
                  Suspend / discontinue
                </button>
              </form>
            ) : null}

            {panel.type === 'roles' ? (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault()
                  runAction(panel.user.id, () =>
                    api.hubUserUpdateRoles(panel.user.id, { roles: form.roles || [] }, apiOpts)
                  )
                }}
              >
                <div className="hub-users-checkboxes">
                  {roleOptions
                    .filter((r) => !CONTROL_PLANE_ROLES.has(r.key))
                    .map((r) => (
                      <label key={r.key}>
                        <input
                          type="checkbox"
                          checked={(form.roles || []).includes(r.key)}
                          onChange={(e) => {
                            const next = new Set(form.roles || [])
                            if (e.target.checked) next.add(r.key)
                            else next.delete(r.key)
                            setForm({ ...form, roles: [...next] })
                          }}
                        />
                        {r.label}
                      </label>
                    ))}
                </div>
                <button type="submit" className="btn" disabled={busyId === panel.user.id}>
                  Save roles
                </button>
              </form>
            ) : null}

            {panel.type === 'modules' ? (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault()
                  runAction(panel.user.id, () =>
                    api.hubUserUpdateModules(
                      panel.user.id,
                      {
                        unrestricted: !!form.unrestricted,
                        modules: form.unrestricted ? [] : form.modules || [],
                      },
                      apiOpts
                    )
                  )
                }}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={!!form.unrestricted}
                    onChange={(e) => setForm({ ...form, unrestricted: e.target.checked })}
                  />{' '}
                  All hub modules (unrestricted)
                </label>
                {!form.unrestricted ? (
                  <div className="hub-users-checkboxes">
                    {moduleOptions.map((m) => (
                      <label key={m.key}>
                        <input
                          type="checkbox"
                          checked={(form.modules || []).includes(m.key)}
                          onChange={(e) => {
                            const next = new Set(form.modules || [])
                            if (e.target.checked) next.add(m.key)
                            else next.delete(m.key)
                            setForm({ ...form, modules: [...next] })
                          }}
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                ) : null}
                <button type="submit" className="btn" disabled={busyId === panel.user.id}>
                  Save modules
                </button>
              </form>
            ) : null}

            {panel.type === 'email' ? (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault()
                  runAction(panel.user.id, () =>
                    api.hubUserChangeEmail(panel.user.id, { email: form.email }, apiOpts)
                  )
                }}
              >
                <label>
                  New email
                  <input
                    type="email"
                    required
                    value={form.email || ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </label>
                <button type="submit" className="btn" disabled={busyId === panel.user.id}>
                  Change email
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}

      <style>{`
        .hub-users-grid {
          --dg-actions: 8.75rem;
          --dg-fit: 6.25rem;
          --dg-date: 7.25rem;
        }
        .hub-users-grid .data-grid__table th,
        .hub-users-grid .data-grid__table td {
          vertical-align: top;
          padding: 0.7rem 0.65rem;
        }
        .hub-users-grid .data-grid__table thead th {
          white-space: normal;
          line-height: 1.25;
          vertical-align: bottom;
        }
        .hub-users-grid .data-grid__th-label {
          white-space: normal;
        }
        .hub-users-grid td.data-grid__col--grow,
        .hub-users-grid td.data-grid__cell--wrap {
          max-width: none;
          overflow: visible;
          white-space: normal;
        }
        .hub-users-grid td.data-grid__col--fit,
        .hub-users-grid td.data-grid__col--date,
        .hub-users-grid td.data-grid__col--actions {
          white-space: normal;
        }
        .hub-users-grid .data-grid__cell-text {
          overflow: visible;
          white-space: normal;
        }
        .hub-users-grid .data-grid__actions-inner,
        .hub-users-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
          justify-content: flex-start;
          max-width: 100%;
        }
        .hub-users-person {
          display: grid;
          grid-template-columns: 2.25rem minmax(0, 1fr);
          gap: 0.55rem;
          align-items: start;
          min-width: 0;
        }
        .hub-users-avatar {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--brand, #0f5c45) 12%, #f1f5f9);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand, #0f5c45) 18%, transparent);
        }
        .hub-users-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .hub-users-avatar--placeholder {
          color: var(--brand-dark, #0a3f30);
          font-size: 0.85rem;
          font-weight: 700;
        }
        .hub-users-person__text {
          min-width: 0;
          display: grid;
          gap: 0.2rem;
        }
        .hub-users-person__name {
          font-weight: 650;
          color: var(--brand-dark, #0a3f30);
          line-height: 1.25;
          word-break: break-word;
        }
        .hub-users-person__email {
          font-size: 0.72rem;
          color: #64748b;
          line-height: 1.3;
          word-break: break-all;
        }
        .hub-users-flag {
          justify-self: start;
          margin-top: 0.1rem;
          font-size: 0.62rem;
          padding: 0.12rem 0.45rem;
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .hub-users-flag.is-ok { background: #dcfce7; color: #166534; }
        .hub-users-flag.is-warn { background: #fef3c7; color: #92400e; }
        .hub-users-security {
          display: grid;
          gap: 0.35rem;
          min-width: 0;
        }
        .hub-users-toggle {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.35rem;
          width: 100%;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 8px;
          padding: 0.28rem 0.4rem;
          cursor: pointer;
          font: inherit;
          text-align: left;
          min-width: 0;
        }
        .hub-users-toggle:hover { border-color: color-mix(in srgb, var(--brand, #0f5c45) 35%, #cbd5e1); }
        .hub-users-toggle.is-on { background: #ecfdf5; border-color: #a7f3d0; }
        .hub-users-toggle.is-off { background: #f8fafc; }
        .hub-users-toggle.is-pending { background: #fffbeb; border-color: #fde68a; }
        .hub-users-toggle__dot {
          width: 0.45rem;
          height: 0.45rem;
          border-radius: 50%;
          background: #94a3b8;
        }
        .hub-users-toggle.is-on .hub-users-toggle__dot { background: #059669; }
        .hub-users-toggle.is-pending .hub-users-toggle__dot { background: #d97706; }
        .hub-users-toggle__label {
          font-size: 0.68rem;
          font-weight: 650;
          color: #334155;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .hub-users-toggle__state {
          font-size: 0.62rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }
        .hub-users-toggle.is-on .hub-users-toggle__state { color: #047857; }
        .hub-users-dates,
        .hub-users-access,
        .hub-users-status {
          display: grid;
          gap: 0.4rem;
          min-width: 0;
        }
        .hub-users-meta {
          display: grid;
          gap: 0.12rem;
          min-width: 0;
        }
        .hub-users-meta__label {
          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #94a3b8;
        }
        .hub-users-meta__value {
          min-width: 0;
        }
        .hub-users-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }
        .hub-users-chip {
          display: inline-flex;
          align-items: center;
          max-width: 100%;
          padding: 0.12rem 0.4rem;
          border-radius: 999px;
          background: color-mix(in srgb, var(--brand, #0f5c45) 8%, #f1f5f9);
          color: #334155;
          font-size: 0.65rem;
          font-weight: 600;
          line-height: 1.25;
          word-break: break-word;
        }
        .hub-users-firm {
          font-size: 0.75rem;
          font-weight: 600;
          color: #334155;
          word-break: break-word;
        }
        .hub-users-training {
          display: inline-flex;
          align-items: center;
          padding: 0.2rem 0.5rem;
          border-radius: 999px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 0.68rem;
          font-weight: 700;
          white-space: normal;
        }
        .hub-users-training.is-done {
          background: #dcfce7;
          color: #166534;
        }
        .hub-users-badge-inactive {
          background: #fee2e2;
          color: #991b1b;
        }
        .hub-users-remarks {
          margin: 0;
          font-size: 0.68rem;
          color: #64748b;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
        }
        .hub-users-login-link {
          justify-self: start;
          border: 0;
          background: none;
          padding: 0;
          color: var(--brand, #0f5c45);
          font: inherit;
          font-size: 0.68rem;
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .hub-users-login-link:hover { opacity: 0.85; }
        .hub-users-empty {
          color: #94a3b8;
          font-size: 0.72rem;
        }
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 80;
          padding: 1rem;
        }
        .modal {
          background: var(--surface, #fff);
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 20px 50px rgba(0,0,0,0.2);
        }
        .modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }
        .hub-users-modal {
          max-width: 720px;
          width: min(720px, 94vw);
          max-height: 85vh;
          overflow: auto;
        }
        .hub-users-log-table-wrap { overflow: auto; }
        .hub-users-checkboxes { display: grid; gap: 0.35rem; margin: 0.75rem 0; }
        .stack { display: grid; gap: 0.75rem; }
        .stack label { display: grid; gap: 0.35rem; }
      `}</style>
    </section>
  )
}
