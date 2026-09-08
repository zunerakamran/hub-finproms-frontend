import { useEffect, useState } from 'react'
import { api } from '../api/client'

const emptyForm = {
  name: '',
  description: '',
  price: '',
  credits: '',
  duration_days: 30,
  is_active: true,
}

export default function AdminPlans() {
  const [plans, setPlans] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.adminPlans()
      setPlans(data.plans || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const reset = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const payload = () => ({
    name: form.name.trim(),
    description: form.description.trim() || null,
    price: Number(form.price),
    credits: Number(form.credits),
    duration_days: Number(form.duration_days),
    is_active: form.is_active,
  })

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (editingId) {
        await api.updatePlan(editingId, payload())
        setMessage('Plan updated.')
      } else {
        await api.createPlan(payload())
        setMessage('Plan created.')
      }
      reset()
      await load()
    } catch (err) {
      const firstError =
        err.data?.errors?.name?.[0] ||
        err.data?.errors?.price?.[0] ||
        err.data?.errors?.credits?.[0] ||
        err.data?.errors?.duration_days?.[0] ||
        err.message
      setError(firstError)
    } finally {
      setSaving(false)
    }
  }

  const edit = (plan) => {
    setEditingId(plan.id)
    setForm({
      name: plan.name || '',
      description: plan.description || '',
      price: String(plan.price ?? ''),
      credits: String(plan.credits ?? ''),
      duration_days: plan.duration_days || 30,
      is_active: plan.is_active !== false,
    })
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this subscription plan?')) return
    setError('')
    setMessage('')
    try {
      await api.deletePlan(id)
      setMessage('Plan deleted.')
      if (editingId === id) reset()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client Admin</p>
          <h1>{editingId ? 'Edit plan' : 'Subscription plans'}</h1>
          <p className="muted">Create credit packages users can buy on the Plans page.</p>
        </div>
      </div>

      <form className="admin-form" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <div className="form-grid">
          <label>
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Starter, Pro..."
            />
          </label>
          <label>
            Price (USD)
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </label>
          <label>
            Credits
            <input
              type="number"
              min="1"
              required
              value={form.credits}
              onChange={(e) => setForm({ ...form, credits: e.target.value })}
            />
          </label>
          <label>
            Duration (days)
            <input
              type="number"
              min="1"
              required
              value={form.duration_days}
              onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
            />
          </label>
        </div>
        <label>
          Description
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What this plan includes..."
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Active (visible on public Plans page)
        </label>
        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update plan' : 'Add plan'}
          </button>
          {editingId && (
            <button type="button" className="btn ghost" onClick={reset}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 className="section-title">Existing plans</h2>
      {loading ? (
        <div className="state">Loading...</div>
      ) : plans.length === 0 ? (
        <div className="state">No plans yet. Add one above.</div>
      ) : (
        <div className="admin-list">
          {plans.map((plan) => (
            <div key={plan.id} className="admin-row">
              <div>
                <strong>{plan.name}</strong>
                <p className="muted">
                  ${Number(plan.price).toFixed(2)} · {plan.credits} credits · {plan.duration_days}{' '}
                  days · {plan.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="actions">
                <button className="btn ghost" onClick={() => edit(plan)}>
                  Edit
                </button>
                <button className="btn danger" onClick={() => remove(plan.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
