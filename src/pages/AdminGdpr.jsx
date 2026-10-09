import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaDownload, FaSearch, FaUserSlash } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
import { useHub } from '../context/HubContext'

export default function AdminGdpr() {
  const { can, loading: hubLoading, actingHub, isActingRemotely, roleLabel } = useHub()
  const enabled = can('dashboard_manage_gdpr')

  const [q, setQ] = useState('')
  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState({ total: 0 })
  const [hubMeta, setHubMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [exportingId, setExportingId] = useState(null)
  const [erasingId, setErasingId] = useState(null)

  const targetName = isActingRemotely
    ? actingHub?.name || hubMeta?.name || 'selected hub'
    : hubMeta?.name || 'this hub'

  const load = useCallback(async (search = q) => {
    setLoading(true)
    setError('')
    try {
      const data = await api.gdprUsers({
        q: search || undefined,
        per_page: 50,
        page: 1,
      })
      setUsers(data.users || [])
      setMeta(data.meta || { total: 0 })
      setHubMeta(data.hub || null)
    } catch (err) {
      setError(err.message || 'Failed to load users.')
      setUsers([])
      setMeta({ total: 0 })
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    if (hubLoading) return
    if (!enabled) {
      setLoading(false)
      return
    }
    load('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, enabled, actingHub?.id, isActingRemotely])

  const onSearch = (e) => {
    e.preventDefault()
    load(q)
  }

  const onExport = async (user) => {
    if (!user?.id) return
    setExportingId(user.id)
    setError('')
    setMessage('')
    try {
      await api.gdprExportUser(user.id)
      setMessage(`Downloaded subject-access export for ${user.email || user.name}.`)
    } catch (err) {
      setError(err.message || 'Export failed.')
    } finally {
      setExportingId(null)
    }
  }

  const onErase = async (user) => {
    if (!user?.id || user.gdpr_erased_at) return
    const typed = window.prompt(
      `UK GDPR erasure anonymises ${user.name} (${user.email}).\n\n` +
        'Audit events are kept with anonymised identity. Historical backups may still contain personal data until pruned.\n\n' +
        'Type ERASE to confirm.'
    )
    if (typed !== 'ERASE') {
      setMessage('Erasure cancelled.')
      return
    }
    setErasingId(user.id)
    setError('')
    setMessage('')
    try {
      const data = await api.gdprEraseUser(user.id)
      setMessage(data.message || 'User anonymised.')
      await load(q)
    } catch (err) {
      setError(err.message || 'Erasure failed.')
    } finally {
      setErasingId(null)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        filterValue: (row) => row.name || '',
        render: (row) => (
          <span>
            {row.name || '—'}
            {row.gdpr_erased_at ? (
              <span className="muted" style={{ marginLeft: 8 }}>
                (erased)
              </span>
            ) : null}
          </span>
        ),
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
        filterValue: (row) => roleLabel?.(row.role) || row.role || '',
        render: (row) => roleLabel?.(row.role) || row.role || '—',
      },
      {
        key: 'firm',
        label: 'Firm',
        filterValue: (row) => row.firm?.name || '',
        render: (row) => row.firm?.name || '—',
      },
    ],
    [roleLabel]
  )

  if (hubLoading) {
    return (
      <div className="admin-page">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  if (!enabled) {
    return (
      <div className="admin-page">
        <p className="muted">You do not have permission to manage GDPR data requests.</p>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>GDPR / data requests</h1>
          <p className="muted">
            Search users on <strong>{targetName}</strong>. Export a subject-access JSON package, or
            erase (anonymise) personal data while keeping FCA-style audit events. Aim to fulfil
            requests within 30 days. Passwords and payment secrets are never exported.
          </p>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <form onSubmit={onSearch} className="stack-form" style={{ marginBottom: '1rem', maxWidth: 480 }}>
        <label className="admin-field">
          <span className="field-label-text">Search name or email</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. jane@firm.com"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn primary" disabled={loading}>
              <FaSearch style={{ marginRight: 6 }} />
              Search
            </button>
          </div>
        </label>
      </form>

      <DataGrid
        columns={columns}
        rows={users}
        loading={loading}
        getRowKey={(row) => row.id}
        emptyMessage="No users found."
        actions={(user) => (
          <>
            <DataGridIconBtn
              icon={FaDownload}
              label={exportingId === user.id ? 'Exporting…' : 'Download GDPR JSON export'}
              disabled={exportingId === user.id || erasingId === user.id}
              onClick={() => onExport(user)}
            />
            <DataGridIconBtn
              icon={FaUserSlash}
              label={
                user.gdpr_erased_at
                  ? 'Already erased'
                  : erasingId === user.id
                    ? 'Erasing…'
                    : 'Erase / anonymise (UK GDPR)'
              }
              variant="danger"
              disabled={Boolean(user.gdpr_erased_at) || erasingId === user.id || exportingId === user.id}
              onClick={() => onErase(user)}
            />
          </>
        )}
      />

      <p className="muted" style={{ marginTop: '0.75rem' }}>
        Showing {users.length} of {meta.total || 0} user(s). Historical hub backups may still
        contain personal data until retention prune.
      </p>
    </div>
  )
}
