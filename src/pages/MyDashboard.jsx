import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { DASHBOARD_LINKS, isDashboardLinkVisible } from '../dashboard/nav'

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

export default function MyDashboard() {
  const { canPower } = useAuth()
  const { can, advisorBillingEnabled } = useHub()
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    // Enrich general-option cards when the member summary API is allowed.
    api
      .myDashboard()
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const cards = useMemo(() => {
    const activePlan = data?.subscription?.active_plan
    const subscriptions = data?.subscription?.subscriptions || []
    const invoices = data?.invoices || []
    const purchases = data?.purchases || []
    const credits = data?.credits

    return DASHBOARD_LINKS.filter((link) => !link.end)
      .filter((link) => isDashboardLinkVisible(link, { can, canPower, advisorBillingEnabled }))
      .map((link) => {
        let description = link.description || ''

        if (link.to === '/my-dashboard/credits' && credits) {
          const balanceLabel = credits.has_unlimited_credits
            ? 'Unlimited credits'
            : `${credits.balance ?? '—'} credits remaining`
          description = `${balanceLabel}. Credits are spent when you unlock posts or bundles.`
        }

        if (link.to === '/my-dashboard/subscription') {
          const planLabel = activePlan
            ? `${activePlan.name} · ${activePlan.credits} credits · ${formatMoney(activePlan.price)}`
            : 'No active subscription yet.'
          const history =
            subscriptions.length > 0
              ? ` ${subscriptions.length} subscription record${subscriptions.length === 1 ? '' : 's'} on file.`
              : ''
          description = `${planLabel}${history}`
        }

        if (link.to === '/my-dashboard/invoices' && invoices.length > 0) {
          description = `${invoices.length} recent invoice${invoices.length === 1 ? '' : 's'}. Open to view receipts.`
        }

        if (link.to === '/my-dashboard/purchases' && purchases.length > 0) {
          description = `${purchases.length} recent purchase${purchases.length === 1 ? '' : 's'}. Open your unlocked posts and reels.`
        }

        return {
          to: link.to,
          title: link.title || link.label,
          description,
        }
      })
  }, [advisorBillingEnabled, can, canPower, data])

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Your tools</h1>
          <p className="muted">
            Everything here is enabled for your role in Capabilities. Power Admin controls who
            sees which tools.
          </p>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="empty-state">
          <h2>No dashboard tools enabled</h2>
          <p className="muted">
            Power Admin has not enabled any General options or dashboard tools for your role on
            this hub yet.
          </p>
        </div>
      ) : (
        <div className="admin-dashboard-grid">
          {cards.map((card) => (
            <Link key={card.to} to={card.to} className="admin-dashboard-card">
              <h2>{card.title}</h2>
              <p>{card.description}</p>
              <span className="admin-dashboard-link">Open →</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
