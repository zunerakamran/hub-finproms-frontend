import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

function formatMoney(amount, currency = 'gbp') {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(Number(amount || 0))
  } catch {
    return `£${Number(amount || 0).toFixed(2)}`
  }
}

function typeLabel(type) {
  if (type === 'subscription') return 'Subscription'
  if (type === 'post_purchase') return 'Post purchase'
  return type
}

export default function MyInvoices() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .myInvoices()
      .then((data) => setItems(data.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Billing</p>
          <h1>My invoices</h1>
          <p className="muted">Receipts for subscriptions and post purchases.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <div className="state">Loading...</div>
      ) : items.length === 0 ? (
        <div className="state">
          No invoices yet. <Link to="/subscriptions">Browse plans</Link> or{' '}
          <Link to="/">buy a post</Link>.
        </div>
      ) : (
        <div className="invoice-list">
          {items.map((invoice) => (
            <Link to={`/my-dashboard/invoices/${invoice.id}`} key={invoice.id} className="invoice-row">
              <div>
                <strong>{invoice.invoice_number}</strong>
                <p className="muted">{invoice.description}</p>
              </div>
              <div className="invoice-row-meta">
                <span className="badge">{typeLabel(invoice.type)}</span>
                <span>{formatMoney(invoice.amount, invoice.currency)}</span>
                <span className="muted">
                  {new Date(invoice.issued_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
