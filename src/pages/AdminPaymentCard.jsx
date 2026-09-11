import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'

function formatCard(card) {
  if (!card) return null
  const brand = card.brand ? String(card.brand).toUpperCase() : 'Card'
  const last4 = card.last4 ? `•••• ${card.last4}` : 'on file'
  const exp =
    card.exp_month && card.exp_year
      ? ` · exp ${String(card.exp_month).padStart(2, '0')}/${card.exp_year}`
      : ''
  return `${brand} ${last4}${exp}`
}

export default function AdminPaymentCard() {
  const { advisorBillingEnabled, loading: hubLoading } = useHub()
  const [params] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.paymentCard()
      setProfile(data.payment_profile)
    } catch (err) {
      setError(err.message)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading) return
    if (!advisorBillingEnabled) {
      setLoading(false)
      return
    }
    load()
    if (params.get('canceled') === '1') {
      setMessage('Card setup canceled. No changes were saved.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, advisorBillingEnabled])

  const onSetup = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.setupPaymentCard()
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

  if (!hubLoading && !advisorBillingEnabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Client Admin</p>
            <h1>Payment card</h1>
            <p className="muted">
              Advisor billing is not enabled for this hub, so a payment card is not required.
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
          <p className="eyebrow">Client Admin</p>
          <h1>Payment card</h1>
          <p className="muted">
            Enter the card used when advisors are imported. If Stripe is selected at import time,
            this card is charged (rate × advisors) and kept for monthly auto-renew.
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <div className="import-result">
          <h2>Card on file</h2>
          {profile?.has_saved_card ? (
            <p>
              <strong>{formatCard(profile.card) || 'Card saved'}</strong>
            </p>
          ) : (
            <p className="muted">No card saved yet. Add one before importing advisors with Stripe.</p>
          )}
          {profile?.renew_day ? (
            <p className="muted">Auto-renew day: {profile.renew_day} of each month</p>
          ) : null}
          {!profile?.stripe_available && (
            <p className="muted">
              {profile?.stripe_unavailable_reason ||
                'Stripe is not available. Ask Power Admin to configure payment methods.'}
            </p>
          )}
          <div className="actions">
            <button
              type="button"
              className="btn primary"
              disabled={saving || !profile?.stripe_available}
              onClick={onSetup}
            >
              {saving
                ? 'Opening Stripe...'
                : profile?.has_saved_card
                  ? 'Update card'
                  : 'Enter card'}
            </button>
            <Link className="btn ghost" to="/my-dashboard/advisors">
              Advisor import
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
