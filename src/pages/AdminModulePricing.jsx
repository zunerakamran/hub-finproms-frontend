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
  recurring_amount: '',
  recurring_billing_unit: 'none',
  recurring_tier_slot: '',
  is_active: true,
}

export default function AdminModulePricing({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub } = useHub()
  const [pricing, setPricing] = useState([])
  const [tiers, setTiers] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [chargeEnabled, setChargeEnabled] = useState(null)
  const [recurringEnabled, setRecurringEnabled] = useState(null)
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
      setTiers(data.recurring_tiers || [])
      setTargetHub(data.target_hub || null)
      setChargeEnabled(Boolean(data.target_hub?.charge_amount_per_module))
      setRecurringEnabled(Boolean(data.target_hub?.charge_recurring_per_module))
    } catch (err) {
      setError(err.message)
      setChargeEnabled(null)
      setRecurringEnabled(null)
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
      recurring_amount: row.recurring_amount ?? 0,
      recurring_billing_unit: row.recurring_billing_unit || 'none',
      recurring_tier_slot: row.recurring_tier_slot ?? '',
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
          recurring_amount: Number(form.recurring_amount || 0),
          recurring_billing_unit: form.recurring_billing_unit,
          recurring_tier_slot: form.recurring_tier_slot === '' ? null : Number(form.recurring_tier_slot),
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
            <h1>Module prices</h1>
            <p className="muted">
              Enable &quot;Set module prices (one-time + recurring)&quot; for your role under Power
              Admin → Capabilities, and turn on Functionalities → Charge amount per module (one
              time) and/or Charge recurring amount per module.
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
          <h1>Module prices (one-time + recurring)</h1>
          <p className="muted">
            One-time prices on module enable; recurring catalogue + slot tables for per-user /
            per-network / per-website / per-firm charges.
          </p>
        </div>
      </div>

      {!loading && chargeEnabled === false && recurringEnabled === false && (
        <div className="alert">
          Both charge functionalities are off
          {targetHub?.name ? ` for ${targetHub.name}` : ' for this hub'} — enable one-time and/or
          recurring under Functionalities to generate invoices.
        </div>
      )}
      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {editingId && (
        <form className="admin-form" onSubmit={onSubmit}>
          <h2>Edit price</h2>
          <label>
            One-time amount (£)
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
            One-time billing unit
            <select
              value={form.billing_unit}
              onChange={(e) => setForm({ ...form, billing_unit: e.target.value })}
            >
              <option value="one_time">One time</option>
              <option value="per_website">Per website</option>
            </select>
          </label>
          <label>
            Recurring amount (£)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.recurring_amount}
              onChange={(e) => setForm({ ...form, recurring_amount: e.target.value })}
            />
          </label>
          <label>
            Recurring unit
            <select
              value={form.recurring_billing_unit}
              onChange={(e) => setForm({ ...form, recurring_billing_unit: e.target.value })}
            >
              <option value="none">None</option>
              <option value="per_network">Per network</option>
              <option value="per_adviser">Per adviser (slot)</option>
              <option value="per_user">Per user (slot)</option>
              <option value="per_website">Per website</option>
              <option value="per_firm">Per firm</option>
            </select>
          </label>
          <label>
            Recurring slot (1–3)
            <input
              type="number"
              min="1"
              max="3"
              value={form.recurring_tier_slot}
              onChange={(e) => setForm({ ...form, recurring_tier_slot: e.target.value })}
            />
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
                  <th>One-time</th>
                  <th>Recurring</th>
                  <th>Slot</th>
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
                    <td>
                      {formatMoney(row.amount, row.currency)}
                      <div className="muted" style={{ fontSize: '0.85em' }}>
                        {row.billing_unit_label || row.billing_unit}
                      </div>
                    </td>
                    <td>
                      {formatMoney(row.recurring_amount || 0, row.currency)}
                      <div className="muted" style={{ fontSize: '0.85em' }}>
                        {row.recurring_billing_unit || 'none'}
                      </div>
                    </td>
                    <td>{row.recurring_tier_slot || '—'}</td>
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

      <div className="advisor-list-block">
        <h2>Recurring slot tables</h2>
        <p className="muted">
          Rate from total active users with that module; import invoices charge rate × batch only.
        </p>
        {tiers.length === 0 ? (
          <p className="muted">No tiers seeded yet (run migrations).</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Users</th>
                  <th>Rate / user</th>
                  <th>Network margin</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => (
                  <tr key={tier.id}>
                    <td>#{tier.slot}</td>
                    <td>
                      {tier.min_users}
                      {tier.max_users == null ? '+' : `–${tier.max_users}`}
                    </td>
                    <td>{formatMoney(tier.rate_per_user)}</td>
                    <td>{formatMoney(tier.network_margin_per_user)}</td>
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
