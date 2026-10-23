import { useEffect, useMemo, useState } from 'react'
import { FaEdit, FaTrash, FaUserTie } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const emptyForm = {
  name: '',
  compliance_visible_to_own: true,
  compliance_authority_firm_ids: [],
}

const PER_PAGE = 50

function visibilityFromFirm(firm) {
  const vis = firm?.compliance_visibility || {}
  let authorityIds = Array.isArray(vis.authority_firm_ids)
    ? vis.authority_firm_ids.map(Number).filter((id) => Number.isFinite(id))
    : []
  // Legacy payloads: rebuild from central + single peer.
  if (!authorityIds.length) {
    if (vis.visible_to_central && firm?.central_firm_id) {
      authorityIds.push(Number(firm.central_firm_id))
    }
    if (vis.visible_to_firm_id) {
      authorityIds.push(Number(vis.visible_to_firm_id))
    }
  }
  return {
    name: firm?.name || '',
    compliance_visible_to_own: vis.visible_to_own !== false,
    compliance_authority_firm_ids: [...new Set(authorityIds)],
  }
}

function delegatedAccessLabel(firm) {
  const vis = firm?.compliance_visibility || {}
  const bits = []
  if (vis.visible_to_own) bits.push('Within the Firm')
  const authorities = Array.isArray(vis.authority_firms) ? vis.authority_firms : []
  if (authorities.length) {
    authorities.forEach((f) => {
      bits.push(f.is_central ? 'Central / Network' : f.name)
    })
  } else {
    if (vis.visible_to_central) bits.push('Central / Network')
    if (vis.visible_to_firm?.name) bits.push(vis.visible_to_firm.name)
  }
  return bits.length ? bits.join(', ') : 'No delegated compliance access set'
}

