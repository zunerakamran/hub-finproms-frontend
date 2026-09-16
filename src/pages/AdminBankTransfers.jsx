import { useEffect, useState } from 'react'
import { api } from '../api/client'

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

  const empty = subscriptions.length === 0 && contentCheckouts.length === 0

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
              <div className="admin-list">
                {subscriptions.map((item) => (
                  <div key={`sub-${item.id}`} className="admin-row">
                    <div>
                      <strong>{item.user?.name || 'User'}</strong>
                      <p className="muted">{item.user?.email}</p>
                      <p>
                        {item.plan?.name} · £{Number(item.amount_paid).toFixed(2)} ·{' '}
                        {item.credits_granted} credits
                      </p>
                      <p>
                        Reference: <strong>{item.payment_reference}</strong>
                      </p>
                    </div>
                    <button
                      className="btn primary"
                      disabled={confirmingKey === `sub-${item.id}`}
                      onClick={() => confirmSubscription(item.id)}
                    >
                      {confirmingKey === `sub-${item.id}` ? 'Confirming...' : 'Mark paid'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {contentCheckouts.length > 0 && (
            <>
              <h2 className="section-title">Content purchases</h2>
              <div className="admin-list">
                {contentCheckouts.map((item) => (
                  <div key={`content-${item.id}`} className="admin-row">
                    <div>
                      <strong>{item.user?.name || 'User'}</strong>
                      <p className="muted">{item.user?.email}</p>
                      <p>
                        {item.item_type} · {item.item_title || `#${item.item_id}`} · £
                        {Number(item.amount).toFixed(2)}
                      </p>
                      <p>
                        Reference: <strong>{item.payment_reference}</strong>
                      </p>
                    </div>
                    <button
                      className="btn primary"
                      disabled={confirmingKey === `content-${item.id}`}
                      onClick={() => confirmContent(item.id)}
                    >
                      {confirmingKey === `content-${item.id}` ? 'Confirming...' : 'Mark paid'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
