import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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

const emptyPackageForm = {
  name: '',
  description: '',
  amount: '',
  is_active: true,
  module_keys: [],
}

/** Product modules that can go in a package (base hub modules are never packaged). */
const DEFAULT_PACKAGEABLE_KEYS = [
  'module_social_media_template_library',
  'module_social_media_compliance',
  'module_website_template_library',
  'module_website_compliance',
  'module_general_compliance',
]

/** When selecting a dependent, also select its parents (mirrors backend). */
const PACKAGE_DEPS = {
  module_social_media_compliance: ['module_social_media_template_library'],
  module_website_compliance: ['module_website_template_library'],
}

function withPackageDependencies(keys) {
  const set = new Set(keys)
  for (const key of [...set]) {
    for (const dep of PACKAGE_DEPS[key] || []) set.add(dep)
  }
  return DEFAULT_PACKAGEABLE_KEYS.filter((k) => set.has(k))
}

export default function AdminModulePricing({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub } = useHub()
  const [pricing, setPricing] = useState([])
  const [packages, setPackages] = useState([])
  const [availableModuleKeys, setAvailableModuleKeys] = useState(DEFAULT_PACKAGEABLE_KEYS)
  const [tiers, setTiers] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [packageEditingId, setPackageEditingId] = useState(null)
  const [showPackageForm, setShowPackageForm] = useState(false)
  const [packageForm, setPackageForm] = useState(emptyPackageForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPackage, setSavingPackage] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [chargeEnabled, setChargeEnabled] = useState(null)
  const [recurringEnabled, setRecurringEnabled] = useState(null)
  const [targetHub, setTargetHub] = useState(null)

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_manage_module_pricing')
  const eyebrow = 'Modules'
  const apiOpts = { asPowerAdmin }

  const labelByKey = useMemo(() => {
    const map = {}
    for (const row of pricing) map[row.module_key] = row.label
    return map
  }, [pricing])

  const packageableModules = useMemo(() => {
    const keys = (availableModuleKeys?.length ? availableModuleKeys : DEFAULT_PACKAGEABLE_KEYS).filter(
      (k) => DEFAULT_PACKAGEABLE_KEYS.includes(k)
    )
    return keys.map((key) => ({
      key,
      label: labelByKey[key] || key,
    }))
  }, [availableModuleKeys, labelByKey])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [pricingData, packagesData] = await Promise.all([
        api.modulePricing(apiOpts),
        api.modulePackages(apiOpts).catch(() => null),
      ])
      setPricing(pricingData.pricing || [])
      setTiers(pricingData.recurring_tiers || [])
      setTargetHub(pricingData.target_hub || null)
      setChargeEnabled(Boolean(pricingData.target_hub?.charge_amount_per_module))
      setRecurringEnabled(Boolean(pricingData.target_hub?.charge_recurring_per_module))
      const pkgs = packagesData?.packages || pricingData.packages || []
      setPackages(pkgs)
      if (packagesData?.available_module_keys?.length) {
        setAvailableModuleKeys(packagesData.available_module_keys)
      }
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

  const resetPackageForm = () => {
    setPackageEditingId(null)
    setShowPackageForm(false)
    setPackageForm(emptyPackageForm)
  }

  const startCreatePackage = () => {
    setPackageEditingId(null)
    setPackageForm(emptyPackageForm)
    setShowPackageForm(true)
  }

  const startEditPackage = (pkg) => {
    setPackageEditingId(pkg.id)
    setPackageForm({
      name: pkg.name || '',
      description: pkg.description || '',
      amount: pkg.amount ?? '',
      is_active: !!pkg.is_active,
      module_keys: [...(pkg.module_keys || [])],
    })
    setShowPackageForm(true)
  }

  const togglePackageModule = (key, checked) => {
    setPackageForm((prev) => {
      let keys = new Set(prev.module_keys || [])
      if (checked) {
        keys.add(key)
        keys = new Set(withPackageDependencies([...keys]))
      } else {
        keys.delete(key)
        // Drop dependents that require this key.
        for (const [child, deps] of Object.entries(PACKAGE_DEPS)) {
          if (deps.includes(key)) keys.delete(child)
        }
      }
      return {
        ...prev,
        module_keys: DEFAULT_PACKAGEABLE_KEYS.filter((k) => keys.has(k)),
      }
    })
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

  const onSubmitPackage = async (e) => {
    e.preventDefault()
    if (!packageForm.module_keys?.length) {
      setError('Select at least one product module for the package.')
      return
    }
    setSavingPackage(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        name: packageForm.name.trim(),
        description: packageForm.description?.trim() || null,
        amount: Number(packageForm.amount || 0),
        is_active: !!packageForm.is_active,
        module_keys: withPackageDependencies(packageForm.module_keys),
      }
      if (packageEditingId) {
        await api.updateModulePackage(packageEditingId, payload, apiOpts)
        setMessage('Module package updated.')
      } else {
        await api.createModulePackage(payload, apiOpts)
        setMessage('Module package created.')
      }
      resetPackageForm()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingPackage(false)
    }
  }

  const onDeletePackage = async (pkg) => {
    if (!window.confirm(`Delete package “${pkg.name}”? Hubs using it will have it removed.`)) {
      return
    }
    setError('')
    setMessage('')
    try {
      await api.deleteModulePackage(pkg.id, apiOpts)
      setMessage('Module package deleted.')
      if (packageEditingId === pkg.id) resetPackageForm()
      await load()
    } catch (err) {
      setError(err.message)
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
            per-network / per-website / per-firm charges. Create packages to bundle product modules
            at a different one-time price — enable them on the{' '}
            <Link to="/my-dashboard/modules">Modules</Link> page.
          </p>
        </div>
      </div>

      {!loading && chargeEnabled === false && recurringEnabled === false && (
        <div className="alert">
          Both charge functionalities are off
          {targetHub?.name ? ` for ${targetHub.name}` : ' for this hub'} - enable one-time and/or
          recurring under Functionalities to generate invoices. Package catalogue can still be
          managed from Central.
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
            Recurring slot (1-3)
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
        <div className="page-head" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h2>Module packages</h2>
            <p className="muted">
              Bundle product modules at a package one-time price (can differ from the sum of
              individual catalogue prices). Base Shared / White Label Hub is never included.
              Dependencies are auto-added (e.g. Social Media Pre Approval includes Template Library).
            </p>
          </div>
          {!showPackageForm && (
            <button type="button" className="btn primary" onClick={startCreatePackage}>
              New package
            </button>
          )}
        </div>

        {showPackageForm && (
          <form className="admin-form" onSubmit={onSubmitPackage}>
            <h3>{packageEditingId ? 'Edit package' : 'New package'}</h3>
            <label>
              Name
              <input
                type="text"
                required
                maxLength={255}
                value={packageForm.name}
                onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
              />
            </label>
            <label>
              Description (optional)
              <textarea
                rows={2}
                maxLength={2000}
                value={packageForm.description}
                onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
              />
            </label>
            <label>
              Package one-time amount (£)
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={packageForm.amount}
                onChange={(e) => setPackageForm({ ...packageForm, amount: e.target.value })}
              />
            </label>
            <fieldset className="checklist-section" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend>
                <strong>Modules in package</strong>
              </legend>
              <p className="muted checklist-section-hint">
                Selecting a dependent module also selects its required parent.
              </p>
              <div className="checklist-grid">
                {packageableModules.map((mod) => (
                  <label key={mod.key} className="checklist-item">
                    <input
                      type="checkbox"
                      checked={(packageForm.module_keys || []).includes(mod.key)}
                      onChange={(e) => togglePackageModule(mod.key, e.target.checked)}
                    />
                    <span>
                      <strong>{mod.label}</strong>
                      <small className="muted">{mod.key}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="checklist-item">
              <input
                type="checkbox"
                checked={!!packageForm.is_active}
                onChange={(e) => setPackageForm({ ...packageForm, is_active: e.target.checked })}
              />
              Active (available on Modules page)
            </label>
            <div className="actions">
              <button className="btn primary" disabled={savingPackage}>
                {savingPackage
                  ? 'Saving...'
                  : packageEditingId
                    ? 'Update package'
                    : 'Create package'}
              </button>
              <button type="button" className="btn ghost" onClick={resetPackageForm}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="state">Loading...</div>
        ) : packages.length === 0 ? (
          <p className="muted">No packages yet. Create one to offer bundled module pricing.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Modules</th>
                  <th>Package price</th>
                  <th>Individual sum</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td>
                      <strong>{pkg.name}</strong>
                      {pkg.description ? (
                        <div className="muted" style={{ fontSize: '0.85em' }}>
                          {pkg.description}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {(pkg.modules || [])
                        .map((m) => m.label)
                        .join(', ') || (pkg.module_keys || []).join(', ')}
                    </td>
                    <td>{formatMoney(pkg.amount, pkg.currency)}</td>
                    <td>{formatMoney(pkg.individual_module_amount_sum || 0, pkg.currency)}</td>
                    <td>{pkg.is_active ? 'Yes' : 'No'}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => startEditPackage(pkg)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => onDeletePackage(pkg)}
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
                      {tier.max_users == null ? '+' : `-${tier.max_users}`}
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
