import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const emptyForm = {
  hub_stripe_key: '',
  hub_stripe_secret: '',
  hub_stripe_webhook_secret: '',
  hub_stripe_currency: 'gbp',
  clear_hub_stripe_secret: false,
  clear_hub_stripe_webhook_secret: false,
}

export default function AdminNetworkStripe({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub } = useHub()
  const [form, setForm] = useState(emptyForm)
  const [stripe, setStripe] = useState(null)
  const [hubMeta, setHubMeta] = useState(null)
  const [networkResells, setNetworkResells] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [note, setNote] = useState('')

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_manage_network_stripe')
  const apiOpts = { asPowerAdmin }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.networkStripe(apiOpts)
      setNetworkResells(Boolean(data.network_resells))
      setNote(data.message || '')
      setHubMeta(data.hub || null)
      const s = data.hub?.stripe || {}
      setStripe(s)
      setForm({
        hub_stripe_key: s.key || '',
        hub_stripe_secret: '',
        hub_stripe_webhook_secret: '',
        hub_stripe_currency: s.currency || 'gbp',
        clear_hub_stripe_secret: false,
        clear_hub_stripe_webhook_secret: false,
      })
    } catch (err) {
      setError(err.message)
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

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        hub_stripe_key: form.hub_stripe_key,
        hub_stripe_currency: form.hub_stripe_currency,
      }
      if (form.hub_stripe_secret) payload.hub_stripe_secret = form.hub_stripe_secret
      if (form.hub_stripe_webhook_secret) {
        payload.hub_stripe_webhook_secret = form.hub_stripe_webhook_secret
      }
      if (form.clear_hub_stripe_secret) payload.clear_hub_stripe_secret = true
      if (form.clear_hub_stripe_webhook_secret) payload.clear_hub_stripe_webhook_secret = true

      const data = await api.updateNetworkStripe(payload, apiOpts)
      setMessage(data.message || 'Saved.')
      setStripe(data.hub?.stripe || null)
      setHubMeta(data.hub || null)
      setForm((prev) => ({
        ...prev,
        hub_stripe_secret: '',
        hub_stripe_webhook_secret: '',
        clear_hub_stripe_secret: false,
        clear_hub_stripe_webhook_secret: false,
        hub_stripe_key: data.hub?.stripe?.key || prev.hub_stripe_key,
        hub_stripe_currency: data.hub?.stripe?.currency || prev.hub_stripe_currency,
      }))
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
            <p className="eyebrow">Modules</p>
            <h1>Network Stripe</h1>
            <p className="muted">
              Enable &quot;Manage network Stripe keys&quot; under Capabilities, and turn on Network
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
          <h1>Network Stripe</h1>
          <p className="muted">
            Stripe account that receives user payments when the network resells
            {hubMeta?.name ? ` on ${hubMeta.name}` : ''}. FinProms still charges the network on the
            platform Stripe keys. Settings:{' '}
            <Link to="/my-dashboard/module-invoice-settings">Module invoice settings</Link>. Prices:{' '}
            <Link to="/my-dashboard/reseller-module-pricing">Reseller module prices</Link>.
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}
      {note && <div className="alert">{note}</div>}

      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <form className="admin-form" onSubmit={onSubmit}>
          <p className="muted">
            Secret set: {stripe?.secret_set ? 'yes' : 'no'} · Webhook secret set:{' '}
            {stripe?.webhook_secret_set ? 'yes' : 'no'}
          </p>

          <label>
            Publishable key
            <input
              value={form.hub_stripe_key}
              disabled={!networkResells || saving}
              onChange={(e) => setForm((p) => ({ ...p, hub_stripe_key: e.target.value }))}
              placeholder="pk_live_… or pk_test_…"
              autoComplete="off"
            />
          </label>

          <label>
            Secret key {stripe?.secret_set ? '(leave blank to keep current)' : ''}
            <input
              type="password"
              value={form.hub_stripe_secret}
              disabled={!networkResells || saving}
              onChange={(e) => setForm((p) => ({ ...p, hub_stripe_secret: e.target.value }))}
              placeholder="sk_live_… or sk_test_…"
              autoComplete="new-password"
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              disabled={!networkResells || saving}
              checked={form.clear_hub_stripe_secret}
              onChange={(e) =>
                setForm((p) => ({ ...p, clear_hub_stripe_secret: e.target.checked }))
              }
            />
            Clear stored secret
          </label>

          <label>
            Webhook secret {stripe?.webhook_secret_set ? '(leave blank to keep current)' : ''}
            <input
              type="password"
              value={form.hub_stripe_webhook_secret}
              disabled={!networkResells || saving}
              onChange={(e) =>
                setForm((p) => ({ ...p, hub_stripe_webhook_secret: e.target.value }))
              }
              placeholder="whsec_…"
              autoComplete="new-password"
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              disabled={!networkResells || saving}
              checked={form.clear_hub_stripe_webhook_secret}
              onChange={(e) =>
                setForm((p) => ({ ...p, clear_hub_stripe_webhook_secret: e.target.checked }))
              }
            />
            Clear stored webhook secret
          </label>

          <label>
            Currency
            <input
              value={form.hub_stripe_currency}
              disabled={!networkResells || saving}
              onChange={(e) =>
                setForm((p) => ({ ...p, hub_stripe_currency: e.target.value.toLowerCase() }))
              }
              maxLength={3}
            />
          </label>

          <div className="actions">
            <button className="btn primary" type="submit" disabled={!networkResells || saving}>
              {saving ? 'Saving…' : 'Save network Stripe'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
