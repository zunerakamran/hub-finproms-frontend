import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'

export default function Subscriptions() {
  const { can, loading: hubLoading } = useHub()
  const [params] = useSearchParams()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const selfServeAllowed =
    can('member_view_plans') && (can('public_subscribe') || can('paid_credits'))

  useEffect(() => {
    if (hubLoading) return
    if (!selfServeAllowed) {
      setLoading(false)
      return
    }
    api
      .plans()
      .then((data) => {
        setPlans(data.plans || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [hubLoading, selfServeAllowed])

  if (!hubLoading && !selfServeAllowed) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Credits</p>
            <h1>Subscription plans</h1>
            <p className="muted">
              Self-serve subscriptions are disabled for this hub. Access and credits are managed by
              your administrator.
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
          <p className="eyebrow">Credits</p>
          <h1>Subscription plans</h1>
          <p className="muted">Choose a plan to view full details and subscribe.</p>
        </div>
      </div>

      {params.get('canceled') && (
        <div className="alert">Checkout canceled. No payment was made.</div>
      )}
      {error && <div className="alert">{error}</div>}

      {loading ? (
        <div className="state">Loading plans...</div>
      ) : plans.length === 0 ? (
        <div className="empty-state">
          <h2>No plans available</h2>
          <p className="muted">Subscription plans will appear here once they are published.</p>
        </div>
      ) : (
        <div className="plan-grid">
          {plans.map((plan) => (
            <Link key={plan.id} to={`/subscriptions/${plan.id}`} className="plan-tile">
              {plan.image_url ? (
                <div className="plan-cover">
                  <img src={plan.image_url} alt="" />
                </div>
              ) : (
                <div className="plan-cover plan-cover-fallback" aria-hidden>
                  {plan.name}
                </div>
              )}
              <div className="plan-tile-body">
                <h2>{plan.name}</h2>
                <p className="price">£{Number(plan.price).toFixed(2)}</p>
                <p className="credits-line">{plan.credits} credits</p>
                {plan.description && (
                  <p className="plan-overview-snip">
                    {plan.description.length > 110
                      ? `${plan.description.slice(0, 110)}…`
                      : plan.description}
                  </p>
                )}
                <span className="btn ghost full plan-view-cta">View details</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
