import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
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

export default function MyPaymentMethod() {
  const { usersPayOwnModuleInvoices, loading: hubLoading } = useHub()
  const [params] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.profilePaymentCard()
      setProfile(data.payment_profile || null)
    } catch (err) {
      setError(err.message)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading) return
    if (!usersPayOwnModuleInvoices) {
      setLoading(false)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, usersPayOwnModuleInvoices])

  useEffect(() => {
    if (!usersPayOwnModuleInvoices) return
    const sessionId = params.get('session_id')
    if (params.get('card') === 'canceled') {
      setMessage('Payment method setup canceled.')
      return
    }
    if (params.get('card') !== 'success' || !sessionId) return
    setBusy(true)
    api
      .confirmProfilePaymentCard(sessionId)
      .then((data) => {
        setProfile(data.payment_profile || null)
        setMessage(data.message || 'Payment method saved.')
      })
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false))
  }, [params, usersPayOwnModuleInvoices])

  if (!hubLoading && !usersPayOwnModuleInvoices) {
    return <Navigate to="/my-dashboard/profile" replace />
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>My payment method</h1>
          <p className="muted">
            Add your personal card here — required whenever Module invoice settings make you pay
            your own invoices (Users pay own to the network, or Network resells where you pay the
            hub). Network/firm cards are under{' '}
            <Link to="/my-dashboard/payment-card">Payment card</Link>. Your invoices are under{' '}
            <Link to="/my-dashboard/my-invoices">My invoices</Link>.
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
            <p className="muted">No payment method saved yet.</p>
          )}
          {!profile?.stripe_available && (
            <p className="muted">
              Stripe is not available
              {profile?.stripe_unavailable_reason ? `: ${profile.stripe_unavailable_reason}` : '.'}
            </p>
          )}
          <div className="actions">
            <button
              type="button"
              className="btn primary"
              disabled={busy || profile?.stripe_available === false}
              onClick={async () => {
                setBusy(true)
                setError('')
                setMessage('')
                try {
                  const data = await api.setupProfilePaymentCard()
                  if (data.checkout_url) {
                    window.location.href = data.checkout_url
                    return
                  }
                  setError('Stripe did not return a checkout URL.')
                } catch (err) {
                  setError(err.message)
                } finally {
                  setBusy(false)
                }
              }}
            >
              {busy ? 'Opening Stripe...' : profile?.has_saved_card ? 'Update payment method' : 'Add payment method'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
