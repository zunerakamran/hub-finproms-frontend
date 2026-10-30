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

function BulletList({ items }) {
  if (!items?.length) return <span className="muted">-</span>
  return (
    <ul className="hub-users-bullets">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function VerifiedFlag({ verified }) {
  return (
    <span
      className={`hub-users-flag ${verified ? 'hub-users-flag--ok' : 'hub-users-flag--warn'}`}
      title={verified ? 'Email verified' : 'Email not verified'}
    >
      {verified ? 'Verified' : 'Not verified'}
    </span>
  )
}

function YesNo({ value }) {
  return <span className={value ? 'hub-users-yes' : 'hub-users-no'}>{value ? 'Yes' : 'No'}</span>
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
        filterValue: (row) => row.name || '',
        render: (row) => (
          <div className="hub-users-identity">
            {row.avatar_url ? (
              <img src={row.avatar_url} alt="" className="hub-users-avatar" />
            ) : (
              <span className="hub-users-avatar hub-users-avatar--placeholder">
                {(row.name || '?').slice(0, 1).toUpperCase()}
              </span>
            )}
            <span>{row.name || '-'}</span>
          </div>
        ),
      },
      {
        key: 'email',
        label: 'Email',
        filterValue: (row) => row.email || '',
        render: (row) => (
          <div className="hub-users-email">
            <span>{row.email || '-'}</span>
            <VerifiedFlag verified={!!row.email_verified} />
          </div>
        ),
      },
      {
        key: 'otp',
        label: 'OTP to login',
        filterValue: (row) => (row.otp_enabled ? 'Yes' : 'No'),
        render: (row) => (
          <button type="button" className="linkish" onClick={() => openToggleLogs(row, 'otp')}>
            <YesNo value={!!row.otp_enabled} />
          </button>
        ),
      },
      {
        key: 'mfa',
        label: 'MS Authenticator',
        filterValue: (row) => (row.mfa_enabled ? 'Yes' : 'No'),
        render: (row) => (
          <button type="button" className="linkish" onClick={() => openToggleLogs(row, 'authenticator')}>
            <YesNo value={!!row.mfa_enabled} />
            {row.mfa_pending ? <span className="muted"> (pending)</span> : null}
          </button>
        ),
      },
      {
        key: 'signup',
        label: 'Signup date',
        render: (row) => <DataGridDate value={row.signup_at || row.created_at} />,
      },
      {
        key: 'training',
        label: 'Training',
        filterValue: (row) => (row.training_attended ? 'Attended' : 'Not yet'),
        render: (row) => (row.training_attended ? 'Attended' : 'Not yet'),
      },
      {
        key: 'password_changed_at',
        label: 'Password last changed',
        render: (row) =>
          row.password_changed_at ? <DataGridDate value={row.password_changed_at} /> : <span className="muted">-</span>,
      },
      {
        key: 'roles',
        label: 'Roles',
        filterValue: (row) => formatUserRoles(row, null, roleLabel),
        render: (row) => (
          <BulletList
            items={(row.role_labels?.length ? row.role_labels : userRoleKeys(row).map((r) => roleLabel?.(r) || r)) || []}
          />
        ),
      },
      {
        key: 'firm',
        label: 'Network / Firm',
        filterValue: (row) => row.firm?.name || '',
        render: (row) => row.firm?.name || '-',
      },
      {
        key: 'modules',
        label: 'Availed modules',
        filterValue: (row) => moduleLabels(row).join(', '),
        render: (row) => <BulletList items={moduleLabels(row)} />,
      },
      {
        key: 'login',
        label: 'Login details',
        filterType: 'none',
        render: (row) => (
          <button type="button" className="btn ghost small" onClick={() => openLoginHistory(row)}>
            View logins
          </button>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        filterValue: (row) => statusLabel(row),
        render: (row) => {
          const label = statusLabel(row)
          const ok = label === 'Active'
          return (
            <div>
              <span className={`badge ${ok ? 'ok' : ''}`}>{label}</span>
              {row.status_remarks ? (
                <div className="muted" style={{ fontSize: '0.85em', marginTop: 4 }}>
                  {row.status_remarks}
                </div>
              ) : null}
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
        columns={columns}
        rows={users}
        loading={loading}
        getRowKey={(row) => row.id}
        emptyMessage="No users found on this hub."
        actions={anyActionCap ? renderActions : undefined}
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
        .hub-users-identity { display: flex; align-items: center; gap: 0.6rem; }
        .hub-users-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .hub-users-avatar--placeholder { display: inline-flex; align-items: center; justify-content: center; background: var(--border, #ddd); font-size: 0.85rem; font-weight: 600; }
        .hub-users-email { display: flex; flex-direction: column; gap: 0.25rem; align-items: flex-start; }
        .hub-users-flag { font-size: 0.75rem; padding: 0.1rem 0.45rem; border-radius: 999px; font-weight: 600; }
        .hub-users-flag--ok { background: #dcfce7; color: #166534; }
        .hub-users-flag--warn { background: #fef3c7; color: #92400e; }
        .hub-users-yes { color: #166534; font-weight: 600; }
        .hub-users-no { color: #6b7280; }
        .hub-users-bullets { margin: 0; padding-left: 1.1rem; }
        .hub-users-actions { display: flex; flex-wrap: wrap; gap: 0.25rem; }
        .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; z-index: 80; padding: 1rem; }
        .modal { background: var(--surface, #fff); border-radius: 12px; padding: 1.25rem; box-shadow: 0 20px 50px rgba(0,0,0,0.2); }
        .modal-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
        .hub-users-modal { max-width: 720px; width: min(720px, 94vw); max-height: 85vh; overflow: auto; }
        .hub-users-log-table-wrap { overflow: auto; }
        .hub-users-checkboxes { display: grid; gap: 0.35rem; margin: 0.75rem 0; }
        .linkish { background: none; border: none; padding: 0; cursor: pointer; font: inherit; color: inherit; text-align: left; }
        .btn.small { padding: 0.25rem 0.55rem; font-size: 0.85rem; }
        .stack { display: grid; gap: 0.75rem; }
        .stack label { display: grid; gap: 0.35rem; }
      `}</style>
    </section>
  )
}
