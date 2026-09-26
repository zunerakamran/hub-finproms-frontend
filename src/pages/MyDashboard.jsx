import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import {
  DASHBOARD_LINKS,
  isDashboardHomeCard,
  isDashboardLinkVisible,
  resolveDashboardGroupLabel,
} from '../dashboard/nav'

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

const GROUP_ORDER = ['account', 'content', 'hub', 'advisors', 'smc', 'gc', 'wc', 'platform']

export default function MyDashboard() {
  const { user, canPower } = useAuth()
  const { can, branding, hub, advisorBillingEnabled, canManagePaymentCard, isActingOnWhiteLabel, effectiveAdvisorId, actingAdvisor, actingHubId, actingHub } = useHub()
  const [data, setData] = useState(null)
  const [panelLoading, setPanelLoading] = useState(true)
  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'
  const isWhiteLabelHub = Boolean(
    isActingOnWhiteLabel || hub?.type === 'white_label' || actingHub?.is_white_label
  )

  useEffect(() => {
    let cancelled = false
    setPanelLoading(true)
    api
      .myDashboard()
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setPanelLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [effectiveAdvisorId, actingHubId])

  const groups = useMemo(() => {
    const activePlan = data?.subscription?.active_plan
    const subscriptions = data?.subscription?.subscriptions || []
    const invoices = data?.invoices || []
    const purchases = data?.purchases || []
    const credits = data?.credits

    const cards = DASHBOARD_LINKS.filter(isDashboardHomeCard)
      .filter((link) =>
        isDashboardLinkVisible(link, {
          can,
          canPower,
          advisorBillingEnabled,
          canManagePaymentCard,
          isActingOnWhiteLabel,
          isWhiteLabelHub,
          userRole: user?.role,
        })
      )
      .map((link) => {
        let description = link.description || ''

        if (link.to === '/my-dashboard/credits' && credits) {
          const balanceLabel = credits.has_unlimited_credits
            ? 'Unlimited credits'
            : `${credits.balance ?? '—'} credits remaining`
          description = actingAdvisor
            ? `${balanceLabel} (${actingAdvisor.name}). Credits are spent when unlocking posts or bundles on their behalf.`
            : `${balanceLabel}. Credits are spent when you unlock posts or bundles.`
        }

        if (link.to === '/my-dashboard/subscription') {
          if (isWhiteLabelHub) {
            description =
              'Private hub allotment from Subscriber credits settings, plus history with from/to dates.'
          } else {
            const planLabel = activePlan
              ? `${activePlan.name} · ${activePlan.credits} credits · ${formatMoney(activePlan.price)}`
              : 'No active subscription yet.'
            const history =
              subscriptions.length > 0
                ? ` ${subscriptions.length} subscription record${subscriptions.length === 1 ? '' : 's'} on file.`
                : ''
            description = `${planLabel}${history}`
          }
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
          group: link.group || 'hub',
        }
      })

    return GROUP_ORDER.map((key) => ({
      key,
      label: resolveDashboardGroupLabel(key, { isWhiteLabelHub }),
      cards: cards.filter((c) => c.group === key),
    })).filter((g) => g.cards.length > 0)
  }, [advisorBillingEnabled, canManagePaymentCard, can, canPower, data, isActingOnWhiteLabel, isWhiteLabelHub, actingAdvisor, user?.role])

  const totalTools = groups.reduce((sum, g) => sum + g.cards.length, 0)

  return (
    <section className="dash-home">
      <div className="dash-welcome">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1>{user?.name ? `Hi, ${user.name.split(' ')[0]}` : 'Your tools'}</h1>
          <p className="muted">
            {totalTools > 0
              ? `${totalTools} tool${totalTools === 1 ? '' : 's'} enabled for your role on `
              : 'No tools enabled yet on '}
            <strong>{brandName}</strong>.
          </p>
        </div>
        <div className="dash-welcome__actions">
          <Link to="/" className="btn ghost">
            Browse catalog
          </Link>
        </div>
      </div>

      {panelLoading ? (
        <div className="dash-panel dash-panel--loading" role="status" aria-live="polite" aria-label="Loading dashboard">
          <div className="page-loader__spinner" />
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state dash-panel">
          <h2>No dashboard tools enabled</h2>
          <p className="muted">
            Power Admin has not enabled any tools for your role on this hub yet.
          </p>
        </div>
      ) : (
        <div className="dash-home-groups">
          {groups.map((group) => (
            <section key={group.key} className="dash-home-group" data-group={group.key}>
              <header className="dash-home-group__head">
                <h2>{group.label}</h2>
                <span className="dash-home-group__count">
                  {group.cards.length} {group.cards.length === 1 ? 'tool' : 'tools'}
                </span>
              </header>
              <div className="tool-grid">
                {group.cards.map((card, index) => (
                  <Link
                    key={card.to}
                    to={card.to}
                    className="tool-card"
                    data-group={card.group}
                    style={{ '--card-i': index }}
                  >
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                    <span className="tool-card__cta">Open →</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
