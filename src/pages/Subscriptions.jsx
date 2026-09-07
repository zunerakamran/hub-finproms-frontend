import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Subscriptions() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkoutPlanId, setCheckoutPlanId] = useState(null)

  useEffect(() => {
    api
      .plans()
      .then((data) => setPlans(data.plans || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const buy = async (planId) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/subscriptions' } } })
      return
    }
    setCheckoutPlanId(planId)
    setError('')
    try {
      const data = await api.checkout(planId)
      window.location.href = data.checkout_url
    } catch (err) {
      setError(err.message)
      setCheckoutPlanId(null)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Credits</p>
          <h1>Subscription plans</h1>
          <p className="muted">Pay securely with Stripe. Credits are added after payment.</p>
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
              <button
                className="btn primary full"
                onClick={() => buy(plan.id)}
                disabled={checkoutPlanId === plan.id}
              >
                {checkoutPlanId === plan.id ? 'Redirecting to Stripe...' : 'Buy with Stripe'}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
