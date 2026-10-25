import { useEffect, useMemo, useState } from 'react'
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

const emptyPackageForm = {
  name: '',
  description: '',
  amount: '',
  billing_unit: 'per_network',
  recurring_amount: '',
  recurring_billing_unit: 'none',
  recurring_tier_slot: '',
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

const PACKAGE_MODULE_LABELS = {
  module_social_media_template_library: 'Social Media Template Library',
  module_social_media_compliance: 'Social Media Pre Approval Workflow',
  module_website_template_library: 'Website Template Library',
  module_website_compliance: 'Website Content Pre Approval Workflow',
  module_general_compliance: 'Generic Content Pre Approval Workflow',
}

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

export default function AdminModulePackages({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub } = useHub()
  const [packages, setPackages] = useState([])
  const [availableModuleKeys, setAvailableModuleKeys] = useState(DEFAULT_PACKAGEABLE_KEYS)
  const [billingUnits, setBillingUnits] = useState(DEFAULT_BILLING_UNITS)
  const [recurringBillingUnits, setRecurringBillingUnits] = useState(
    DEFAULT_RECURRING_BILLING_UNITS
  )
  const [packageEditingId, setPackageEditingId] = useState(null)
  const [showPackageForm, setShowPackageForm] = useState(false)
  const [packageForm, setPackageForm] = useState(emptyPackageForm)
  const [loading, setLoading] = useState(true)
  const [savingPackage, setSavingPackage] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_manage_module_packages')
  const apiOpts = { asPowerAdmin }

  const oneTimeNeedsSlot = unitRequiresTierSlot(packageForm.billing_unit, billingUnits)
  const recurringNeedsSlot = unitRequiresTierSlot(
    packageForm.recurring_billing_unit,
    recurringBillingUnits
  )
  const showSlotField = oneTimeNeedsSlot || recurringNeedsSlot

  const packageableModules = useMemo(() => {
    const keys = (availableModuleKeys?.length ? availableModuleKeys : DEFAULT_PACKAGEABLE_KEYS).filter(
      (k) => DEFAULT_PACKAGEABLE_KEYS.includes(k)
    )
    return keys.map((key) => ({
      key,
      label: PACKAGE_MODULE_LABELS[key] || key,
    }))
  }, [availableModuleKeys])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.modulePackages(apiOpts)
      setPackages(data.packages || [])
      if (data.available_module_keys?.length) {
        setAvailableModuleKeys(data.available_module_keys)
      }
      if (data.billing_units?.length) setBillingUnits(data.billing_units)
      if (data.recurring_billing_units?.length) {
        setRecurringBillingUnits(data.recurring_billing_units)
      }
    } catch (err) {
      setError(err.message)
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
      billing_unit: normalizeBillingUnit(pkg.billing_unit || 'per_network'),
      recurring_amount: pkg.recurring_amount ?? '',
      recurring_billing_unit: normalizeBillingUnit(pkg.recurring_billing_unit || 'none', {
        forRecurring: true,
      }),
      recurring_tier_slot: pkg.recurring_tier_slot ?? '',
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
      const needsSlot =
        unitRequiresTierSlot(packageForm.billing_unit, billingUnits) ||
        unitRequiresTierSlot(packageForm.recurring_billing_unit, recurringBillingUnits)
      const payload = {
        name: packageForm.name.trim(),
        description: packageForm.description?.trim() || null,
        amount: Number(packageForm.amount || 0),
        billing_unit: packageForm.billing_unit || 'per_network',
        recurring_amount: Number(packageForm.recurring_amount || 0),
        recurring_billing_unit: packageForm.recurring_billing_unit || 'none',
        recurring_tier_slot:
          needsSlot && packageForm.recurring_tier_slot !== '' && packageForm.recurring_tier_slot != null
            ? Number(packageForm.recurring_tier_slot)
            : null,
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
            <p className="eyebrow">Modules</p>
            <h1>Module packages</h1>
            <p className="muted">
              Enable &quot;Manage module packages&quot; for your role under Power Admin →
              Capabilities (Modules pricing group).
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
          <p className="eyebrow">Modules</p>
          <h1>Module packages</h1>
          <p className="muted">
            Bundle product modules with one-time and recurring package prices using the same units
            as single modules (per network / firm / user / user slots / website). While a package
            is enabled, it replaces individual catalogue charges for covered modules. Enable
            packages on the <Link to="/my-dashboard/modules">Modules</Link> page. Per-module
            catalogue stays under <Link to="/my-dashboard/module-pricing">Module prices</Link>.
          </p>
        </div>
        {!showPackageForm && (
          <button type="button" className="btn primary" onClick={startCreatePackage}>
            New package
          </button>
        )}
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {showPackageForm && (
        <form className="admin-form" onSubmit={onSubmitPackage}>
          <h2>{packageEditingId ? 'Edit package' : 'New package'}</h2>
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
          <label>
            One-time billing unit
            <select
              value={packageForm.billing_unit}
              onChange={(e) => setPackageForm({ ...packageForm, billing_unit: e.target.value })}
            >
              {billingUnits.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {unitDescription(packageForm.billing_unit, billingUnits) ? (
              <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                {unitDescription(packageForm.billing_unit, billingUnits)}
              </small>
            ) : null}
          </label>
          <label>
            Recurring amount (£)
            <input
              type="number"
              min="0"
              step="0.01"
              value={packageForm.recurring_amount}
              onChange={(e) => setPackageForm({ ...packageForm, recurring_amount: e.target.value })}
            />
          </label>
          <label>
            Recurring unit
            <select
              value={packageForm.recurring_billing_unit}
              onChange={(e) =>
                setPackageForm({ ...packageForm, recurring_billing_unit: e.target.value })
              }
            >
              {recurringBillingUnits.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {unitDescription(packageForm.recurring_billing_unit, recurringBillingUnits) ? (
              <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                {unitDescription(packageForm.recurring_billing_unit, recurringBillingUnits)}
              </small>
            ) : null}
          </label>
          {showSlotField && (
            <label>
              Tier slot number
              <input
                type="number"
                min="1"
                max="255"
                required={showSlotField}
                value={packageForm.recurring_tier_slot}
                onChange={(e) =>
                  setPackageForm({ ...packageForm, recurring_tier_slot: e.target.value })
                }
              />
              <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                Required when unit is Per user (slots). Use any slot number defined under Module
                prices → Recurring slot tables (you can create new slots there).
              </small>
            </label>
          )}
          <fieldset className="checklist-section" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend>
              <strong>Modules in package</strong>
            </legend>
            <p className="muted checklist-section-hint">
              Base Shared / White Label Hub is never included. Selecting a dependent module also
              selects its required parent.
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

      <div className="advisor-list-block">
        <h2>Catalogue packages</h2>
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
                  <th>One-time</th>
                  <th>Recurring</th>
                  <th>Slot</th>
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
                    <td>
                      {formatMoney(pkg.amount, pkg.currency)}
                      <div className="muted" style={{ fontSize: '0.85em' }}>
                        {pkg.billing_unit_label || unitLabel(pkg.billing_unit, billingUnits)}
                      </div>
                    </td>
                    <td>
                      {formatMoney(pkg.recurring_amount || 0, pkg.currency)}
                      <div className="muted" style={{ fontSize: '0.85em' }}>
                        {pkg.recurring_billing_unit_label ||
                          unitLabel(pkg.recurring_billing_unit, recurringBillingUnits)}
                      </div>
                    </td>
                    <td>{pkg.recurring_tier_slot || '-'}</td>
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
    </section>
  )
}
