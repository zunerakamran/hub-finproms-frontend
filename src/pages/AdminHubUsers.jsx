import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaSync } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const BASE_MODULE_LABELS = new Set(['Shared Hub', 'White Label Hub'])

function formatUserModules(user) {
  const mods = user?.modules
  if (!mods) return '—'
  if (mods.unrestricted) return 'All hub modules'
  const labels = (mods.labels || []).filter((label) => !BASE_MODULE_LABELS.has(label))
  if (labels.length === 0) return 'Base hub only'
  return labels.join(', ')
}

function statusLabel(user) {
  if (user?.is_discontinued) return 'Discontinued'
  if (user?.is_suspended) return 'Suspended'
  return 'Active'
}

export default function AdminHubUsers({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub, isActingRemotely, roleLabel } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_view_hub_users')
  const apiOpts = { asPowerAdmin }

  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [meta, setMeta] = useState({ total: 0 })
  const [hubMeta, setHubMeta] = useState(null)
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const targetName = isActingRemotely
    ? actingHub?.name || hubMeta?.name || 'selected hub'
    : hubMeta?.name || 'this hub'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.hubUsers(
        {
          q: search || undefined,
          role: roleFilter || undefined,
          per_page: 100,
          page: 1,
        },
        apiOpts
      )
      setUsers(data.users || [])
      setRoles(data.roles || [])
      setMeta(data.meta || { total: 0 })
      setHubMeta(data.hub || null)
    } catch (err) {
      setError(err.message || 'Failed to load users.')
      setUsers([])
      setMeta({ total: 0 })
    } finally {
      setLoading(false)
    }
  }, [asPowerAdmin, search, roleFilter])

  useEffect(() => {
    if (hubLoading) return
    if (!enabled) {
      setLoading(false)
      return
    }
    load()
  }, [hubLoading, enabled, load, actingHub?.id, isActingRemotely])

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        filterValue: (row) => row.name || '',
        render: (row) => row.name || '—',
      },
      {
        key: 'email',
        label: 'Email',
        filterValue: (row) => row.email || '',
        render: (row) => row.email || '—',
      },
      {
        key: 'role',
        label: 'Role',
        filterValue: (row) => row.role_label || roleLabel(row.role) || row.role || '',
        render: (row) => row.role_label || roleLabel(row.role) || row.role || '—',
      },
      {
        key: 'firm',
        label: 'Firm',
        filterValue: (row) => row.firm?.name || '',
        render: (row) => row.firm?.name || '—',
      },
      {
        key: 'credits',
        label: 'Credits',
        filterValue: (row) =>
          row.has_unlimited_credits ? 'Unlimited' : String(row.credits ?? ''),
        render: (row) => (row.has_unlimited_credits ? 'Unlimited' : row.credits ?? 0),
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
        key: 'advisor',
        label: 'Advisor',
        filterValue: (row) => (row.is_advisor ? 'Yes' : 'No'),
        render: (row) => (row.is_advisor ? 'Yes' : 'No'),
      },
      {
        key: 'acting',
        label: 'Admin-staff acting',
        filterValue: (row) => (row.allows_admin_staff_acting ? 'Allowed' : 'No'),
        render: (row) => (row.allows_admin_staff_acting ? 'Allowed' : 'No'),
      },
      {
        key: 'status',
        label: 'Status',
        filterValue: (row) => statusLabel(row),
        render: (row) => {
          const label = statusLabel(row)
          const ok = label === 'Active'
          return <span className={`badge ${ok ? 'ok' : ''}`}>{label}</span>
        },
      },
      {
        key: 'created_at',
        label: 'Created',
        render: (row) => <DataGridDate value={row.created_at} />,
      },
      {
        key: 'updated_at',
        label: 'Updated',
        render: (row) => <DataGridDate value={row.updated_at} />,
      },
    ],
    [roleLabel]
  )

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
            {meta?.total != null ? ` · ${meta.total} total` : ''}.
          </p>
        </div>
        <div className="actions">
          <DataGridIconBtn icon={FaSync} label="Refresh" onClick={load} disabled={loading} />
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(searchDraft.trim())
        }}
      >
        <label>
          Search
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Name or email"
          />
        </label>
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
        <button type="submit" className="btn ghost" disabled={loading}>
          Apply
        </button>
      </form>

      <DataGrid
        columns={columns}
        rows={users}
        loading={loading}
        getRowKey={(row) => row.id}
        emptyMessage="No users found on this hub."
      />
    </section>
  )
}
