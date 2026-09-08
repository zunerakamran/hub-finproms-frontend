import { useEffect, useState } from 'react'
import { api } from '../api/client'

/** TEMPORARY admin page — remove when BANK_TRANSFER_ENABLED is turned off. */
export default function AdminBankTransfers() {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [confirmingId, setConfirmingId] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.pendingBankTransfers()
      setSubscriptions(data.subscriptions || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const confirm = async (id) => {
    setConfirmingId(id)
    setError('')
    setMessage('')
    try {
      const data = await api.confirmBankTransfer(id)
      setMessage(data.message)
      setSubscriptions((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client Admin</p>
          <h1>Bank transfers</h1>
          <p className="muted">Confirm pending bank payments to grant credits. Temporary until Stripe is configured.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {loading ? (
        <div className="state">Loading pending transfers...</div>
      ) : subscriptions.length === 0 ? (
        <div className="state">No pending bank transfers.</div>
      ) : (
        <div className="admin-list">
          {subscriptions.map((item) => (
            <div key={item.id} className="admin-row">
              <div>
                <strong>{item.user?.name || 'User'}</strong>
                <p className="muted">{item.user?.email}</p>
                <p>
                  {item.plan?.name} · ${Number(item.amount_paid).toFixed(2)} · {item.credits_granted} credits
                </p>
                <p>
                  Reference: <strong>{item.payment_reference}</strong>
                </p>
              </div>
              <button
                className="btn primary"
                disabled={confirmingId === item.id}
                onClick={() => confirm(item.id)}
              >
                {confirmingId === item.id ? 'Confirming...' : 'Mark paid'}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
