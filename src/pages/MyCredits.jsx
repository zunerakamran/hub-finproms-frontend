import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import DataGrid from '../components/DataGrid'
import { useHub } from '../context/HubContext'

function formatWhen(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function signedCredits(row) {
  const amount = Number(row.credits || 0)
  if (row.direction === 'in') return `+${amount}`
  return `−${amount}`
}

export default function MyCredits() {
  const { can, effectiveAdvisorId, actingAdvisor, roleLabel, isActingOnWhiteLabel, hub, actingHub } =
    useHub()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isWhiteLabel = Boolean(
    report?.is_white_label ??
      isActingOnWhiteLabel ??
      hub?.type === 'white_label' ??
      actingHub?.is_white_label
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .myCredits()
      .then((payload) => {
        if (!cancelled) setReport(payload.credits || null)
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

  const ledgerColumns = useMemo(
    () => [
      {
        key: 'occurred_at',
        label: 'Date',
        filterValue: (row) => formatWhen(row.occurred_at),
        render: (row) => formatWhen(row.occurred_at),
      },
      {
        key: 'type_label',
        label: 'Type',
        filterValue: (row) => row.type_label || row.type,
        render: (row) => <span className="badge">{row.type_label || row.type}</span>,
      },
      {
        key: 'description',
        label: 'Detail',
        filterValue: (row) => row.description || row.item_title || '',
        render: (row) => row.description || row.item_title || '—',
      },
      {
        key: 'direction',
        label: 'Flow',
        filterValue: (row) => (row.direction === 'in' ? 'Earned' : 'Spent'),
        render: (row) => (
          <span
            className={
              row.direction === 'in' ? 'credits-flow credits-flow--in' : 'credits-flow credits-flow--out'
            }
          >
            {row.direction === 'in' ? 'Earned' : 'Spent'}
          </span>
        ),
      },
      {
        key: 'credits',
        label: 'Credits',
        filterValue: (row) => signedCredits(row),
        render: (row) => (
          <strong
            className={
              row.direction === 'in' ? 'credits-amt credits-amt--in' : 'credits-amt credits-amt--out'
            }
          >
            {signedCredits(row)}
          </strong>
        ),
      },
    ],
    []
  )

  const dailyColumns = useMemo(
    () => [
      {
        key: 'date_label',
        label: 'Day',
        filterValue: (row) => `${row.date_label || ''} ${row.date || ''}`,
        render: (row) => <strong>{row.date_label || row.date}</strong>,
      },
      {
        key: 'earned',
        label: isWhiteLabel ? 'Granted' : 'Earned',
        filterValue: (row) => String(row.earned ?? 0),
        render: (row) => <span className="credits-amt credits-amt--in">+{row.earned ?? 0}</span>,
      },
      {
        key: 'spent',
        label: 'Spent',
        filterValue: (row) => String(row.spent ?? 0),
        render: (row) => <span className="credits-amt credits-amt--out">−{row.spent ?? 0}</span>,
      },
      {
        key: 'net',
        label: 'Net',
        filterValue: (row) => String(row.net ?? 0),
        render: (row) => {
          const net = Number(row.net || 0)
          const cls = net > 0 ? 'credits-amt--in' : net < 0 ? 'credits-amt--out' : ''
          return (
            <strong className={`credits-amt ${cls}`.trim()}>
              {net > 0 ? `+${net}` : net}
            </strong>
          )
        },
      },
      {
        key: 'transactions',
        label: 'Entries',
        filterValue: (row) => String(row.transactions ?? 0),
      },
    ],
    [isWhiteLabel]
  )

  if (loading) return <div className="state">Loading credits report...</div>
  if (error) return <div className="alert">{error}</div>
  if (!report) return <div className="state">Credits report unavailable.</div>

  const plansEnabled = report.plans_enabled !== false && !isWhiteLabel
  const showPlansCta = plansEnabled && can('member_view_plans') && !report.has_unlimited_credits
  const unlimited = Boolean(report.has_unlimited_credits)
  const balanceLabel = unlimited ? 'Unlimited' : String(report.balance ?? 0)
  const advisorLabel = roleLabel('advisor') || 'Advisor'
  const ledger = report.ledger || []
  const daily = report.daily || []
  const allotment = report.allotment

  return (
    <section className="credits-report">
      <div className="page-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Credits report</h1>
          <p className="muted">
            {actingAdvisor
              ? `Full credit activity for ${actingAdvisor.name} (${advisorLabel.toLowerCase()}) while you work on their behalf.`
              : isWhiteLabel
                ? 'Your subscriber credit allotment, spends on unlocks, and remaining balance. White-labelled hubs do not use subscription plans.'
                : 'How many credits you received, what you spent them on, and what remains.'}
          </p>
        </div>
        {showPlansCta ? (
          <Link to="/subscriptions" className="btn primary">
            Get more credits
          </Link>
        ) : null}
      </div>

      <div className="credits-report__stats">
        <div className="stat-card">
          <span className="muted">Remaining balance</span>
          <strong>{balanceLabel}</strong>
          <span className="muted">
            {unlimited
              ? 'Catalog unlocks do not reduce a balance.'
              : 'Credits available to unlock posts and bundles.'}
          </span>
        </div>

        {isWhiteLabel ? (
          <div className="stat-card">
            <span className="muted">Subscriber allotment</span>
            <strong className="credits-amt credits-amt--in">
              {allotment?.unlimited
                ? 'Unlimited'
                : allotment?.credits != null
                  ? allotment.credits
                  : '—'}
            </strong>
            <span className="muted">
              {allotment?.label ||
                'Set by the hub under Subscriber credits (no plans on white-labelled hubs).'}
            </span>
          </div>
        ) : (
          <div className="stat-card">
            <span className="muted">Total earned</span>
            <strong className="credits-amt credits-amt--in">+{report.total_earned ?? 0}</strong>
            <span className="muted">From paid subscription plans on record.</span>
          </div>
        )}

        <div className="stat-card">
          <span className="muted">Total spent</span>
          <strong className="credits-amt credits-amt--out">−{report.total_spent ?? 0}</strong>
          <span className="muted">Used to unlock posts and bundles.</span>
        </div>
        <div className="stat-card">
          <span className="muted">Activity</span>
          <strong>{report.transaction_count ?? 0}</strong>
          <span className="muted">
            {report.days_with_activity ?? 0} day
            {(report.days_with_activity ?? 0) === 1 ? '' : 's'} with credit movement.
          </span>
        </div>
      </div>

      <div className="credits-report__section">
        <div className="page-head" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h2>Transaction ledger</h2>
            <p className="muted">
              {isWhiteLabel
                ? 'Credit spends on unlocked content, with search on each column.'
                : 'Every credit grant and spend, with search on each column.'}
            </p>
          </div>
          <Link to="/" className="btn ghost">
            Browse catalog
          </Link>
        </div>
        <DataGrid
          columns={ledgerColumns}
          rows={ledger}
          emptyMessage={
            isWhiteLabel
              ? 'No credit spends yet. Unlock posts or bundles to build this report.'
              : 'No credit transactions yet. Buy a plan or unlock content to build this report.'
          }
          pageSize={12}
          getRowKey={(row) => row.id}
        />
      </div>

      <div className="credits-report__section">
        <div className="page-head" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h2>Daily summary</h2>
            <p className="muted">
              {isWhiteLabel
                ? 'Spend totals for each day with unlock activity.'
                : 'Earned vs spent totals for each day with activity.'}
            </p>
          </div>
        </div>
        <DataGrid
          columns={dailyColumns}
          rows={daily}
          emptyMessage="No daily credit activity yet."
          pageSize={10}
          getRowKey={(row) => row.id || row.date}
        />
      </div>
    </section>
  )
}
