import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../utils/dateFormat'

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
  switch (type) {
    case 'subscription':
      return 'Subscription'
    case 'post_purchase':
      return 'Post purchase'
    case 'bundle_purchase':
      return 'Bundle purchase'
    case 'advisor_billing':
      return 'Advisor billing'
    case 'module_billing':
      return 'Module billing'
    default:
      return type || 'Invoice'
  }
}

function typesLabel(types) {
  switch (types) {
    case 'one_time':
      return 'One time'
    case 'per_user_buying':
      return 'Per user buying'
    case 'ongoing':
      return 'Ongoing'
    default:
      return types || '—'
  }
}

function typesBadgeClass(types) {
  switch (types) {
    case 'one_time':
      return 'badge badge-types badge-types--one-time'
    case 'per_user_buying':
      return 'badge badge-types badge-types--per-user'
    case 'ongoing':
      return 'badge badge-types badge-types--ongoing'
    default:
      return 'badge badge-types'
  }
}

function paymentMethodLabel(method) {
  switch (method) {
    case 'manual':
      return 'Manual'
    case 'bank_transfer':
      return 'Bank transfer'
    case 'stripe_offline':
      return 'Stripe (offline)'
    case 'other':
      return 'Other'
    default:
      return method || '—'
  }
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const location = useLocation()
  const { isPowerAdmin } = useAuth()
  const [invoice, setInvoice] = useState(null)
  const [payment, setPayment] = useState(null)
  const [canMarkPaid, setCanMarkPaid] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    payment_method: 'manual',
    payment_reference: '',
    payment_notes: '',
    attachment: null,
  })

  const fromAdvisorPath = location.pathname.includes('/advisor-invoices/')
  const fromModulePath = location.pathname.includes('/module-invoices/')
  const asPowerAdmin = isPowerAdmin

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      if (fromModulePath) {
        const data = await api.moduleInvoice(id, { asPowerAdmin })
        setInvoice(data.invoice)
        setPayment(data.payment || null)
        setCanMarkPaid(Boolean(data.can_mark_paid))
      } else {
        const data = await api.invoice(id)
        setInvoice(data.invoice)
        setPayment(null)
        setCanMarkPaid(false)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fromModulePath, asPowerAdmin])

  const isAdvisorBilling = fromAdvisorPath || invoice?.type === 'advisor_billing'
  const isModuleBilling = fromModulePath || invoice?.type === 'module_billing'
  const backTo = isAdvisorBilling
    ? '/my-dashboard/advisor-invoices'
    : isModuleBilling
      ? '/my-dashboard/module-invoices'
      : '/my-dashboard/invoices'
  const backLabel = isAdvisorBilling
    ? '← Back to advisor invoices'
    : isModuleBilling
      ? '← Back to module invoices'
      : '← Back to invoices'
  const eyebrow = isAdvisorBilling
    ? 'Advisors & billing'
    : isModuleBilling
      ? 'Modules'
      : 'Account'

  const onMarkPaid = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const body = new FormData()
      body.append('payment_method', form.payment_method || 'manual')
      if (form.payment_reference) body.append('payment_reference', form.payment_reference)
      if (form.payment_notes) body.append('payment_notes', form.payment_notes)
      if (form.attachment) body.append('attachment', form.attachment)

      const data = await api.markModuleInvoicePaid(id, body, { asPowerAdmin })
      setInvoice(data.invoice)
      setPayment(data.payment || null)
      setCanMarkPaid(false)
      setMessage('Invoice marked as paid.')
      setForm({
        payment_method: 'manual',
        payment_reference: '',
        payment_notes: '',
        attachment: null,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="invoice-detail">
        <div className="page-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>Invoice</h1>
          </div>
          <Link to={backTo} className="btn ghost">
            {backLabel}
          </Link>
        </div>
        <div className="state">Loading...</div>
      </section>
    )
  }

  if (error && !invoice) {
    return (
      <section className="invoice-detail">
        <div className="page-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>Invoice</h1>
          </div>
          <Link to={backTo} className="btn ghost">
            {backLabel}
          </Link>
        </div>
        <div className="alert">{error}</div>
      </section>
    )
  }

  if (!invoice) return null

  const lines = invoice.line_items || []
  const moduleHub = invoice.module_billing?.hub
  const moduleLabel =
    invoice.module_billing?.meta?.module_label ||
    invoice.module_billing?.module_key ||
    null
  const showMarkPaidForm =
    isModuleBilling && canMarkPaid && invoice.status !== 'paid'

  return (
    <section className="invoice-detail">
      <div className="page-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{invoice.invoice_number}</h1>
          <p className="muted">{invoice.description}</p>
        </div>
        <Link to={backTo} className="btn ghost">
          {backLabel}
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="invoice-sheet">
        <div className="invoice-sheet-head">
          <div>
            <p className="muted">Issued {formatDateTime(invoice.issued_at)}</p>
          </div>
          <div className="invoice-status invoice-status-badges">
            <span className={`badge ${invoice.status === 'paid' ? 'ok' : 'warn'}`}>
              {invoice.status}
            </span>
            <span className={typesBadgeClass(invoice.types)} title="Billing cadence">
              {typesLabel(invoice.types)}
            </span>
          </div>
        </div>

        <div className="invoice-parties">
          {isModuleBilling ? (
            <>
              <div>
                <h2>Charged by</h2>
                <p>FinProms platform</p>
                <p className="muted">
                  Stripe merchant / payout account for module catalogue pricing is not configured
                  yet. This invoice records the charge; recipient details will appear here once
                  Stripe is linked.
                </p>
              </div>
              <div>
                <h2>For hub</h2>
                <p>{moduleHub?.name || 'White-labelled hub'}</p>
                {moduleHub?.slug && <p className="muted">{moduleHub.slug}</p>}
                {moduleLabel && (
                  <p className="muted" style={{ marginTop: '0.5rem' }}>
                    Module: <strong>{moduleLabel}</strong>
                  </p>
                )}
              </div>
              <div>
                <h2>Summary</h2>
                <p className="invoice-summary-badges">
                  <span className="badge">{typeLabel(invoice.type)}</span>
                  <span className={typesBadgeClass(invoice.types)}>{typesLabel(invoice.types)}</span>
                </p>
                <p>
                  Total: <strong>{formatMoney(invoice.amount, invoice.currency)}</strong>
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2>Billed to</h2>
                <p>{invoice.billing_name}</p>
                <p className="muted">{invoice.billing_email}</p>
              </div>
              <div>
                <h2>Summary</h2>
                <p>
                  Type: <strong>{typeLabel(invoice.type)}</strong>
                </p>
                <p className="invoice-summary-badges">
                  <span className="muted" style={{ marginRight: '0.35rem' }}>
                    Types:
                  </span>
                  <span className={typesBadgeClass(invoice.types)}>{typesLabel(invoice.types)}</span>
                </p>
                {invoice.credits != null && invoice.type !== 'advisor_billing' && (
                  <p>
                    Credits: <strong>{invoice.credits}</strong>
                  </p>
                )}
                <p>
                  Total: <strong>{formatMoney(invoice.amount, invoice.currency)}</strong>
                </p>
              </div>
            </>
          )}
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
          <span>{invoice.status === 'paid' ? 'Amount paid' : 'Amount due'}</span>
          <strong>{formatMoney(invoice.amount, invoice.currency)}</strong>
        </div>
      </div>

      {isModuleBilling && payment && (
        <div className="invoice-sheet" style={{ marginTop: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Payment details</h2>
          {payment.auto_paid_on_hub_enable && (
            <p className="muted">Auto-marked paid when the hub packaging module was enabled.</p>
          )}
          <div className="invoice-parties">
            <div>
              <h2>Recorded</h2>
              <p>{payment.paid_at ? formatDateTime(payment.paid_at) : '—'}</p>
              {payment.paid_by && (
                <>
                  <p>{payment.paid_by.name}</p>
                  <p className="muted">{payment.paid_by.email}</p>
                </>
              )}
            </div>
            <div>
              <h2>Method</h2>
              <p>{paymentMethodLabel(payment.payment_method)}</p>
              {payment.payment_reference && (
                <p className="muted">Ref: {payment.payment_reference}</p>
              )}
            </div>
            <div>
              <h2>Notes</h2>
              <p>{payment.payment_notes || '—'}</p>
              {payment.attachment?.url && (
                <p style={{ marginTop: '0.5rem' }}>
                  <a href={payment.attachment.url} target="_blank" rel="noreferrer">
                    {payment.attachment.name || 'View attachment'}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showMarkPaidForm && (
        <form className="admin-form invoice-sheet" style={{ marginTop: '1.25rem' }} onSubmit={onMarkPaid}>
          <h2 style={{ marginTop: 0 }}>Mark as paid</h2>
          <p className="muted">
            Record how this module invoice was settled. Details and any attachment stay on the
            invoice for later review.
          </p>
          <label>
            Payment method *
            <select
              required
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            >
              <option value="manual">Manual</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="stripe_offline">Stripe (offline)</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Payment reference
            <input
              value={form.payment_reference}
              onChange={(e) => setForm({ ...form, payment_reference: e.target.value })}
              placeholder="Bank ref / cheque no. / internal ID"
            />
          </label>
          <label>
            Notes *
            <textarea
              required
              rows={4}
              value={form.payment_notes}
              onChange={(e) => setForm({ ...form, payment_notes: e.target.value })}
              placeholder="Who paid, when, and any other settlement notes"
            />
          </label>
          <label>
            Attachment (optional)
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={(e) => setForm({ ...form, attachment: e.target.files?.[0] || null })}
            />
          </label>
          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Mark invoice paid'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
