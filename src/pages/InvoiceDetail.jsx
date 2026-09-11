import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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

export default function InvoiceDetail() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .invoice(id)
      .then((data) => setInvoice(data.invoice))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="state">Loading...</div>
  if (error) return <div className="alert">{error}</div>
  if (!invoice) return null

  const lines = invoice.line_items || []

  return (
    <section className="invoice-detail">
      <Link to="/my-dashboard/invoices" className="back">
        ← Back to invoices
      </Link>

      <div className="invoice-sheet">
        <div className="invoice-sheet-head">
          <div>
            <p className="eyebrow">Invoice</p>
            <h1>{invoice.invoice_number}</h1>
            <p className="muted">{invoice.description}</p>
          </div>
          <div className="invoice-status">
            <span className="badge ok">{invoice.status}</span>
            <p className="muted">Issued {new Date(invoice.issued_at).toLocaleString()}</p>
          </div>
        </div>

        <div className="invoice-parties">
          <div>
            <h2>Billed to</h2>
            <p>{invoice.billing_name}</p>
            <p className="muted">{invoice.billing_email}</p>
          </div>
          <div>
            <h2>Summary</h2>
            <p>
              Type:{' '}
              <strong>
                {invoice.type === 'subscription' ? 'Subscription' : 'Post purchase'}
              </strong>
            </p>
            {invoice.credits != null && (
              <p>
                Credits: <strong>{invoice.credits}</strong>
              </p>
            )}
            <p>
              Total: <strong>{formatMoney(invoice.amount, invoice.currency)}</strong>
            </p>
          </div>
        </div>

        {lines.length > 0 && (
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index}>
                  <td>
                    {line.label}
                    {line.note && <div className="muted">{line.note}</div>}
                  </td>
                  <td>{line.quantity}</td>
                  <td>{formatMoney(line.unit_amount, invoice.currency)}</td>
                  <td>{formatMoney(line.total, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="invoice-total">
          <span>Amount paid</span>
          <strong>{formatMoney(invoice.amount, invoice.currency)}</strong>
        </div>
      </div>
    </section>
  )
}
