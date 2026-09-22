import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { DEFAULT_ROLE_LABELS } from '../utils/roleLabels'

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'user',
  firm_id: '',
  credits: 0,
  is_suspended: false,
}

export default function PowerAdminUsers() {
  const { canPower, user: me } = useAuth()
  const { roleLabels, actingHubId } = useHub()
  const allowed = canPower('pa_manage_users_roles')

  const fallbackRoles = Object.entries(roleLabels || DEFAULT_ROLE_LABELS).map(([key, label]) => ({
    key,
    label,
  }))

  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [firms, setFirms] = useState([])
  const [meta, setMeta] = useState(null)
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async (page = 1) => {
    if (!allowed) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.powerAdminUsers({
        q: q || undefined,
        role: roleFilter || undefined,
        page,
        per_page: 50,
      })
      setUsers(data.users || [])
      setRoles(data.roles || [])
      setFirms(data.firms || [])
      setMeta(data.meta || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, actingHubId])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const startEdit = (user) => {
    setEditingId(user.id)
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'user',
      firm_id: user.firm_id ? String(user.firm_id) : '',
      credits: user.has_unlimited_credits ? 0 : Number(user.credits || 0),
      is_suspended: Boolean(user.is_suspended),
    })
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!allowed) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        credits: Number(form.credits) || 0,
        is_suspended: Boolean(form.is_suspended),
        firm_id:
          form.role === 'power_admin' || form.role === 'finproms_admin'
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
      await load(meta?.current_page || 1)
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
      await load(meta?.current_page || 1)
    } catch (err) {
      setError(err.message)
    }
  }

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
            Enable &quot;Manage users &amp; roles&quot; under Power Admin → Capabilities.
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
          <p className="muted">Create accounts, update details, and assign platform roles.</p>
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
            Role
            <select
              value={form.role}
              onChange={(e) => {
                const role = e.target.value
                setForm((f) => ({
                  ...f,
                  role,
                  firm_id: role === 'power_admin' || role === 'finproms_admin' ? '' : f.firm_id,
                }))
              }}
              required
            >
              {(roles.length ? roles : fallbackRoles).map((role) => (
                <option key={role.key} value={role.key}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Firm
            <select
              value={form.firm_id}
              onChange={(e) => setForm((f) => ({ ...f, firm_id: e.target.value }))}
              disabled={form.role === 'power_admin' || form.role === 'finproms_admin'}
            >
              <option value="">No firm</option>
              {(form.role === 'power_admin' || form.role === 'finproms_admin'
                ? []
                : firms
              ).map((firm) => (
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
        {form.role === 'admin_staff' ? (
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            {(roleLabels || DEFAULT_ROLE_LABELS).admin_staff || 'Admin-staff'} can submit compliance
            on behalf of advisors in their firm. Assign a firm, then they pick an advisor from the
            dashboard.
          </p>
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
            {saving ? 'Saving…' : editingId ? 'Update user' : 'Create user'}
          </button>
          {editingId ? (
            <button type="button" className="btn ghost" onClick={resetForm} disabled={saving}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
        <form
          className="row"
          style={{ gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}
          onSubmit={(e) => {
            e.preventDefault()
            load(1)
          }}
        >
          <input
            type="search"
            placeholder="Search name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {roles.map((role) => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn ghost">
            Filter
          </button>
        </form>
      </div>

      {loading ? (
        <p className="muted">Loading users…</p>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <h2>No users found</h2>
          <p className="muted">Try a different search, or create a user above.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Firm</th>
                <th>Credits</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role_label || user.role}</td>
                  <td>{user.firm?.name || '—'}</td>
                  <td>{user.has_unlimited_credits ? 'Unlimited' : user.credits}</td>
                  <td>
                    <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button type="button" className="btn ghost" onClick={() => startEdit(user)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => onDelete(user)}
                        disabled={user.id === me?.id}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.last_page > 1 ? (
        <div className="row" style={{ gap: '0.75rem', marginTop: '1rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn ghost"
            disabled={meta.current_page <= 1}
            onClick={() => load(meta.current_page - 1)}
          >
            Previous
          </button>
          <span className="muted">
            Page {meta.current_page} of {meta.last_page} ({meta.total} users)
          </span>
          <button
            type="button"
            className="btn ghost"
            disabled={meta.current_page >= meta.last_page}
            onClick={() => load(meta.current_page + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  )
}
