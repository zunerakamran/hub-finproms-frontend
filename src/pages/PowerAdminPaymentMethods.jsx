import { useEffect, useState } from 'react'
import { api } from '../api/client'

const emptyMethods = {
  stripe: {
    enabled: false,
    configured: false,
    available: false,
    unavailable_reason: null,
    label: 'Card (Stripe)',
  },
  bank_transfer: {
    enabled: false,
    auto_confirm: true,
    available: false,
    unavailable_reason: null,
    label: 'Bank transfer',
  },
}

export default function PowerAdminPaymentMethods() {
  const [methods, setMethods] = useState(emptyMethods)
  const [stripeEnabled, setStripeEnabled] = useState(false)
  const [bankEnabled, setBankEnabled] = useState(false)
  const [bankAutoConfirm, setBankAutoConfirm] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const applyMethods = (next) => {
    const merged = {
      stripe: { ...emptyMethods.stripe, ...(next?.stripe || {}) },
      bank_transfer: { ...emptyMethods.bank_transfer, ...(next?.bank_transfer || {}) },
    }
    setMethods(merged)
    setStripeEnabled(Boolean(merged.stripe.enabled))
    setBankEnabled(Boolean(merged.bank_transfer.enabled))
    setBankAutoConfirm(Boolean(merged.bank_transfer.auto_confirm))
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.powerAdminPaymentMethods()
      applyMethods(data.payment_methods)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.updatePowerAdminPaymentMethods({
        stripe_enabled: stripeEnabled,
        bank_transfer_enabled: bankEnabled,
        bank_transfer_auto_confirm: bankAutoConfirm,
      })
      applyMethods(data.payment_methods)
      setMessage(data.message || 'Payment methods saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Power Admin</p>
          <h1>Payment methods</h1>
          <p className="muted">
            Control which checkout options members can use. Changes apply immediately across the hub.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <form className="admin-form payment-methods-form" onSubmit={onSubmit}>
          {error && <div className="alert">{error}</div>}
          {message && <div className="alert success">{message}</div>}

          <div className="payment-method-card">
            <div className="payment-method-card-head">
              <div>
                <h2>{methods.stripe.label}</h2>
                <p className="muted">Card payments via Stripe Checkout.</p>
              </div>
              <span className={`badge ${methods.stripe.available ? 'ok' : ''}`}>
                {methods.stripe.available ? 'Live for members' : 'Not available'}
              </span>
            </div>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={stripeEnabled}
                onChange={(e) => setStripeEnabled(e.target.checked)}
              />
              <span>Enable Stripe for members</span>
            </label>

            <p className="muted">
              Stripe keys configured: <strong>{methods.stripe.configured ? 'Yes' : 'No'}</strong>
              {!methods.stripe.configured &&
                ' — enable the toggle and add STRIPE_SECRET / STRIPE_KEY in the environment.'}
            </p>
            {methods.stripe.unavailable_reason && (
              <p className="field-hint">{methods.stripe.unavailable_reason}</p>
            )}
          </div>

          <div className="payment-method-card">
            <div className="payment-method-card-head">
              <div>
                <h2>{methods.bank_transfer.label}</h2>
                <p className="muted">Test / fallback bank transfer checkout.</p>
              </div>
              <span className={`badge ${methods.bank_transfer.available ? 'ok' : ''}`}>
                {methods.bank_transfer.available ? 'Live for members' : 'Not available'}
              </span>
            </div>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={bankEnabled}
                onChange={(e) => setBankEnabled(e.target.checked)}
              />
              <span>Enable bank transfer for members</span>
            </label>

            <label className={`toggle-row ${bankEnabled ? '' : 'is-disabled'}`}>
              <input
                type="checkbox"
                checked={bankAutoConfirm}
                disabled={!bankEnabled}
                onChange={(e) => setBankAutoConfirm(e.target.checked)}
              />
              <span>Auto-confirm bank transfers (grant credits immediately)</span>
            </label>

            <p className="muted">
              When auto-confirm is off, Client Admin must confirm pending bank transfers before
              credits are granted.
            </p>
          </div>

          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save payment methods'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
