import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const emptyForm = {
  name: '',
  description: '',
  overview: '',
  features: '',
  benefits: '',
  price: '',
  credits: '',
  duration_days: 30,
  is_active: true,
  image: null,
}

function linesToList(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function listToLines(list) {
  if (!Array.isArray(list)) return ''
  return list.join('\n')
}

function formatLastUpdated(value) {
  if (!value) return null
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function draftKey(shell) {
  return `hub-finproms:admin-plans-draft:${shell}`
}

function readDraft(shell) {
  try {
    const raw = sessionStorage.getItem(draftKey(shell))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function writeDraft(shell, payload) {
  try {
    sessionStorage.setItem(draftKey(shell), JSON.stringify(payload))
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function clearDraft(shell) {
  try {
    sessionStorage.removeItem(draftKey(shell))
  } catch {
    // ignore
  }
}

export default function AdminPlans({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_manage_plans')
  const eyebrow = asPowerAdmin ? 'Power Admin' : 'Client Admin'
  const apiOpts = { asPowerAdmin }

  const draft = useMemo(() => readDraft(shell), [shell])
  const [plans, setPlans] = useState([])
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    ...(draft?.form || {}),
    image: null,
  }))
  const [editingId, setEditingId] = useState(() => draft?.editingId ?? null)
  const [existingImageUrl, setExistingImageUrl] = useState(() => draft?.existingImageUrl ?? null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const hasLoadedRef = useRef(false)

  const imagePreviewUrl = useMemo(() => {
    if (form.image) return URL.createObjectURL(form.image)
    return existingImageUrl
  }, [form.image, existingImageUrl])

  useEffect(() => {
    if (!form.image || !imagePreviewUrl) return undefined
    return () => URL.revokeObjectURL(imagePreviewUrl)
  }, [form.image, imagePreviewUrl])

  // Persist in-progress form so leaving the page / remounting does not wipe fields.
  useEffect(() => {
    const isDirty =
      editingId != null ||
      Object.entries(form).some(([key, value]) => {
        if (key === 'image') return false
        return String(value ?? '') !== String(emptyForm[key] ?? '')
      })

    if (!isDirty) {
      clearDraft(shell)
      return
    }

    writeDraft(shell, {
      editingId,
      existingImageUrl,
      form: {
        name: form.name,
        description: form.description,
        overview: form.overview,
        features: form.features,
        benefits: form.benefits,
        price: form.price,
        credits: form.credits,
        duration_days: form.duration_days,
        is_active: form.is_active,
      },
    })
  }, [shell, form, editingId, existingImageUrl])

  const load = async ({ silent = false } = {}) => {
    if (!enabled) {
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    setError('')
    try {
      const data = await api.adminPlans(apiOpts)
      setPlans(data.plans || [])
      hasLoadedRef.current = true
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading || !enabled) return
    // Fetch once when the page becomes ready — do not re-fetch on hub re-renders.
    if (hasLoadedRef.current) return
    load({ silent: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, enabled, asPowerAdmin])

  const reset = () => {
    setForm(emptyForm)
    setEditingId(null)
    setExistingImageUrl(null)
    clearDraft(shell)
  }

  const toFormData = () => {
    const fd = new FormData()
    fd.append('name', form.name.trim())
    fd.append('description', form.description.trim())
    fd.append('overview', form.overview.trim())
    fd.append('features', JSON.stringify(linesToList(form.features)))
    fd.append('benefits', JSON.stringify(linesToList(form.benefits)))
    fd.append('price', String(Number(form.price)))
    fd.append('credits', String(Number(form.credits)))
    fd.append('duration_days', String(Number(form.duration_days)))
    fd.append('is_active', form.is_active ? '1' : '0')
    if (form.image) fd.append('image', form.image)
    return fd
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = toFormData()
      if (editingId) {
        await api.updatePlan(editingId, payload, apiOpts)
        setMessage('Plan updated.')
      } else {
        await api.createPlan(payload, apiOpts)
        setMessage('Plan created.')
      }
      reset()
      await load({ silent: true })
    } catch (err) {
      const firstError =
        err.data?.errors?.name?.[0] ||
        err.data?.errors?.price?.[0] ||
        err.data?.errors?.credits?.[0] ||
        err.data?.errors?.duration_days?.[0] ||
        err.data?.errors?.image?.[0] ||
        err.data?.errors?.features?.[0] ||
        err.data?.errors?.benefits?.[0] ||
        err.message
      setError(firstError)
    } finally {
      setSaving(false)
    }
  }

  const edit = (plan) => {
    setEditingId(plan.id)
    setExistingImageUrl(plan.image_url || null)
    setForm({
      name: plan.name || '',
      description: plan.description || '',
      overview: plan.overview || '',
      features: listToLines(plan.features),
      benefits: listToLines(plan.benefits),
      price: String(plan.price ?? ''),
      credits: String(plan.credits ?? ''),
      duration_days: plan.duration_days || 30,
      is_active: plan.is_active !== false,
      image: null,
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
      await api.deletePlan(id, apiOpts)
      setMessage('Plan deleted.')
      if (editingId === id) reset()
      await load({ silent: true })
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
            <h1>Subscription plans</h1>
            <p className="muted">
              Managing subscription plans is disabled for your role on this hub. Enable
              &quot;Manage subscription plans&quot; under Power Admin → Capabilities.
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
              placeholder="Basic, Standard, Premium..."
            />
          </label>
          <label>
            Price (GBP)
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
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Short summary shown with the plan..."
          />
        </label>
        <label>
          Overview
          <textarea
            rows={3}
            value={form.overview}
            onChange={(e) => setForm({ ...form, overview: e.target.value })}
            placeholder="Longer overview of what this subscription offers..."
          />
        </label>
        <div className="form-grid">
          <label>
            Features (one per line)
            <textarea
              rows={5}
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
              placeholder={'90 credits per month\nAccess to shared FinProms library'}
            />
          </label>
          <label>
            Benefits (one per line)
            <textarea
              rows={5}
              value={form.benefits}
              onChange={(e) => setForm({ ...form, benefits: e.target.value })}
              placeholder={'Affordable entry point\nPredictable monthly credits'}
            />
          </label>
        </div>
        <label>
          Plan image
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })}
          />
          <span className="field-hint">JPG, PNG, GIF or WebP. Max 5MB.</span>
        </label>
        {(form.image || existingImageUrl) && (
          <div className="plan-image-preview">
            <img src={imagePreviewUrl} alt="Plan preview" />
          </div>
        )}
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Active (visible on public Plans page)
        </label>
        <div className="actions">
          <button type="submit" className="btn primary" disabled={saving}>
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
              {plan.image_url ? (
                <img className="admin-thumb" src={plan.image_url} alt="" />
              ) : (
                <div className="admin-thumb plan-thumb-fallback" aria-hidden>
                  {plan.name?.[0] || '?'}
                </div>
              )}
              <div>
                <strong>{plan.name}</strong>
                <p className="muted">
                  £{Number(plan.price).toFixed(2)} · {plan.credits} credits · {plan.duration_days}{' '}
                  days · {plan.is_active ? 'Active' : 'Inactive'}
                </p>
                {plan.overview && <p className="muted plan-overview-snip">{plan.overview}</p>}
                {formatLastUpdated(plan.last_updated) && (
                  <p className="field-hint">Last updated: {formatLastUpdated(plan.last_updated)}</p>
                )}
              </div>
              <div className="actions">
                <button type="button" className="btn ghost" onClick={() => edit(plan)}>
                  Edit
                </button>
                <button type="button" className="btn danger" onClick={() => remove(plan.id)}>
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
