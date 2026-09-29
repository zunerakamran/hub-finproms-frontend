import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

function formatMoney(amount, currency = 'gbp') {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: (currency || 'gbp').toUpperCase(),
    }).format(Number(amount || 0))
  } catch {
    return `£${Number(amount || 0).toFixed(2)}`
  }
}

const emptyForm = {
  amount: '',
  billing_unit: 'one_time',
  is_active: true,
}

export default function AdminModulePricing({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub } = useHub()
  const [pricing, setPricing] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  // null = unknown until API returns (avoids a false "functionality off" flash)
  const [chargeEnabled, setChargeEnabled] = useState(null)
  const [targetHub, setTargetHub] = useState(null)

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_manage_module_pricing')
  const eyebrow = 'Modules'
  const apiOpts = { asPowerAdmin }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.modulePricing(apiOpts)
      setPricing(data.pricing || [])
      setTargetHub(data.target_hub || null)
      setChargeEnabled(Boolean(data.target_hub?.charge_amount_per_module))
    } catch (err) {
      setError(err.message)
      setChargeEnabled(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading) return
    if (!enabled) {
      setLoading(false)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, enabled, asPowerAdmin, actingHub?.id])

  const startEdit = (row) => {
    setEditingId(row.id)
    setForm({
      amount: row.amount,
      billing_unit: row.billing_unit || 'one_time',
      is_active: !!row.is_active,
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!editingId) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await api.updateModulePricing(
        editingId,
        {
          amount: Number(form.amount),
          billing_unit: form.billing_unit,
          is_active: !!form.is_active,
        },
        apiOpts
      )
      setMessage('Module pricing updated.')
      resetForm()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>Module one-time prices</h1>
            <p className="muted">
              Enable &quot;Set module one-time prices&quot; for your role under Power Admin →
              Capabilities, and turn on Functionalities → Charge amount per module (one time).
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>Module one-time prices</h1>
          <p className="muted">
            Catalogue prices charged when modules are enabled (one time), or per website for the
            Website Template Library. Editable with the Modules pricing capability.
          </p>
        </div>
      </div>

      {!loading && chargeEnabled === false && (
        <div className="alert">
          Functionality &quot;Charge amount per module (one time)&quot; is off
          {targetHub?.name ? ` for ${targetHub.name}` : ' for this hub'} — invoices will not be
          generated until it is enabled under Functionalities.
        </div>
      )}
      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {editingId && (
        <form className="admin-form" onSubmit={onSubmit}>
          <h2>Edit price</h2>
          <label>
            Amount (£)
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </label>
          <label>
            Billing unit
            <select
              value={form.billing_unit}
              onChange={(e) => setForm({ ...form, billing_unit: e.target.value })}
            >
              <option value="one_time">One time</option>
              <option value="per_website">Per website</option>
            </select>
          </label>
          <label className="checklist-item">
            <input
              type="checkbox"
              checked={!!form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Active
          </label>
          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Update price'}
            </button>
            <button type="button" className="btn ghost" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="advisor-list-block">
        <h2>Catalogue</h2>
        {loading ? (
          <div className="state">Loading...</div>
        ) : pricing.length === 0 ? (
          <p className="muted">No module prices configured.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Amount</th>
                  <th>Unit</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pricing.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.label}</strong>
                      <div className="muted" style={{ fontSize: '0.85em' }}>
                        {row.module_key}
                      </div>
                    </td>
                    <td>{formatMoney(row.amount, row.currency)}</td>
                    <td>{row.billing_unit_label || row.billing_unit}</td>
                    <td>{row.is_active ? 'Yes' : 'No'}</td>
                    <td className="actions">
                      <button type="button" className="btn ghost" onClick={() => startEdit(row)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
