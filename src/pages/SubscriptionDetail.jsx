import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

function formatLastUpdated(value) {
  if (!value) return null
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

export default function SubscriptionDetail() {
  const { id } = useParams()
  const { isAuthenticated } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkoutKey, setCheckoutKey] = useState(null)

  const selfServeAllowed =
    can('member_view_plans') && (can('public_subscribe') || can('paid_credits'))

  useEffect(() => {
    if (hubLoading) return
    if (!selfServeAllowed) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    api
      .plan(id)
      .then((data) => {
        setPlan(data.plan)
        setPaymentMethods(data.payment_methods || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [hubLoading, selfServeAllowed, id])

  const buy = async (paymentMethod) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/subscriptions/${id}` } } })
      return
    }
    setCheckoutKey(paymentMethod)
    setError('')
    try {
      const data = await api.checkout(id, paymentMethod)
      if (data.payment_method === 'bank_transfer') {
        navigate('/subscriptions/bank-transfer', {
          state: {
            subscription: data.subscription,
            invoice: data.invoice,
            bank_details: data.bank_details,
            payment_reference: data.payment_reference,
            amount: data.amount,
            message: data.message,
            auto_confirmed: data.auto_confirmed,
            user: data.user,
          },
        })
        return
      }
      window.location.href = data.checkout_url
    } catch (err) {
      setError(err.message)
      setCheckoutKey(null)
    }
  }

  const stripeMethod = paymentMethods.find((m) => m.id === 'stripe') || {
    id: 'stripe',
    available: false,
    unavailable_reason: 'Stripe is not configured yet.',
  }
  const bankMethod = paymentMethods.find((m) => m.id === 'bank_transfer') || {
    id: 'bank_transfer',
    available: true,
  }

  if (!hubLoading && !selfServeAllowed) {
    return (
      <section className="detail">
        <Link to="/subscriptions" className="back">
          ← Back to plans
        </Link>
        <div className="alert">
          Self-serve subscriptions are disabled for this hub. Access and credits are managed by your
          administrator.
        </div>
      </section>
    )
  }

  if (loading || hubLoading) return <div className="state">Loading plan...</div>
  if (error && !plan) return <div className="alert">{error}</div>
  if (!plan) return null

  return (
    <section className="detail">
      <Link to="/subscriptions" className="back">
        ← Back to plans
      </Link>

      <div className="detail-panel">
        {plan.image_url ? (
          <div className="detail-cover">
            <img src={plan.image_url} alt={plan.name} />
          </div>
        ) : (
          <div className="detail-cover plan-cover-fallback" aria-hidden>
            {plan.name}
          </div>
        )}

        <h1>{plan.name}</h1>
        <p className="price">£{Number(plan.price).toFixed(2)}</p>
        <p className="credits-line">{plan.credits} credits</p>
        <p className="muted">{plan.duration_days} days access window</p>
        {formatLastUpdated(plan.last_updated) && (
          <p className="field-hint">Last updated: {formatLastUpdated(plan.last_updated)}</p>
        )}

        {plan.description && <p>{plan.description}</p>}

        {plan.overview && (
          <div className="plan-section">
            <h3>Overview</h3>
            <p>{plan.overview}</p>
          </div>
        )}

        {Array.isArray(plan.features) && plan.features.length > 0 && (
          <div className="plan-section">
            <h3>Features</h3>
            <ul className="plan-list">
              {plan.features.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {Array.isArray(plan.benefits) && plan.benefits.length > 0 && (
          <div className="plan-section">
            <h3>Benefits</h3>
            <ul className="plan-list">
              {plan.benefits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {error && <div className="alert">{error}</div>}

        <div className="unlock-box">
          <p>Choose a payment method to subscribe and receive credits.</p>
          <div className="plan-actions">
            <button
              className="btn primary full"
              onClick={() => buy('stripe')}
              disabled={!stripeMethod.available || checkoutKey === 'stripe'}
              title={stripeMethod.unavailable_reason || undefined}
            >
              {checkoutKey === 'stripe'
                ? 'Redirecting to Stripe...'
                : stripeMethod.available
                  ? 'Pay with Stripe'
                  : 'Stripe unavailable'}
            </button>
            {bankMethod.available && (
              <button
                className="btn ghost full"
                onClick={() => buy('bank_transfer')}
                disabled={checkoutKey === 'bank_transfer'}
              >
                {checkoutKey === 'bank_transfer'
                  ? 'Completing test payment...'
                  : 'Pay by bank transfer (test)'}
              </button>
            )}
          </div>
          {!stripeMethod.available && stripeMethod.unavailable_reason && (
            <p className="field-hint">{stripeMethod.unavailable_reason}</p>
          )}
        </div>
      </div>
    </section>
  )
}
