import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import {
  DEFAULT_BILLING_UNITS,
  DEFAULT_RECURRING_BILLING_UNITS,
  normalizeBillingUnit,
  unitDescription,
  unitLabel,
  unitRequiresTierSlot,
} from '../utils/moduleBillingUnits'

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

function hubTypeLabel(type) {
  if (type === 'central') return 'Central Hub Controller'
  if (type === 'white_label') return 'White Label Hub'
  if (type === 'shared') return 'Shared Hub'
  return type || 'this hub'
}

const emptyForm = {
  amount: '',
  billing_unit: 'per_network',
  recurring_amount: '',
  recurring_billing_unit: 'none',
  recurring_tier_slot: '',
  is_active: true,
}

const emptyTierForm = {
  slot: '1',
  min_users: '0',
  max_users: '',
  rate_per_user: '',
  network_margin_per_user: '0',
  sort_order: '0',
  is_active: true,
}

export default function AdminModulePricing({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub, hub } = useHub()
  const [pricing, setPricing] = useState([])
  const [tiers, setTiers] = useState([])
  const [billingUnits, setBillingUnits] = useState(DEFAULT_BILLING_UNITS)
  const [recurringBillingUnits, setRecurringBillingUnits] = useState(
    DEFAULT_RECURRING_BILLING_UNITS
  )
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [tierEditingId, setTierEditingId] = useState(null)
  const [showTierForm, setShowTierForm] = useState(false)
  const [tierForm, setTierForm] = useState(emptyTierForm)
  const [savingTier, setSavingTier] = useState(false)
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
  const displayType = targetHub?.type || actingHub?.type || hub?.type

  const oneTimeNeedsSlot = unitRequiresTierSlot(form.billing_unit, billingUnits)
  const recurringNeedsSlot = unitRequiresTierSlot(
    form.recurring_billing_unit,
    recurringBillingUnits
  )
  const showSlotField = oneTimeNeedsSlot || recurringNeedsSlot

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.modulePricing(apiOpts)
      setPricing(data.pricing || [])
      setTiers(data.recurring_tiers || [])
      if (data.billing_units?.length) setBillingUnits(data.billing_units)
      if (data.recurring_billing_units?.length) {
        setRecurringBillingUnits(data.recurring_billing_units)
      }
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
      billing_unit: normalizeBillingUnit(row.billing_unit || 'per_network'),
      recurring_amount: row.recurring_amount ?? 0,
      recurring_billing_unit: normalizeBillingUnit(row.recurring_billing_unit || 'none', {
        forRecurring: true,
      }),
      recurring_tier_slot: row.recurring_tier_slot ?? '',
      is_active: !!row.is_active,
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const resetTierForm = () => {
    setTierEditingId(null)
    setShowTierForm(false)
    setTierForm(emptyTierForm)
  }

  const startCreateTier = () => {
    setTierEditingId(null)
    setTierForm(emptyTierForm)
    setShowTierForm(true)
  }

  const startEditTier = (tier) => {
    setTierEditingId(tier.id)
    setTierForm({
      slot: String(tier.slot ?? 1),
      min_users: String(tier.min_users ?? 0),
      max_users: tier.max_users == null ? '' : String(tier.max_users),
      rate_per_user: String(tier.rate_per_user ?? ''),
      network_margin_per_user: String(tier.network_margin_per_user ?? 0),
      sort_order: String(tier.sort_order ?? 0),
      is_active: !!tier.is_active,
    })
    setShowTierForm(true)
  }

  const onSubmitTier = async (e) => {
    e.preventDefault()
    setSavingTier(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        slot: Number(tierForm.slot),
        min_users: Number(tierForm.min_users || 0),
        max_users:
          tierForm.max_users === '' || tierForm.max_users == null
            ? null
            : Number(tierForm.max_users),
        rate_per_user: Number(tierForm.rate_per_user || 0),
        network_margin_per_user: Number(tierForm.network_margin_per_user || 0),
        sort_order: Number(tierForm.sort_order || 0),
        is_active: !!tierForm.is_active,
      }
      if (tierEditingId) {
        await api.updateModuleRecurringTier(tierEditingId, payload, apiOpts)
        setMessage('Recurring tier updated.')
      } else {
        await api.createModuleRecurringTier(payload, apiOpts)
        setMessage('Recurring tier created.')
      }
      resetTierForm()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingTier(false)
    }
  }

  const onDeleteTier = async (tier) => {
    const range =
      tier.max_users == null
        ? `${tier.min_users}+`
        : `${tier.min_users}-${tier.max_users}`
    if (
      !window.confirm(
        `Delete slot #${tier.slot} band (${range} users @ ${formatMoney(tier.rate_per_user)})?`
      )
    ) {
      return
    }
    setError('')
    setMessage('')
    try {
      await api.deleteModuleRecurringTier(tier.id, apiOpts)
      setMessage('Recurring tier deleted.')
      if (tierEditingId === tier.id) resetTierForm()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!editingId) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const needsSlot =
        unitRequiresTierSlot(form.billing_unit, billingUnits) ||
        unitRequiresTierSlot(form.recurring_billing_unit, recurringBillingUnits)
      await api.updateModulePricing(
        editingId,
        {
          amount: Number(form.amount),
          billing_unit: form.billing_unit,
          recurring_amount: Number(form.recurring_amount || 0),
          recurring_billing_unit: form.recurring_billing_unit,
          recurring_tier_slot:
            needsSlot && form.recurring_tier_slot !== ''
              ? Number(form.recurring_tier_slot)
              : needsSlot
                ? null
                : form.recurring_tier_slot === ''
                  ? null
                  : Number(form.recurring_tier_slot),
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
            Catalogue for <strong>{targetHub?.name || actingHub?.name || hub?.name || 'this hub'}</strong>
            {displayType ? ` (${hubTypeLabel(displayType)})` : ''}: only modules that apply to this
            hub type are listed. One-time and ongoing use the same units (per network / firm /
            user / user slots / website). Bundled pricing is managed on{' '}
            <Link to="/my-dashboard/module-packages">Module packages</Link>.
          </p>
        </div>
      </div>

      {!loading && chargeEnabled === false && recurringEnabled === false && (
        <div className="alert">
          Both charge functionalities are off
          {targetHub?.name ? ` for ${targetHub.name}` : ' for this hub'} - enable one-time and/or
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
              {billingUnits.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {unitDescription(form.billing_unit, billingUnits) ? (
              <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                {unitDescription(form.billing_unit, billingUnits)}
              </small>
            ) : null}
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
              {recurringBillingUnits.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {unitDescription(form.recurring_billing_unit, recurringBillingUnits) ? (
              <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                {unitDescription(form.recurring_billing_unit, recurringBillingUnits)}
              </small>
            ) : null}
          </label>
          {showSlotField && (
            <label>
              Tier slot (1–3)
              <input
                type="number"
                min="1"
                max="3"
                required={showSlotField}
                value={form.recurring_tier_slot}
                onChange={(e) => setForm({ ...form, recurring_tier_slot: e.target.value })}
              />
              <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                Required when one-time or recurring unit is Per user (slots). Uses the matching
                slot table below.
              </small>
            </label>
          )}
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
        <h2>Catalogue for {hubTypeLabel(displayType)}</h2>
        {loading ? (
          <div className="state">Loading...</div>
        ) : pricing.length === 0 ? (
          <p className="muted">No module prices for this hub type.</p>
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
                        {row.billing_unit_label ||
                          unitLabel(row.billing_unit, billingUnits)}
                      </div>
                    </td>
                    <td>
                      {formatMoney(row.recurring_amount || 0, row.currency)}
                      <div className="muted" style={{ fontSize: '0.85em' }}>
                        {row.recurring_billing_unit_label ||
                          unitLabel(row.recurring_billing_unit, recurringBillingUnits)}
                      </div>
                    </td>
                    <td>{row.recurring_tier_slot || '-'}</td>
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
        <div className="page-head" style={{ marginBottom: 12 }}>
          <div>
            <h2>Recurring slot tables</h2>
            <p className="muted">
              Used when unit is <strong>Per user (slots)</strong>. Rate from total active users
              with that module; import invoices charge rate × batch only. Leave max users blank
              for “and above”.
            </p>
          </div>
          {!showTierForm && (
            <button type="button" className="btn primary" onClick={startCreateTier}>
              Add tier band
            </button>
          )}
        </div>

        {showTierForm && (
          <form className="admin-form" onSubmit={onSubmitTier}>
            <h3>{tierEditingId ? 'Edit tier band' : 'New tier band'}</h3>
            <label>
              Slot (1–3)
              <select
                value={tierForm.slot}
                onChange={(e) => setTierForm({ ...tierForm, slot: e.target.value })}
                required
              >
                <option value="1">Slot #1</option>
                <option value="2">Slot #2</option>
                <option value="3">Slot #3</option>
              </select>
            </label>
            <label>
              Min users
              <input
                type="number"
                min="0"
                required
                value={tierForm.min_users}
                onChange={(e) => setTierForm({ ...tierForm, min_users: e.target.value })}
              />
            </label>
            <label>
              Max users (blank = onwards)
              <input
                type="number"
                min="0"
                value={tierForm.max_users}
                onChange={(e) => setTierForm({ ...tierForm, max_users: e.target.value })}
              />
            </label>
            <label>
              Rate / user (£)
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={tierForm.rate_per_user}
                onChange={(e) => setTierForm({ ...tierForm, rate_per_user: e.target.value })}
              />
            </label>
            <label>
              Network margin / user (£)
              <input
                type="number"
                min="0"
                step="0.01"
                value={tierForm.network_margin_per_user}
                onChange={(e) =>
                  setTierForm({ ...tierForm, network_margin_per_user: e.target.value })
                }
              />
            </label>
            <label>
              Sort order
              <input
                type="number"
                min="0"
                value={tierForm.sort_order}
                onChange={(e) => setTierForm({ ...tierForm, sort_order: e.target.value })}
              />
            </label>
            <label className="checklist-item">
              <input
                type="checkbox"
                checked={!!tierForm.is_active}
                onChange={(e) => setTierForm({ ...tierForm, is_active: e.target.checked })}
              />
              Active
            </label>
            <div className="actions">
              <button className="btn primary" disabled={savingTier}>
                {savingTier
                  ? 'Saving...'
                  : tierEditingId
                    ? 'Update tier'
                    : 'Create tier'}
              </button>
              <button type="button" className="btn ghost" onClick={resetTierForm}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {tiers.length === 0 ? (
          <p className="muted">No tiers yet. Add a band for slot 1–3.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Users</th>
                  <th>Rate / user</th>
                  <th>Network margin</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => (
                  <tr key={tier.id}>
                    <td>#{tier.slot}</td>
                    <td>
                      {tier.min_users}
                      {tier.max_users == null ? '+' : `-${tier.max_users}`}
                    </td>
                    <td>{formatMoney(tier.rate_per_user)}</td>
                    <td>{formatMoney(tier.network_margin_per_user)}</td>
                    <td>{tier.is_active ? 'Yes' : 'No'}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => startEditTier(tier)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => onDeleteTier(tier)}
                      >
                        Delete
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
