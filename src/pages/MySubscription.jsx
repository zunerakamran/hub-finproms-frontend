import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import DataGrid from '../components/DataGrid'
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

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(value).slice(0, 10)
  }
}

function statusLabel(status) {
  if (!status) return '—'
  return String(status).replace(/_/g, ' ')
}

export default function MySubscription() {
  const { can, isActingOnWhiteLabel, hub, actingHub, inviteOnly, effectiveAdvisorId } = useHub()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isWhiteLabelClient = Boolean(
    isActingOnWhiteLabel || hub?.type === 'white_label' || actingHub?.is_white_label
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
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
  }, [effectiveAdvisorId])

  const sub = data?.subscription
  const isPrivateHub = Boolean(sub?.is_private_hub ?? (isWhiteLabelClient || inviteOnly))
  const plansEnabled = sub?.plans_enabled !== false && !isWhiteLabelClient
  const showPlans = plansEnabled && can('member_view_plans')
  const allotment = sub?.allotment
  const activeSubscription = sub?.active_subscription
  const activePlan = activeSubscription?.plan || sub?.active_plan
  const subscriptions = sub?.subscriptions || []
  const balance = sub?.balance
  const unlimitedBalance = Boolean(sub?.has_unlimited_credits)

  const historyColumns = useMemo(
    () => [
      {
        key: 'plan',
        label: isPrivateHub ? 'Allotment / plan' : 'Plan',
        filterValue: (row) =>
          row.plan?.name ||
          (row.credits_granted
            ? `${row.credits_granted} credits`
            : isPrivateHub
              ? 'Subscriber allotment'
              : 'Plan'),
        render: (row) => (
          <strong>
            {row.plan?.name ||
              (isPrivateHub
                ? row.credits_granted
                  ? `${row.credits_granted} credits granted`
                  : 'Subscriber allotment'
                : 'Plan')}
          </strong>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        filterValue: (row) => statusLabel(row.status),
        render: (row) => (
          <span className={`sub-status sub-status--${String(row.status || 'unknown').toLowerCase()}`}>
            {statusLabel(row.status)}
          </span>
        ),
      },
      {
        key: 'credits_granted',
        label: 'Credits',
        filterValue: (row) => String(row.credits_granted ?? ''),
        render: (row) =>
          row.credits_granted != null ? (
            <span className="credits-amt credits-amt--in">+{row.credits_granted}</span>
          ) : (
            '—'
          ),
      },
      {
        key: 'starts_at',
        label: 'From',
        filterValue: (row) => formatDate(row.starts_at),
        render: (row) => formatDate(row.starts_at),
      },
      {
        key: 'ends_at',
        label: 'To',
        filterValue: (row) => formatDate(row.ends_at),
        render: (row) => formatDate(row.ends_at),
      },
    ],
    [isPrivateHub]
  )

  if (loading) return <div className="state">Loading subscription...</div>
  if (error) return <div className="alert">{error}</div>

  return (
    <section className="subscription-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Subscription</h1>
          <p className="muted">
            {isPrivateHub
              ? 'Your hub credit allotment and subscription history. Private hubs use subscriber credits instead of public plans.'
              : 'Your active plan and subscription history for this hub.'}
          </p>
        </div>
        <div className="subscription-page__actions">
          {can('general_show_credits') ? (
            <Link to="/my-dashboard/credits" className="btn ghost">
              Credits report
            </Link>
          ) : null}
          {showPlans ? (
            <Link to="/subscriptions" className="btn primary">
              Browse plans
            </Link>
          ) : null}
        </div>
      </div>

      <div className="subscription-page__grid">
        <article className="subscription-card subscription-card--active">
          <p className="subscription-card__eyebrow">
            {isPrivateHub ? 'Active allotment' : 'Active plan'}
          </p>

          {isPrivateHub ? (
            <>
              <h2>
                {allotment?.unlimited || unlimitedBalance
                  ? 'Unlimited credits'
                  : allotment?.credits != null
                    ? `${allotment.credits} credits`
                    : 'Subscriber credits'}
              </h2>
              <p className="muted">
                {allotment?.unlimited || unlimitedBalance
                  ? 'Your hub is set to unlimited subscriber credits in settings. Catalog unlocks do not reduce a balance.'
                  : allotment?.credits != null
                    ? `Your hub grants ${allotment.credits} credit${Number(allotment.credits) === 1 ? '' : 's'} per subscriber period (configured under Subscriber credits).`
                    : 'Credit allotment follows your hub’s Subscriber credits settings.'}
              </p>
              <div className="subscription-card__meta">
                <div>
                  <span className="muted">Current balance</span>
                  <strong>{unlimitedBalance ? 'Unlimited' : balance ?? '—'}</strong>
                </div>
                <div>
                  <span className="muted">Hub setting</span>
                  <strong>{allotment?.label || '—'}</strong>
                </div>
              </div>
            </>
          ) : activePlan ? (
            <>
              <h2>{activePlan.name}</h2>
              <p className="muted">
                {activePlan.credits} credits
                {activePlan.price != null ? ` · ${formatMoney(activePlan.price)}` : ''}
                {activePlan.duration_days
                  ? ` · ${activePlan.duration_days} day${activePlan.duration_days === 1 ? '' : 's'}`
                  : ''}
              </p>
              <div className="subscription-card__meta">
                <div>
                  <span className="muted">From</span>
                  <strong>{formatDate(activeSubscription?.starts_at)}</strong>
                </div>
                <div>
                  <span className="muted">To</span>
                  <strong>{formatDate(activeSubscription?.ends_at)}</strong>
                </div>
                <div>
                  <span className="muted">Status</span>
                  <strong>{statusLabel(activeSubscription?.status || 'active')}</strong>
                </div>
              </div>
              {showPlans ? (
                <Link to="/subscriptions" className="admin-dashboard-link">
                  Manage on plans page →
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <h2>No active plan</h2>
              <p className="muted">You do not have an active subscription on this hub yet.</p>
              {showPlans ? (
                <Link to="/subscriptions" className="admin-dashboard-link">
                  Choose a plan →
                </Link>
              ) : null}
            </>
          )}
        </article>

        <article className="subscription-card">
          <p className="subscription-card__eyebrow">At a glance</p>
          <h2>Account summary</h2>
          <div className="subscription-card__meta subscription-card__meta--stack">
            <div>
              <span className="muted">Credits remaining</span>
              <strong>{unlimitedBalance ? 'Unlimited' : balance ?? '—'}</strong>
            </div>
            <div>
              <span className="muted">History records</span>
              <strong>{subscriptions.length}</strong>
            </div>
            <div>
              <span className="muted">Hub type</span>
              <strong>{isPrivateHub ? 'Private / invite' : 'Shared plans'}</strong>
            </div>
          </div>
          {can('general_show_credits') ? (
            <Link to="/my-dashboard/credits" className="admin-dashboard-link">
              Open full credits report →
            </Link>
          ) : null}
        </article>
      </div>

      <div className="subscription-page__history">
        <div className="page-head" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h2>History</h2>
            <p className="muted">Past and current subscription periods, with from and to dates.</p>
          </div>
        </div>
        <DataGrid
          columns={historyColumns}
          rows={subscriptions}
          emptyMessage={
            isPrivateHub
              ? 'No subscription history on file yet for this account.'
              : 'No subscription records on file.'
          }
          pageSize={10}
          getRowKey={(row) => row.id}
        />
      </div>
    </section>
  )
}
