import { useEffect, useMemo, useState } from 'react'
import { FaEdit, FaTrash } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import {
  formatUserRoles,
  pickPrimaryRole,
  roleLabel as resolveRoleLabel,
  userRoleKeys,
} from '../utils/roleLabels'

const emptyForm = {
  name: '',
  email: '',
  password: '',
  roles: ['user'],
  primary_role: 'user',
  firm_id: '',
  credits: 0,
  is_suspended: false,
  allows_admin_staff_acting: false,
  is_advisor: false,
}

const BASE_MODULE_LABELS = new Set(['Shared Hub', 'White Label Hub'])
const CONTROL_PLANE_ROLES = new Set(['power_admin', 'finproms_admin'])

function formatUserModules(user) {
  const mods = user?.modules
  if (!mods) return '-'
  if (mods.unrestricted) return 'All hub modules'
  const labels = (mods.labels || []).filter((label) => !BASE_MODULE_LABELS.has(label))
  if (labels.length === 0) return 'Base hub only'
  return labels.join(', ')
}

function rolesIncludeControlPlane(roles) {
  return (roles || []).some((role) => CONTROL_PLANE_ROLES.has(role))
}

export default function PowerAdminUsers() {
  const { canPower, user: me } = useAuth()
  const { hub, roleLabels, actingHubId } = useHub()
  const allowed = canPower('pa_manage_users_roles')

  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [firms, setFirms] = useState([])
  const [roleFilter, setRoleFilter] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    if (!allowed) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.powerAdminUsers({
        role: roleFilter || undefined,
        page: 1,
        per_page: 50,
      })
      setUsers(data.users || [])
      setRoles(data.roles || [])
      setFirms(data.firms || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, actingHubId, roleFilter])

  // After roles load, keep create-form roles on visible options.
  useEffect(() => {
    if (editingId || roles.length === 0) return
    setForm((f) => {
      const visible = new Set(roles.map((role) => role.key))
      const nextRoles = (f.roles || []).filter((role) => visible.has(role))
      if (nextRoles.length > 0 && nextRoles.length === (f.roles || []).length) {
        return f
      }
      const fallback = nextRoles.length > 0 ? nextRoles : [roles[0].key]
      const primary = fallback.includes(f.primary_role)
        ? f.primary_role
        : pickPrimaryRole(fallback)
      return {
        ...f,
        roles: fallback,
        primary_role: primary,
        is_advisor: fallback.includes('advisor') ? true : f.is_advisor,
        firm_id: rolesIncludeControlPlane(fallback) ? '' : f.firm_id,
      }
    })
  }, [roles, editingId])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const startEdit = (user) => {
    const held = userRoleKeys(user)
    const rolesList = held.length > 0 ? held : ['user']
    const primary = user.primary_role || user.role || pickPrimaryRole(rolesList)
    setEditingId(user.id)
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      roles: rolesList,
      primary_role: rolesList.includes(primary) ? primary : pickPrimaryRole(rolesList),
      firm_id: user.firm_id ? String(user.firm_id) : '',
      credits: user.has_unlimited_credits ? 0 : Number(user.credits || 0),
      is_suspended: Boolean(user.is_suspended),
      allows_admin_staff_acting: Boolean(user.allows_admin_staff_acting),
      is_advisor: Boolean(user.is_advisor) || rolesList.includes('advisor'),
    })
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // API roles = matrix-visible for this hub. Keep current edit values if missing.
  const roleOptions = useMemo(() => {
    const list = [...roles]
    for (const key of form.roles || []) {
      if (key && !list.some((role) => role.key === key)) {
        list.push({
          key,
          label: resolveRoleLabel(hub, key) || roleLabels?.[key] || key,
        })
      }
    }
    return list
  }, [roles, form.roles, hub, roleLabels])

  const isAdvisorForm = (form.roles || []).includes('advisor') || Boolean(form.is_advisor)
  const isControlPlaneForm = rolesIncludeControlPlane(form.roles)
  const staffLabel = resolveRoleLabel(hub, 'admin_staff') || 'Admin-staff'

  const toggleRole = (roleKey) => {
    setForm((f) => {
      const current = new Set(f.roles || [])
      if (current.has(roleKey)) {
        if (current.size <= 1) return f
        current.delete(roleKey)
      } else {
        current.add(roleKey)
      }
      const nextRoles = Array.from(current)
      const primary = nextRoles.includes(f.primary_role)
        ? f.primary_role
        : pickPrimaryRole(nextRoles)
      return {
        ...f,
        roles: nextRoles,
        primary_role: primary,
        is_advisor: nextRoles.includes('advisor') ? true : f.is_advisor,
        allows_admin_staff_acting:
          nextRoles.includes('advisor') || f.is_advisor ? f.allows_admin_staff_acting : false,
        firm_id: rolesIncludeControlPlane(nextRoles) ? '' : f.firm_id,
      }
    })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!allowed) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const rolesPayload = form.roles?.length ? form.roles : ['user']
      const primary = rolesPayload.includes(form.primary_role)
        ? form.primary_role
        : pickPrimaryRole(rolesPayload)
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        roles: rolesPayload,
        primary_role: primary,
        role: primary,
        credits: Number(form.credits) || 0,
        is_suspended: Boolean(form.is_suspended),
        allows_admin_staff_acting: isAdvisorForm
          ? Boolean(form.allows_admin_staff_acting)
          : false,
        firm_id: isControlPlaneForm
          ? null
          : form.firm_id
            ? Number(form.firm_id)
            : null,
      }
      if (form.password.trim()) {
        payload.password = form.password
      }

      if (editingId) {
        const data = await api.updatePowerAdminUser(editingId, payload)
        setMessage(data.message || 'User updated.')
      } else {
        if (!form.password.trim()) {
          throw new Error('Password is required for new users.')
        }
        payload.password = form.password
        const data = await api.createPowerAdminUser(payload)
        setMessage(data.message || 'User created.')
      }
      resetForm()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (user) => {
    if (user.id === me?.id) {
      setError('You cannot delete your own account.')
      return
    }
    const ok = window.confirm(`Delete ${user.name} (${user.email})? This cannot be undone.`)
    if (!ok) return
    setError('')
    setMessage('')
    try {
      const data = await api.deletePowerAdminUser(user.id)
      setMessage(data.message || 'User deleted.')
      if (editingId === user.id) resetForm()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const userColumns = useMemo(
    () => [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      {
        key: 'role',
        label: 'Roles',
        filterValue: (row) => formatUserRoles(row, hub),
        render: (row) => formatUserRoles(row, hub),
      },
      {
        key: 'firm',
        label: 'Firm',
        filterValue: (row) => row.firm?.name || '',
        render: (row) => row.firm?.name || '-',
      },
      {
        key: 'modules',
        label: 'Modules',
        filterValue: (row) => formatUserModules(row),
        render: (row) => (
          <span className="muted" style={{ fontSize: '0.9em' }}>
            {formatUserModules(row)}
          </span>
        ),
      },
      {
        key: 'credits',
        label: 'Credits',
        filterValue: (row) =>
          row.has_unlimited_credits ? 'Unlimited' : String(row.credits ?? ''),
        render: (row) => (row.has_unlimited_credits ? 'Unlimited' : row.credits),
      },
    ],
    [hub]
  )

  if (!allowed) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Platform</p>
            <h1>Users & roles</h1>
          </div>
        </div>
        <div className="empty-state">
          <h2>Capability disabled</h2>
          <p className="muted">
            Enable &quot;Manage users &amp; roles&quot; under Power Admin â†’ Capabilities.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Platform</p>
          <h1>Users & roles</h1>
          <p className="muted">
            Create accounts, update details, and assign one or more platform roles.
          </p>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <form className="admin-form" onSubmit={onSubmit}>
        <h2>{editingId ? 'Edit user' : 'Create user'}</h2>
        <div className="form-grid">
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </label>
          <label>
            Password {editingId ? '(leave blank to keep)' : ''}
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required={!editingId}
              autoComplete="new-password"
            />
          </label>
          <label>
            Primary role
            <select
              value={form.primary_role}
              onChange={(e) => setForm((f) => ({ ...f, primary_role: e.target.value }))}
              required
            >
              {(form.roles || []).map((key) => {
                const option = roleOptions.find((role) => role.key === key)
                return (
                  <option key={key} value={key}>
                    {option?.label || resolveRoleLabel(hub, key) || key}
                  </option>
                )
              })}
            </select>
          </label>
          <label>
            Firm
            <select
              value={form.firm_id}
              onChange={(e) => setForm((f) => ({ ...f, firm_id: e.target.value }))}
              disabled={isControlPlaneForm}
            >
              <option value="">No firm</option>
              {(isControlPlaneForm ? [] : firms).map((firm) => (
                <option key={firm.id} value={firm.id}>
                  {firm.name}
                  {firm.is_central ? ' (Central / Network)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Credits
            <input
              type="number"
              min="0"
              value={form.credits}
              onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))}
            />
          </label>
        </div>

        <fieldset style={{ marginTop: '1rem', border: '1px solid var(--border, #ddd)', borderRadius: 8, padding: '0.75rem 1rem' }}>
          <legend style={{ padding: '0 0.35rem' }}>Roles</legend>
          <p className="muted" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
            Select one or more roles. Effective capabilities are the union of all selected roles.
            Primary role is used for display and activity logs only.
          </p>
          <div className="row" style={{ gap: '0.75rem 1.25rem', flexWrap: 'wrap' }}>
            {(roleOptions.length ? roleOptions : [{ key: 'user', label: 'User' }]).map((role) => {
              const checked = (form.roles || []).includes(role.key)
              const onlyOne = checked && (form.roles || []).length === 1
              return (
                <label key={role.key} className="checkbox" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={onlyOne}
                    onChange={() => toggleRole(role.key)}
                  />
                  {role.label}
                </label>
              )
            })}
          </div>
        </fieldset>

        {(form.roles || []).includes('admin_staff') ? (
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            {staffLabel} use their Capabilities matrix access by default. Assign a firm so they
            can pick advisors who have granted â€œwork on behalfâ€ permission, then act as that
            advisor with attribution on submissions and reporting.
          </p>
        ) : null}
        {isAdvisorForm ? (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={Boolean(form.allows_admin_staff_acting)}
              onChange={(e) =>
                setForm((f) => ({ ...f, allows_admin_staff_acting: e.target.checked }))
              }
            />
            Allow {staffLabel} to work on behalf of this advisor
          </label>
        ) : null}
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.is_suspended}
            onChange={(e) => setForm((f) => ({ ...f, is_suspended: e.target.checked }))}
          />
          Suspended
        </label>
        <div className="row" style={{ gap: '0.75rem', marginTop: '1rem' }}>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Savingâ€¦' : editingId ? 'Update user' : 'Create user'}
          </button>
          {editingId ? (
            <button type="button" className="btn ghost" onClick={resetForm} disabled={saving}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
        <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label>
            Role
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All roles</option>
              {roles.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <DataGrid
        columns={userColumns}
        rows={users}
        loading={loading}
        emptyMessage="No users found. Try a different role filter, or create a user above."
        pageSize={10}
        getRowKey={(row) => row.id}
        actions={(user) => (
          <>
            <DataGridIconBtn icon={FaEdit} label="Edit" onClick={() => startEdit(user)} />
            <DataGridIconBtn
              icon={FaTrash}
              label="Delete"
              variant="danger"
              onClick={() => onDelete(user)}
              disabled={user.id === me?.id}
            />
          </>
        )}
      />
    </section>
  )
}

