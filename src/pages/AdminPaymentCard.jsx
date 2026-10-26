import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'

function formatCard(card) {
  if (!card) return null
  const brand = card.brand ? String(card.brand).toUpperCase() : 'Card'
  const last4 = card.last4 ? `•••• ${card.last4}` : 'on file'
  const exp =
    card.exp_month && card.exp_year
      ? ` | exp ${String(card.exp_month).padStart(2, '0')}/${card.exp_year}`
      : ''
  return `${brand} ${last4}${exp}`
}

export default function AdminPaymentCard() {
  const { canManagePaymentCard, can, loading: hubLoading } = useHub()
  const [params, setParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [scopes, setScopes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const enabledScopes = useMemo(
    () => (scopes || []).filter((s) => s.enabled),
    [scopes]
  )

  const scope = useMemo(() => {
    const fromUrl = params.get('scope')
    if (fromUrl && enabledScopes.some((s) => s.scope === fromUrl)) return fromUrl
    if (enabledScopes[0]?.scope) return enabledScopes[0].scope
    if (can('dashboard_manage_network_payment_card')) return 'network'
    if (can('dashboard_manage_firm_payment_card')) return 'firm'
    return 'network'
  }, [params, enabledScopes, can])

  const load = async (nextScope = scope) => {
    setLoading(true)
    setError('')
    try {
      const data = await api.paymentCard({ scope: nextScope })
      setProfile(data.payment_profile)
      setScopes(data.available_scopes || [])
    } catch (err) {
      setError(err.message)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading) return
    if (!canManagePaymentCard) {
      setLoading(false)
      return
    }
    load(scope)
    if (params.get('canceled') === '1') {
      setMessage('Card setup canceled. No changes were saved.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, canManagePaymentCard, scope])

  const onSetup = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.setupPaymentCard({ scope })
      if (data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }
      setError('Stripe did not return a checkout URL.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && !canManagePaymentCard) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Modules</p>
            <h1>Payment card</h1>
            <p className="muted">
              Enable &quot;Add network payment card&quot; and/or &quot;Add firm payment card&quot; under
              Capabilities. Personal cards are on{' '}
              <Link to="/my-dashboard/my-payment-method">My payment method</Link>
              {' '}(when Users pay own is on).
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
          <h1>Network / firm payment card</h1>
          <p className="muted">
            Network card is charged when the network pays module invoices (and advisor imports). Firm
            card is available while Firms pay own is on. Your personal card lives under{' '}
            <Link to="/my-dashboard/my-payment-method">My payment method</Link>
            {' '}(when Users pay own is on).
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {enabledScopes.length > 1 ? (
        <div className="actions" style={{ marginBottom: 16 }}>
          {enabledScopes.map((s) => (
            <button
              key={s.scope}
              type="button"
              className={`btn ${scope === s.scope ? 'primary' : 'ghost'}`}
              onClick={() => {
                const next = new URLSearchParams(params)
                next.set('scope', s.scope)
                setParams(next)
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <div className="import-result">
          <h2>{scope === 'firm' ? 'Firm card on file' : 'Network card on file'}</h2>
          {profile?.has_saved_card ? (
            <p>
              <strong>{formatCard(profile.card) || 'Card saved'}</strong>
            </p>
          ) : (
            <p className="muted">No card saved yet for this scope.</p>
          )}
          {!profile?.stripe_available && (
            <p className="muted">
              Stripe is not available
              {profile?.stripe_unavailable_reason ? `: ${profile.stripe_unavailable_reason}` : '.'}
            </p>
          )}
          <div className="actions">
            <button className="btn primary" type="button" disabled={saving || !profile?.stripe_available} onClick={onSetup}>
              {saving ? 'Opening Stripe...' : profile?.has_saved_card ? 'Update card' : 'Add card'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
