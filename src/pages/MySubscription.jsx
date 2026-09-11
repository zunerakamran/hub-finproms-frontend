import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'

function formatMoney(amount, currency = 'gbp') {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: String(currency || 'gbp').toUpperCase(),
    }).format(Number(amount || 0))
  } catch {
    return `£${Number(amount || 0).toFixed(2)}`
  }
}

export default function MySubscription() {
  const { can } = useHub()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .myDashboard()
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <div className="state">Loading...</div>
  if (error) return <div className="alert">{error}</div>

  const activePlan = data?.subscription?.active_plan
  const subscriptions = data?.subscription?.subscriptions || []
  const showPlans = can('member_view_plans')

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Subscription</h1>
          <p className="muted">Your active plan and subscription history for this hub.</p>
        </div>
        {showPlans && (
          <Link to="/subscriptions" className="btn primary">
            Browse plans
          </Link>
        )}
      </div>

      <div className="admin-dashboard-grid">
        <div className="admin-dashboard-card">
          <h2>Active plan</h2>
          {activePlan ? (
            <p>
              {activePlan.name} · {activePlan.credits} credits · {formatMoney(activePlan.price)}
            </p>
          ) : (
            <p className="muted">No active subscription yet.</p>
          )}
          {showPlans && (
            <Link to="/subscriptions" className="admin-dashboard-link">
              {activePlan ? 'Manage on plans page →' : 'Choose a plan →'}
            </Link>
          )}
        </div>

        <div className="admin-dashboard-card">
          <h2>History</h2>
          {subscriptions.length === 0 ? (
            <p className="muted">No subscription records on file.</p>
          ) : (
            <ul className="invoice-list">
              {subscriptions.map((row) => (
                <li key={row.id} className="invoice-row">
                  <div>
                    <strong>{row.plan?.name || 'Plan'}</strong>
                    <p className="muted">
                      {row.status}
                      {row.starts_at ? ` · from ${String(row.starts_at).slice(0, 10)}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
