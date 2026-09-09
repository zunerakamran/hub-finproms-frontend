import { useEffect, useState } from 'react'
import { api } from '../api/client'

const emptyMethods = {
  stripe: {
    enabled: false,
    configured: false,
    available: false,
    unavailable_reason: null,
    label: 'Card (Stripe)',
    key: '',
    secret_set: false,
    webhook_secret_set: false,
    currency: 'gbp',
    source: 'env',
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
  const [hubs, setHubs] = useState([])
  const [hubId, setHubId] = useState('')
  const [hub, setHub] = useState(null)
  const [methods, setMethods] = useState(emptyMethods)
  const [platformStripe, setPlatformStripe] = useState({
    key: '',
    secret_set: false,
    webhook_secret_set: false,
    currency: 'gbp',
    env_secret_set: false,
    env_webhook_set: false,
  })
  const [stripeEnabled, setStripeEnabled] = useState(false)
  const [bankEnabled, setBankEnabled] = useState(false)
  const [bankAutoConfirm, setBankAutoConfirm] = useState(true)
  const [platformForm, setPlatformForm] = useState({
    stripe_key: '',
    stripe_secret: '',
    stripe_webhook_secret: '',
    stripe_currency: 'gbp',
  })
  const [hubForm, setHubForm] = useState({
    hub_stripe_key: '',
    hub_stripe_secret: '',
    hub_stripe_webhook_secret: '',
    hub_stripe_currency: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const applyResponse = (data) => {
    const next = {
      stripe: { ...emptyMethods.stripe, ...(data?.payment_methods?.stripe || {}) },
      bank_transfer: { ...emptyMethods.bank_transfer, ...(data?.payment_methods?.bank_transfer || {}) },
    }
    setMethods(next)
    setStripeEnabled(Boolean(next.stripe.enabled))
    setBankEnabled(Boolean(next.bank_transfer.enabled))
    setBankAutoConfirm(Boolean(next.bank_transfer.auto_confirm))
    setHubs(data.hubs || [])
    setHub(data.hub || null)
    if (data.hub?.id) setHubId(String(data.hub.id))
    setPlatformStripe({
      key: data.platform_stripe?.key || '',
      secret_set: Boolean(data.platform_stripe?.secret_set),
      webhook_secret_set: Boolean(data.platform_stripe?.webhook_secret_set),
      currency: data.platform_stripe?.currency || 'gbp',
      env_secret_set: Boolean(data.platform_stripe?.env_secret_set),
      env_webhook_set: Boolean(data.platform_stripe?.env_webhook_set),
    })
    setPlatformForm((prev) => ({
      ...prev,
      stripe_key: data.platform_stripe?.key || '',
      stripe_currency: data.platform_stripe?.currency || 'gbp',
      stripe_secret: '',
      stripe_webhook_secret: '',
    }))
    setHubForm({
      hub_stripe_key: data.hub?.stripe?.key || '',
      hub_stripe_secret: '',
      hub_stripe_webhook_secret: '',
      hub_stripe_currency: data.hub?.stripe?.currency || '',
    })
  }

  const load = async (selectedHubId = hubId) => {
    setLoading(true)
    setError('')
    try {
      const data = await api.powerAdminPaymentMethods(selectedHubId || undefined)
      applyResponse(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onHubChange = async (id) => {
    setHubId(id)
    await load(id)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        hub_id: hubId ? Number(hubId) : undefined,
        stripe_enabled: stripeEnabled,
        bank_transfer_enabled: bankEnabled,
        bank_transfer_auto_confirm: bankAutoConfirm,
        stripe_key: platformForm.stripe_key,
        stripe_currency: platformForm.stripe_currency || 'gbp',
        hub_stripe_key: hubForm.hub_stripe_key,
        hub_stripe_currency: hubForm.hub_stripe_currency || null,
      }
      if (platformForm.stripe_secret.trim()) {
        payload.stripe_secret = platformForm.stripe_secret.trim()
      }
      if (platformForm.stripe_webhook_secret.trim()) {
        payload.stripe_webhook_secret = platformForm.stripe_webhook_secret.trim()
      }
      if (hubForm.hub_stripe_secret.trim()) {
        payload.hub_stripe_secret = hubForm.hub_stripe_secret.trim()
      }
      if (hubForm.hub_stripe_webhook_secret.trim()) {
        payload.hub_stripe_webhook_secret = hubForm.hub_stripe_webhook_secret.trim()
      }

      const data = await api.updatePowerAdminPaymentMethods(payload)
      applyResponse(data)
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
            Configure Stripe credentials and checkout options for the shared hub and each
            white-labelled hub. Hub values override platform defaults.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <form className="admin-form payment-methods-form" onSubmit={onSubmit}>
          {error && <div className="alert">{error}</div>}
          {message && <div className="alert success">{message}</div>}

          <label>
            Hub
            <select value={hubId} onChange={(e) => onHubChange(e.target.value)}>
              {hubs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.type === 'shared' ? 'Shared' : 'White-label'})
                </option>
              ))}
            </select>
          </label>

          <div className="payment-method-card">
            <div className="payment-method-card-head">
              <div>
                <h2>Platform Stripe defaults</h2>
                <p className="muted">
                  Used by all hubs unless a hub-specific override is set. Replaces editing
                  STRIPE_SECRET / STRIPE_WEBHOOK_SECRET in .env for day-to-day use.
                </p>
              </div>
              <span className={`badge ${methods.stripe.available ? 'ok' : ''}`}>
                {methods.stripe.available ? 'Live' : 'Not available'}
              </span>
            </div>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={stripeEnabled}
                onChange={(e) => setStripeEnabled(e.target.checked)}
              />
              <span>Enable Stripe payments</span>
            </label>

            <label>
              Publishable key (STRIPE_KEY)
              <input
                value={platformForm.stripe_key}
                onChange={(e) => setPlatformForm({ ...platformForm, stripe_key: e.target.value })}
                placeholder="pk_live_... or pk_test_..."
                autoComplete="off"
              />
            </label>
            <label>
              Secret key (STRIPE_SECRET)
              <input
                type="password"
                value={platformForm.stripe_secret}
                onChange={(e) =>
                  setPlatformForm({ ...platformForm, stripe_secret: e.target.value })
                }
                placeholder={
                  platformStripe.secret_set
                    ? '•••••••• (leave blank to keep current)'
                    : platformStripe.env_secret_set
                      ? 'Using .env — paste to store in dashboard'
                      : 'sk_live_... or sk_test_...'
                }
                autoComplete="new-password"
              />
            </label>
            <label>
              Webhook signing secret (STRIPE_WEBHOOK_SECRET)
              <input
                type="password"
                value={platformForm.stripe_webhook_secret}
                onChange={(e) =>
                  setPlatformForm({ ...platformForm, stripe_webhook_secret: e.target.value })
                }
                placeholder={
                  platformStripe.webhook_secret_set
                    ? '•••••••• (leave blank to keep current)'
                    : platformStripe.env_webhook_set
                      ? 'Using .env — paste to store in dashboard'
                      : 'whsec_...'
                }
                autoComplete="new-password"
              />
            </label>
            <label>
              Currency
              <input
                value={platformForm.stripe_currency}
                onChange={(e) =>
                  setPlatformForm({ ...platformForm, stripe_currency: e.target.value })
                }
                placeholder="gbp"
                maxLength={3}
              />
            </label>

            <p className="muted">
              Active source for selected hub: <strong>{methods.stripe.source}</strong>
              {' · '}
              Secret set:{' '}
              <strong>{methods.stripe.secret_set || platformStripe.env_secret_set ? 'Yes' : 'No'}</strong>
              {' · '}
              Webhook set:{' '}
              <strong>
                {methods.stripe.webhook_secret_set || platformStripe.env_webhook_set ? 'Yes' : 'No'}
              </strong>
            </p>
            {methods.stripe.unavailable_reason && (
              <p className="field-hint">{methods.stripe.unavailable_reason}</p>
            )}
          </div>

          <div className="payment-method-card">
            <div className="payment-method-card-head">
              <div>
                <h2>
                  Hub override
                  {hub ? `: ${hub.name}` : ''}
                </h2>
                <p className="muted">
                  Optional. Set different Stripe keys for this{' '}
                  {hub?.type === 'shared' ? 'shared' : 'white-labelled'} hub. Leave blank to use
                  platform defaults.
                </p>
              </div>
            </div>

            <label>
              Hub publishable key
              <input
                value={hubForm.hub_stripe_key}
                onChange={(e) => setHubForm({ ...hubForm, hub_stripe_key: e.target.value })}
                placeholder="Optional override"
                autoComplete="off"
              />
            </label>
            <label>
              Hub secret key
              <input
                type="password"
                value={hubForm.hub_stripe_secret}
                onChange={(e) => setHubForm({ ...hubForm, hub_stripe_secret: e.target.value })}
                placeholder={
                  hub?.stripe?.secret_set
                    ? '•••••••• (leave blank to keep current)'
                    : 'Optional override'
                }
                autoComplete="new-password"
              />
            </label>
            <label>
              Hub webhook signing secret
              <input
                type="password"
                value={hubForm.hub_stripe_webhook_secret}
                onChange={(e) =>
                  setHubForm({ ...hubForm, hub_stripe_webhook_secret: e.target.value })
                }
                placeholder={
                  hub?.stripe?.webhook_secret_set
                    ? '•••••••• (leave blank to keep current)'
                    : 'Optional override'
                }
                autoComplete="new-password"
              />
            </label>
            <label>
              Hub currency
              <input
                value={hubForm.hub_stripe_currency}
                onChange={(e) => setHubForm({ ...hubForm, hub_stripe_currency: e.target.value })}
                placeholder="Leave blank to use platform currency"
                maxLength={3}
              />
            </label>
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
              <span>Enable bank transfer</span>
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
