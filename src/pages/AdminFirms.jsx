import { useEffect, useMemo, useState } from 'react'
import { FaEdit, FaTrash } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridIconBtn } from '../components/DataGrid'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const emptyForm = {
  name: '',
  compliance_visible_to_own: true,
  compliance_visible_to_central: false,
  compliance_visible_to_firm_id: '',
}

const PER_PAGE = 100

function visibilityFromFirm(firm) {
  const vis = firm?.compliance_visibility || {}
  return {
    name: firm?.name || '',
    compliance_visible_to_own: vis.visible_to_own !== false,
    compliance_visible_to_central: Boolean(vis.visible_to_central),
    compliance_visible_to_firm_id: vis.visible_to_firm_id ? String(vis.visible_to_firm_id) : '',
  }
}

function checkAuthorityLabel(firm) {
  const vis = firm?.compliance_visibility || {}
  const bits = []
  if (vis.visible_to_own) bits.push('Within the Firm')
  if (vis.visible_to_central) bits.push("Central / Network's")
  if (vis.visible_to_firm?.name) bits.push(vis.visible_to_firm.name)
  return bits.length ? bits.join(', ') : 'No compliance check authority set'
}

export default function AdminFirms({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { actingHubId, isActingOnWhiteLabel, actingHub } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const apiOpts = { asPowerAdmin }

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

  const otherFirmOptions = useMemo(
    () => firmOptions.filter((f) => !f.is_central && f.id !== editingId),
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
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startEdit = (firm) => {
    setEditingId(firm.id)
    setForm(visibilityFromFirm(firm))
    setShowForm(true)
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
        compliance_visible_to_central: Boolean(form.compliance_visible_to_central),
        compliance_visible_to_firm_id: form.compliance_visible_to_firm_id
          ? Number(form.compliance_visible_to_firm_id)
          : null,
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
              : 'Firms'}
          </h1>
          <p className="muted">
            {isActingOnWhiteLabel
              ? `Managing Firms on ${actingHub?.name}. Switch hubs from the top bar.`
              : 'Manage Firms and who may review, approve, and see reports for each Firm’s compliance requests. Public registration does not ask for a Firm.'}
          </p>
        </div>
        {!showForm ? (
          <button type="button" className="btn primary" onClick={startCreate}>
            {isActingOnWhiteLabel ? `Add Firm on ${actingHub?.name || 'hub'}` : 'Add Firm'}
          </button>
        ) : null}
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {showForm ? (
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
            <legend style={{ padding: '0 0.35rem' }}>Compliance check authority</legend>
            <p className="muted" style={{ marginTop: 0 }}>
              Choose who can review, approve, and see reports for requests submitted by users of this
              Firm.
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
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.compliance_visible_to_central}
                onChange={(e) =>
                  setForm((f) => ({ ...f, compliance_visible_to_central: e.target.checked }))
                }
              />
              Central / Network&apos;s
            </label>
            <label>
              Another Firm&apos;s
              <select
                value={form.compliance_visible_to_firm_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, compliance_visible_to_firm_id: e.target.value }))
                }
              >
                <option value="">None</option>
                {otherFirmOptions.map((firm) => (
                  <option key={firm.id} value={firm.id}>
                    {firm.name}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving
                ? 'Saving...'
                : editingId
                  ? isEditingCentral
                    ? 'Update Central / Network'
                    : 'Update Firm'
                  : isActingOnWhiteLabel
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
                    <span className="muted"> · Central / Network</span>
                  ) : null}
                </strong>
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
              key: 'check_authority',
              label: 'Check authority',
              grow: true,
              filterValue: (row) => checkAuthorityLabel(row),
              render: (row) => checkAuthorityLabel(row),
            },
          ]}
          rows={firms}
          loading={loading}
          emptyMessage="No Firms yet. Add a Firm to get started. The Central / Network Firm is created automatically."
          getRowKey={(row) => row.id}
          actions={(row) => (
            <>
              <DataGridIconBtn icon={FaEdit} label="Edit" onClick={() => startEdit(row)} />
              {!row.is_central && row.id !== centralFirmId ? (
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
