import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'

export default function MyCredits() {
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

  const credits = data?.credits
  const showPlans = can('member_view_plans')
  const balanceLabel = credits?.has_unlimited_credits
    ? 'Unlimited credits'
    : `${credits?.balance ?? 0} credits remaining`

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Credits</h1>
          <p className="muted">Credits are spent when you unlock posts or bundles.</p>
        </div>
        {showPlans && (
          <Link to="/subscriptions" className="btn primary">
            Get more credits
          </Link>
        )}
      </div>

      <div className="admin-dashboard-grid">
        <div className="admin-dashboard-card">
          <h2>Balance</h2>
          <p>{balanceLabel}</p>
          <p className="muted">
            {credits?.has_unlimited_credits
              ? 'Your account can unlock catalog content without spending a balance.'
              : 'Buy a plan or individual content from the main website to use credits.'}
          </p>
          <Link to="/" className="admin-dashboard-link">
            Browse catalog →
          </Link>
        </div>
      </div>
    </section>
  )
}
