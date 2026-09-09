import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

function formatMoney(amount, currency = 'gbp') {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: (currency || 'gbp').toUpperCase(),
    }).format(Number(amount || 0))
  } catch {
    return `£${Number(amount || 0).toFixed(2)}`
  }
}

export default function AdminAdvisorInvoices({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_view_advisor_invoices')
  const eyebrow = asPowerAdmin ? 'Power Admin' : 'Client Admin'

  useEffect(() => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .advisorInvoices({}, { asPowerAdmin })
      .then((data) => setItems(data.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [hubLoading, enabled, asPowerAdmin])

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>Advisor invoices</h1>
            <p className="muted">
              Enable &quot;View advisor billing invoices&quot; for your role under Power Admin →
              Capabilities.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>Advisor billing invoices</h1>
          <p className="muted">Invoices for rate × advisors private hub subscription billing.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <div className="state">Loading...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p className="muted">No advisor billing invoices yet.</p>
        </div>
      ) : (
        <div className="invoice-list">
          {items.map((invoice) => (
            <Link to={`/invoices/${invoice.id}`} key={invoice.id} className="invoice-row">
              <div>
                <strong>{invoice.invoice_number}</strong>
                <p className="muted">{invoice.description}</p>
              </div>
              <div className="invoice-row-meta">
                <span className="badge">Advisor billing</span>
                <span>{formatMoney(invoice.amount, invoice.currency)}</span>
                <span className="muted">
                  {invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : '—'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