export default function AdminFirms({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { actingHubId, isActingRemotely, actingHub, can } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const apiOpts = { asPowerAdmin }
  const canManageFirms = can('dashboard_manage_firms')
  const canAssignHead = can('dashboard_assign_firm_head')

  const [firms, setFirms] = useState([])
  const [firmOptions, setFirmOptions] = useState([])
  const [centralFirmId, setCentralFirmId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [headFirmId, setHeadFirmId] = useState(null)
  const [headMembers, setHeadMembers] = useState([])
  const [headUserIds, setHeadUserIds] = useState([])
  const [savingHead, setSavingHead] = useState(false)

  const authorityFirmOptions = useMemo(
    () =>
      firmOptions.filter((f) => {
        if (editingId && Number(f.id) === Number(editingId)) return false
        return true
      }),
    [firmOptions, editingId]
  )

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.listFirms(
        {
          page: 1,
          per_page: PER_PAGE,
        },
        apiOpts
      )
      setFirms(data.firms || [])
      setFirmOptions(data.firm_options || data.firms || [])
      setCentralFirmId(data.central_firm_id ?? null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setHeadFirmId(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingHubId])

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(false)
  }

  const startCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
    setHeadFirmId(null)
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startEdit = (firm) => {
    setEditingId(firm.id)
    const next = visibilityFromFirm({ ...firm, central_firm_id: centralFirmId })
    // If API only returned visible_to_central without authority ids, add central id.
    if (
      firm?.compliance_visibility?.visible_to_central &&
      centralFirmId &&
      !next.compliance_authority_firm_ids.includes(Number(centralFirmId))
    ) {
      next.compliance_authority_firm_ids = [
        ...next.compliance_authority_firm_ids,
        Number(centralFirmId),
      ]
    }
    setForm(next)
    setShowForm(true)
    setHeadFirmId(null)
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleAuthorityFirm = (firmId) => {
    const id = Number(firmId)
    setForm((f) => {
      const current = Array.isArray(f.compliance_authority_firm_ids)
        ? f.compliance_authority_firm_ids
        : []
      return {
        ...f,
        compliance_authority_firm_ids: current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id],
      }
    })
  }

  const startAssignHead = async (firm) => {
    setShowForm(false)
    setHeadFirmId(firm.id)
    setHeadUserIds([])
    setMessage('')
    setError('')
    try {
      const data = await api.firmMembers(firm.id, apiOpts)
      const members = data.members || []
      setHeadMembers(members)
      const fromApi = Array.isArray(data.admin_user_ids)
        ? data.admin_user_ids.map(Number)
        : members.filter((m) => m.is_admin).map((m) => Number(m.id))
      setHeadUserIds(
        fromApi.length
          ? fromApi
          : firm.head_user_id
            ? [Number(firm.head_user_id)]
            : []
      )
    } catch (err) {
      setError(err.message)
      setHeadMembers([])
      setHeadUserIds([])
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleHeadUser = (memberId) => {
    const id = Number(memberId)
    setHeadUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        name: form.name.trim(),
        compliance_visible_to_own: Boolean(form.compliance_visible_to_own),
        compliance_authority_firm_ids: (form.compliance_authority_firm_ids || []).map(Number),
      }

      if (editingId) {
        const data = await api.updateFirm(editingId, payload, apiOpts)
        setMessage(data.message || 'Firm updated.')
        resetForm()
        await load()
      } else {
        const data = await api.createFirm(payload, apiOpts)
        setMessage(data.message || 'Firm created.')
        resetForm()
        await load()
      }
    } catch (err) {
      setError(err.data?.errors?.name?.[0] || err.data?.message || err.message)
    } finally {
      setSaving(false)
    }
  }

  const onAssignHead = async (e) => {
    e.preventDefault()
    if (!headFirmId) return
    setSavingHead(true)
    setError('')
    setMessage('')
    try {
      const data = await api.assignFirmHead(headFirmId, headUserIds, apiOpts)
      setMessage(data.message || 'Firm admins updated.')
      setHeadFirmId(null)
      await load()
    } catch (err) {
      setError(
        err.data?.errors?.head_user_ids?.[0] ||
          err.data?.errors?.head_user_id?.[0] ||
          err.data?.message ||
          err.message
      )
    } finally {
      setSavingHead(false)
    }
  }

  const deleteFirm = async (firm) => {
    if (!window.confirm(`Delete Firm “${firm.name}”?`)) return
    try {
      await api.deleteFirm(firm.id, apiOpts)
      if (editingId === firm.id) resetForm()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const editingFirm =
    firms.find((f) => f.id === editingId) || firmOptions.find((f) => f.id === editingId)
  const isEditingCentral = Boolean(
    editingFirm?.is_central || (editingId && editingId === centralFirmId)
  )
  const headFirm = firms.find((f) => f.id === headFirmId)
  const adminRoleLabel = headFirm?.is_central ? 'Network Admin' : 'Firm Admin'

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>
            {showForm
              ? editingId
                ? isEditingCentral
                  ? 'Edit Central / Network'
                  : 'Edit Firm'
                : 'Add Firm'
              : headFirmId
                ? `Update admins — ${headFirm?.name || ''}`
                : 'Firms'}
          </h1>
          <p className="muted">
            {isActingRemotely
              ? `Managing Firms on ${actingHub?.name}. Switch hubs from the top bar.`
              : 'Manage Firms, update each firm’s admins (Network Admin for Central / Network, Firm Admin for member firms — multiple allowed), and set who may review compliance requests.'}
          </p>
        </div>
        {!showForm && !headFirmId && canManageFirms ? (
          <button type="button" className="btn primary" onClick={startCreate}>
            {isActingRemotely ? `Add Firm on ${actingHub?.name || 'hub'}` : 'Add Firm'}
          </button>
        ) : null}
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {headFirmId ? (
        <form className="admin-form" onSubmit={onAssignHead}>
          <fieldset
            style={{
              border: '1px solid var(--border, #ddd)',
              borderRadius: 8,
              padding: '1rem',
              marginTop: 0,
            }}
          >
            <legend style={{ padding: '0 0.35rem' }}>Firm admins</legend>
            {headMembers.length === 0 ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                No users are assigned to this firm yet. Assign users to this firm first (Users /
                advisor import), then choose admins. Selected users receive the{' '}
                <strong>{adminRoleLabel}</strong> role.
              </p>
            ) : (
              <>
                <p className="muted" style={{ marginTop: 0 }}>
                  Select one or more members. Each checked user gets the{' '}
                  <strong>{adminRoleLabel}</strong> role (Document Repository full rights for this
                  firm). Unchecked users lose that role. Multiple admins are allowed.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {headMembers.map((member) => {
                    const id = Number(member.id)
                    return (
                      <label key={member.id} className="checkbox">
                        <input
                          type="checkbox"
                          checked={headUserIds.includes(id)}
                          onChange={() => toggleHeadUser(id)}
                        />
                        {member.name} ({member.email})
                      </label>
                    )
                  })}
                </div>
              </>
            )}
          </fieldset>
          <div className="actions">
            <button className="btn primary" disabled={savingHead || headMembers.length === 0}>
              {savingHead ? 'Saving…' : 'Save firm admins'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setHeadFirmId(null)}
              disabled={savingHead}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : showForm && canManageFirms ? (
        <form className="admin-form" onSubmit={onSubmit}>
          <label>
            {isEditingCentral ? 'Central / Network name' : 'Firm name'}
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={isEditingCentral ? 'Enter Central / Network name' : 'Enter Firm name'}
            />
          </label>

          <fieldset
            style={{
              border: '1px solid var(--border, #ddd)',
              borderRadius: 8,
              padding: '1rem',
              marginTop: '1rem',
            }}
          >
            <legend style={{ padding: '0 0.35rem' }}>Delegated compliance access</legend>
            <p className="muted" style={{ marginTop: 0 }}>
              Choose which firms (including Central / Network) may review, assign, see reports, and
              see audit trails for requests submitted by users of this firm. Access is one-way only.
            </p>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.compliance_visible_to_own}
                onChange={(e) =>
                  setForm((f) => ({ ...f, compliance_visible_to_own: e.target.checked }))
                }
              />
              Within the Firm
            </label>
            {authorityFirmOptions.length === 0 ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                No other firms yet. Add more firms to delegate access.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                {authorityFirmOptions.map((firm) => {
                  const id = Number(firm.id)
                  const checked = (form.compliance_authority_firm_ids || []).includes(id)
                  return (
                    <label key={firm.id} className="checkbox">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAuthorityFirm(id)}
                      />
                      {firm.name}
                      {firm.is_central || id === Number(centralFirmId) ? (
                        <span className="muted"> (Central / Network)</span>
                      ) : null}
                    </label>
                  )
                })}
              </div>
            )}
          </fieldset>

          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving
                ? 'Saving...'
                : editingId
                  ? isEditingCentral
                    ? 'Update Central / Network'
                    : 'Update Firm'
                  : isActingRemotely
                    ? `Add Firm on ${actingHub?.name || 'hub'}`
                    : 'Add Firm'}
            </button>
            <button type="button" className="btn ghost" onClick={resetForm} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <DataGrid
          columns={[
            {
              key: 'name',
              label: 'Name',
              grow: true,
              filterValue: (row) => row.name,
              render: (row) => (
                <strong>
                  {row.name}
                  {row.is_central || row.id === centralFirmId ? (
                    <span className="muted"> | Central / Network</span>
                  ) : null}
                </strong>
              ),
            },
            {
              key: 'head',
              label: 'Firm admin',
              grow: true,
              filterValue: (row) => row.head_user?.name || '',
              render: (row) =>
                row.head_user ? (
                  <span>
                    {row.head_user.name}
                    <span className="muted">
                      {' '}
                      | {row.is_central || row.id === centralFirmId ? 'Network Admin' : 'Firm Admin'}
                      {' | '}
                      {row.head_user.email}
                    </span>
                  </span>
                ) : (
                  <span className="muted">Not assigned</span>
                ),
            },
            {
              key: 'users_count',
              label: 'Users',
              fit: true,
              filterValue: (row) => String(row.users_count || 0),
              render: (row) =>
                `${row.users_count || 0} user${(row.users_count || 0) === 1 ? '' : 's'}`,
            },
            {
              key: 'delegated_access',
              label: 'Delegated access',
              grow: true,
              filterValue: (row) => delegatedAccessLabel(row),
              render: (row) => delegatedAccessLabel(row),
            },
          ]}
          rows={firms}
          loading={loading}
          emptyMessage="No Firms yet. Add a Firm to get started. The Central / Network Firm is created automatically."
          getRowKey={(row) => row.id}
          actions={(row) => (
            <>
              {canAssignHead ? (
                <DataGridIconBtn
                  icon={FaUserTie}
                  label="Update admins of this firm"
                  onClick={() => startAssignHead(row)}
                />
              ) : null}
              {canManageFirms ? (
                <DataGridIconBtn icon={FaEdit} label="Edit" onClick={() => startEdit(row)} />
              ) : null}
              {canManageFirms && !row.is_central && row.id !== centralFirmId ? (
                <DataGridIconBtn
                  icon={FaTrash}
                  label="Delete"
                  variant="danger"
                  onClick={() => deleteFirm(row)}
                />
              ) : null}
            </>
          )}
        />
      )}
    </section>
  )
}
