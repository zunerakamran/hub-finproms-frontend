import { useEffect, useState } from 'react'
import { api } from '../api/client'
import DataGrid from '../components/DataGrid'

/** TEMPORARY admin page — remove when BANK_TRANSFER_ENABLED is turned off. */
export default function AdminBankTransfers() {
  const [subscriptions, setSubscriptions] = useState([])
  const [contentCheckouts, setContentCheckouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [confirmingKey, setConfirmingKey] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.pendingBankTransfers()
      setSubscriptions(data.subscriptions || [])
      setContentCheckouts(data.content_checkouts || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const confirmSubscription = async (id) => {
    setConfirmingKey(`sub-${id}`)
    setError('')
    setMessage('')
    try {
      const data = await api.confirmBankTransfer(id)
      setMessage(data.message)
      setSubscriptions((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirmingKey(null)
    }
  }

  const confirmContent = async (id) => {
    setConfirmingKey(`content-${id}`)
    setError('')
    setMessage('')
    try {
      const data = await api.confirmContentBankTransfer(id)
      setMessage(data.message)
      setContentCheckouts((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirmingKey(null)
    }
  }

  const empty = !loading && subscriptions.length === 0 && contentCheckouts.length === 0

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Bank transfers</h1>
          <p className="muted">
            Confirm pending bank payments for plans and one-off content purchases. Temporary until
            Stripe is configured.
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {loading ? (
        <div className="state">Loading pending transfers...</div>
      ) : empty ? (
        <div className="state">No pending bank transfers.</div>
      ) : (
        <>
          {subscriptions.length > 0 && (
            <>
              <h2 className="section-title">Subscription payments</h2>
              <DataGrid
                columns={[
                  {
                    key: 'user',
                    label: 'User',
                    filterValue: (row) =>
                      `${row.user?.name || ''} ${row.user?.email || ''}`.trim(),
                    render: (row) => (
                      <>
                        <strong>{row.user?.name || 'User'}</strong>
                        <div className="muted">{row.user?.email}</div>
                      </>
                    ),
                  },
                  {
                    key: 'plan',
                    label: 'Plan',
                    filterValue: (row) => row.plan?.name || '',
                    render: (row) => row.plan?.name || '—',
                  },
                  {
                    key: 'amount_paid',
                    label: 'Amount',
                    filterValue: (row) => String(row.amount_paid),
                    render: (row) => `£${Number(row.amount_paid).toFixed(2)}`,
                  },
                  {
                    key: 'credits_granted',
                    label: 'Credits',
                    filterValue: (row) => String(row.credits_granted),
                  },
                  {
                    key: 'payment_reference',
                    label: 'Reference',
                    filterValue: (row) => row.payment_reference,
                    render: (row) => <strong>{row.payment_reference}</strong>,
                  },
                ]}
                rows={subscriptions}
                emptyMessage="No pending subscription transfers."
                getRowKey={(row) => row.id}
                actions={(row) => (
                  <button
                    className="btn primary"
                    disabled={confirmingKey === `sub-${row.id}`}
                    onClick={() => confirmSubscription(row.id)}
                  >
                    {confirmingKey === `sub-${row.id}` ? 'Confirming...' : 'Mark paid'}
                  </button>
                )}
              />
            </>
          )}

          {contentCheckouts.length > 0 && (
            <>
              <h2 className="section-title">Content purchases</h2>
              <DataGrid
                columns={[
                  {
                    key: 'user',
                    label: 'User',
                    filterValue: (row) =>
                      `${row.user?.name || ''} ${row.user?.email || ''}`.trim(),
                    render: (row) => (
                      <>
                        <strong>{row.user?.name || 'User'}</strong>
                        <div className="muted">{row.user?.email}</div>
                      </>
                    ),
                  },
                  {
                    key: 'item',
                    label: 'Item',
                    filterValue: (row) =>
                      `${row.item_type || ''} ${row.item_title || row.item_id || ''}`.trim(),
                    render: (row) =>
                      `${row.item_type} · ${row.item_title || `#${row.item_id}`}`,
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    filterValue: (row) => String(row.amount),
                    render: (row) => `£${Number(row.amount).toFixed(2)}`,
                  },
                  {
                    key: 'payment_reference',
                    label: 'Reference',
                    filterValue: (row) => row.payment_reference,
                    render: (row) => <strong>{row.payment_reference}</strong>,
                  },
                ]}
                rows={contentCheckouts}
                emptyMessage="No pending content transfers."
                getRowKey={(row) => row.id}
                actions={(row) => (
                  <button
                    className="btn primary"
                    disabled={confirmingKey === `content-${row.id}`}
                    onClick={() => confirmContent(row.id)}
                  >
                    {confirmingKey === `content-${row.id}` ? 'Confirming...' : 'Mark paid'}
                  </button>
                )}
              />
            </>
          )}
        </>
      )}
    </section>
  )
}
