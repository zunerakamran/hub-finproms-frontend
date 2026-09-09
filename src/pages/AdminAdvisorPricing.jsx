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
  label: '',
  min_advisors: 1,
  rate_per_advisor: '',
  is_active: true,
  sort_order: 0,
}

export default function AdminAdvisorPricing({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const [tiers, setTiers] = useState([])
  const [quote, setQuote] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_manage_advisor_pricing')
  const eyebrow = asPowerAdmin ? 'Power Admin' : 'Client Admin'
  const apiOpts = { asPowerAdmin }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.advisorPricing(apiOpts)
      setTiers(data.tiers || [])
      setQuote(data.current_quote || null)
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
  }, [hubLoading, enabled, asPowerAdmin])

  const startEdit = (tier) => {
    setEditingId(tier.id)
    setForm({
      label: tier.label || '',
      min_advisors: tier.min_advisors,
      rate_per_advisor: tier.rate_per_advisor,
      is_active: !!tier.is_active,
      sort_order: tier.sort_order ?? 0,
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        ...form,
        min_advisors: Number(form.min_advisors),
        rate_per_advisor: Number(form.rate_per_advisor),
        sort_order: Number(form.sort_order || 0),
      }
      if (editingId) {
        await api.updateAdvisorPricing(editingId, payload, apiOpts)
        setMessage('Tier updated.')
      } else {
        await api.createAdvisorPricing(payload, apiOpts)
        setMessage('Tier created.')
      }
      resetForm()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id) => {
    if (!window.confirm('Delete this pricing tier?')) return
    setError('')
    try {
      await api.deleteAdvisorPricing(id, apiOpts)
      setMessage('Tier deleted.')
      if (editingId === id) resetForm()
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
            <h1>Advisor billing rates</h1>
            <p className="muted">
              Enable &quot;Set advisor billing rates / quotas&quot; for your role under Power Admin →
              Capabilities.
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
          <h1>Advisor billing rates / quotas</h1>
          <p className="muted">
            Set the rate that applies by advisor headcount. Billing uses{' '}
            <strong>rate × advisors</strong>. The active tier is the highest min-advisors threshold
            the current count meets.
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {quote && (
        <div className="import-result" style={{ marginBottom: '1.5rem' }}>
          <h2>Current hub quote</h2>
          <p className="muted">
            {quote.advisor_count} advisors × {formatMoney(quote.rate_per_advisor, quote.currency)} ={' '}
            <strong>{formatMoney(quote.amount, quote.currency)}</strong>
            {quote.tier?.label ? ` (${quote.tier.label})` : ''}
          </p>
        </div>
      )}

      <form className="admin-form" onSubmit={onSubmit}>
        <h2>{editingId ? 'Edit tier' : 'Add tier'}</h2>
        <label>
          Label
          <input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Growth (100+)"
          />
        </label>
        <label>
          Min advisors
          <input
            type="number"
            min="1"
            required
            value={form.min_advisors}
            onChange={(e) => setForm({ ...form, min_advisors: e.target.value })}
          />
        </label>
        <label>
          Rate per advisor (£)
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={form.rate_per_advisor}
            onChange={(e) => setForm({ ...form, rate_per_advisor: e.target.value })}
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
            {saving ? 'Saving...' : editingId ? 'Update tier' : 'Add tier'}
          </button>
          {editingId && (
            <button type="button" className="btn ghost" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="advisor-list-block">
        <h2>Tiers</h2>
        {loading ? (
          <div className="state">Loading...</div>
        ) : tiers.length === 0 ? (
          <p className="muted">No tiers yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Min advisors</th>
                  <th>Rate / advisor</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => (
                  <tr key={tier.id}>
                    <td>{tier.label || '—'}</td>
                    <td>{tier.min_advisors}+</td>
                    <td>{formatMoney(tier.rate_per_advisor)}</td>
                    <td>{tier.is_active ? 'Yes' : 'No'}</td>
                    <td className="actions">
                      <button type="button" className="btn ghost" onClick={() => startEdit(tier)}>
                        Edit
                      </button>
                      <button type="button" className="btn ghost" onClick={() => onDelete(tier.id)}>
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
