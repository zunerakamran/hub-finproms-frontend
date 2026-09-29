import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function SubscriptionSuccess() {
  const [params] = useSearchParams()
  const { refreshUser } = useAuth()
  const [status, setStatus] = useState('confirming')
  const [message, setMessage] = useState('Confirming your Stripe payment...')
  const [subscription, setSubscription] = useState(null)
  const [invoice, setInvoice] = useState(null)

  useEffect(() => {
    const sessionId = params.get('session_id')
    if (!sessionId) {
      setStatus('error')
      setMessage('Missing Stripe session id.')
      return
    }

    api
      .confirmSubscription(sessionId)
      .then(async (data) => {
        setSubscription(data.subscription)
        setInvoice(data.invoice || null)
        setMessage(data.message)
        setStatus('success')
        await refreshUser()
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message)
      })
  }, [params, refreshUser])

  return (
    <section className="success-panel">
      <p className="eyebrow">Stripe</p>
      <h1>{status === 'success' ? 'Payment successful' : status === 'error' ? 'Payment issue' : 'Processing...'}</h1>
      <p className={status === 'error' ? 'alert' : 'muted'}>{message}</p>
      {subscription && (
        <p>
          Plan: <strong>{subscription.plan?.name}</strong> · Credits added:{' '}
          <strong>{subscription.credits_granted}</strong>
        </p>
      )}
      {invoice && (
        <p className="muted">
          Invoice <strong>{invoice.invoice_number}</strong> for £
          {Number(invoice.amount).toFixed(2)} has been created.
        </p>
      )}
      <div className="actions">
        <Link to="/" className="btn primary">
          Browse posts
        </Link>
        {invoice ? (
          <Link to={`/my-dashboard/invoices/${invoice.id}`} className="btn ghost">
            View invoice
          </Link>
        ) : (
          <Link to="/subscriptions" className="btn ghost">
            View plans
          </Link>
        )}
      </div>
    </section>
  )
}
