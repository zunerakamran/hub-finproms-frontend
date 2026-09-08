import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Subscriptions() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [plans, setPlans] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkoutKey, setCheckoutKey] = useState(null)

  useEffect(() => {
    api
      .plans()
      .then((data) => {
        setPlans(data.plans || [])
        setPaymentMethods(data.payment_methods || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const buy = async (planId, paymentMethod) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/subscriptions' } } })
      return
    }
    setCheckoutKey(`${planId}-${paymentMethod}`)
    setError('')
    try {
      const data = await api.checkout(planId, paymentMethod)
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

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Credits</p>
          <h1>Subscription plans</h1>
          <p className="muted">
            Choose Stripe or bank transfer (test). Bank transfer uses dummy details and grants credits immediately.
          </p>
        </div>
      </div>

      {params.get('canceled') && (
        <div className="alert">Checkout canceled. No payment was made.</div>
      )}
      {error && <div className="alert">{error}</div>}

      {loading ? (
        <div className="state">Loading plans...</div>
      ) : (
        <div className="plan-grid">
          {plans.map((plan) => (
            <article key={plan.id} className="plan-tile">
              <h2>{plan.name}</h2>
              <p className="price">${Number(plan.price).toFixed(2)}</p>
              <p className="credits-line">{plan.credits} credits</p>
              <p>{plan.description}</p>
              <p className="muted">{plan.duration_days} days access window</p>
              <div className="plan-actions">
                <button
                  className="btn primary full"
                  onClick={() => buy(plan.id, 'stripe')}
                  disabled={!stripeMethod.available || checkoutKey === `${plan.id}-stripe`}
                  title={stripeMethod.unavailable_reason || undefined}
                >
                  {checkoutKey === `${plan.id}-stripe`
                    ? 'Redirecting to Stripe...'
                    : stripeMethod.available
                      ? 'Pay with Stripe'
                      : 'Stripe unavailable'}
                </button>
                {bankMethod.available && (
                  <button
                    className="btn ghost full"
                    onClick={() => buy(plan.id, 'bank_transfer')}
                    disabled={checkoutKey === `${plan.id}-bank_transfer`}
                  >
                    {checkoutKey === `${plan.id}-bank_transfer`
                      ? 'Completing test payment...'
                      : 'Pay by bank transfer (test)'}
                  </button>
                )}
              </div>
              {!stripeMethod.available && stripeMethod.unavailable_reason && (
                <p className="field-hint">{stripeMethod.unavailable_reason}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
