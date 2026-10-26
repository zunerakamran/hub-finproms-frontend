import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { normalizeBillingUnit, unitLabel } from '../utils/moduleBillingUnits'

const PER_USER_UNITS = new Set(['per_user', 'per_user_slots'])

function isPerUserUnit(unit, { forRecurring = false } = {}) {
  return PER_USER_UNITS.has(normalizeBillingUnit(unit, { forRecurring }))
}

function formatMoney(amount, currency = 'gbp') {
  if (amount == null || amount === '') return '—'
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: (currency || 'gbp').toUpperCase(),
    }).format(Number(amount || 0))
  } catch {
    return `£${Number(amount || 0).toFixed(2)}`
  }
}

function rowAllowsOneTime(row) {
  if (typeof row?.allows_one_time === 'boolean') return row.allows_one_time
  return isPerUserUnit(row?.main_pricing?.billing_unit)
}

function rowAllowsRecurring(row) {
  if (typeof row?.allows_recurring === 'boolean') return row.allows_recurring
  return isPerUserUnit(row?.main_pricing?.recurring_billing_unit, { forRecurring: true })
}

export default function AdminResellerModulePricing({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub } = useHub()
  const [pricing, setPricing] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [note, setNote] = useState('')
  const [networkResells, setNetworkResells] = useState(false)
  const [targetHub, setTargetHub] = useState(null)
  const [drafts, setDrafts] = useState({})

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_manage_reseller_module_pricing')
  const apiOpts = { asPowerAdmin }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.resellerModulePricing(apiOpts)
      const rows = data.pricing || []
      setPricing(rows)
      setNetworkResells(Boolean(data.network_resells))
      setNote(data.message || '')
      setTargetHub(data.target_hub || null)
      const next = {}
      rows.forEach((row) => {
        next[row.module_key] = {
          amount: row.amount != null ? String(row.amount) : '',
          recurring_amount: row.recurring_amount != null ? String(row.recurring_amount) : '',
          is_active: row.is_active !== false,
        }
      })
      setDrafts(next)
    } catch (err) {
      setError(err.message)
      setPricing([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, enabled, asPowerAdmin, actingHub?.id])

  const saveRow = async (moduleKey) => {
    const row = pricing.find((r) => r.module_key === moduleKey)
    const draft = drafts[moduleKey] || {}
    const payload = {
      is_active: Boolean(draft.is_active),
    }
    if (rowAllowsOneTime(row)) {
      payload.amount = draft.amount === '' ? 0 : Number(draft.amount)
    }
    if (rowAllowsRecurring(row)) {
      payload.recurring_amount = draft.recurring_amount === '' ? 0 : Number(draft.recurring_amount)
    }

    setSavingKey(moduleKey)
    setError('')
    setMessage('')
    try {
      const data = await api.updateResellerModulePricing(moduleKey, payload, apiOpts)
      setMessage(data.message || 'Saved.')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingKey('')
    }
  }

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Modules</p>
            <h1>Reseller module prices</h1>
            <p className="muted">
              Enable &quot;Set reseller module prices&quot; under Capabilities, and turn on Network
              resells in Module invoice settings.
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
          <h1>Reseller module prices</h1>
          <p className="muted">
            Amounts users pay the network
            {targetHub?.name ? ` on ${targetHub.name}` : ''}. Only modules whose{' '}
            <Link to="/my-dashboard/module-pricing">Module prices</Link> use per user / per user
            (slots) appear. Edit user one-time only when the main one-time unit is per user; edit
            recurring only when the main recurring unit is per user. The network still pays FinProms
            at the main Module prices. Configure Network resells and branding under{' '}
            <Link to="/my-dashboard/module-invoice-settings">Module invoice settings</Link>.
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}
      {!loading && note && <div className="alert">{note}</div>}
      {!loading && !networkResells && !note && (
        <div className="alert">
          Network resells is off — turn it on under Module invoice settings to edit these prices.
        </div>
      )}

      {loading ? (
        <div className="state">Loading...</div>
      ) : pricing.length === 0 ? (
        <div className="state">
          No per-user modules on this hub yet. Set a main Module price unit to per user / per user
          (slots) first.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Main unit (FinProms)</th>
                <th>Main one-time</th>
                <th>Main recurring</th>
                <th>User one-time</th>
                <th>User recurring</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pricing.map((row) => {
                const draft = drafts[row.module_key] || {}
                const main = row.main_pricing || {}
                const allowOneTime = rowAllowsOneTime(row)
                const allowRecurring = rowAllowsRecurring(row)
                return (
                  <tr key={row.module_key}>
                    <td>
                      <strong>{row.label || row.module_key}</strong>
                      <div className="muted">{row.module_key}</div>
                    </td>
                    <td>
                      <div>{unitLabel(main.billing_unit)}</div>
                      <div className="muted">{unitLabel(main.recurring_billing_unit)}</div>
                    </td>
                    <td>{formatMoney(main.amount, main.currency)}</td>
                    <td>{formatMoney(main.recurring_amount, main.currency)}</td>
                    <td>
                      {allowOneTime ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={!networkResells}
                          value={draft.amount ?? ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.module_key]: { ...draft, amount: e.target.value },
                            }))
                          }
                        />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {allowRecurring ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={!networkResells}
                          value={draft.recurring_amount ?? ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.module_key]: { ...draft, recurring_amount: e.target.value },
                            }))
                          }
                        />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        disabled={!networkResells}
                        checked={draft.is_active !== false}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.module_key]: { ...draft, is_active: e.target.checked },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn primary"
                        disabled={!networkResells || savingKey === row.module_key}
                        onClick={() => saveRow(row.module_key)}
                      >
                        {savingKey === row.module_key ? 'Saving…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
