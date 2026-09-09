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

export default function AdminAdvisors({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, advisorBillingEnabled } = useHub()
  const [advisors, setAdvisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [file, setFile] = useState(null)
  const [quote, setQuote] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('stripe')
  const [paying, setPaying] = useState(false)
  const [bankResult, setBankResult] = useState(null)

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('advisor_excel_import')
  const billingEnabled = advisorBillingEnabled
  const canViewInvoices = can('dashboard_view_advisor_invoices')
  const eyebrow = asPowerAdmin ? 'Power Admin' : 'Client Admin'
  const apiOpts = { asPowerAdmin }
  const invoicesPath = asPowerAdmin
    ? '/power-admin/advisor-invoices'
    : '/client-admin/advisor-invoices'

  const load = async () => {
    if (!enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.advisors({}, apiOpts)
      setAdvisors(data.data || data.advisors || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, enabled, asPowerAdmin])

  const downloadTemplate = async () => {
    setError('')
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(api.advisorTemplateUrl(apiOpts), {
        headers: {
          Accept: 'text/csv',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Could not download template.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'advisor-import-template.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  const onImport = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Choose a CSV or Excel file to import.')
      return
    }
    setUploading(true)
    setError('')
    setMessage('')
    setResult(null)
    setQuote(null)
    setBankResult(null)
    try {
      const data = await api.importAdvisors(file, apiOpts)
      setMessage(data.message || 'Import finished.')
      setResult(data)
      setQuote(data.quote || null)
      if (data.quote?.error) {
        setError(data.quote.error)
      }
      const methods = data.quote?.payment_methods || []
      const preferred =
        methods.find((m) => m.id === 'saved_card' && m.available) ||
        methods.find((m) => m.available)
      if (preferred) setPaymentMethod(preferred.id)
      setFile(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const onPay = async () => {
    const billingId = quote?.billing?.id
    if (!billingId) {
      setError(quote?.error || 'No billing quote available. Check pricing tiers and try importing again.')
      return
    }
    setPaying(true)
    setError('')
    setBankResult(null)
    try {
      const data = await api.advisorBillingCheckout(billingId, paymentMethod, apiOpts)
      if (data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }
      setBankResult(data)
      if (data.charged_saved_card || data.auto_confirmed) {
        setMessage(data.message || 'Payment successful. Invoice created.')
        setQuote({
          ...quote,
          billing: data.billing,
          payment_required: false,
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setPaying(false)
    }
  }

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>Advisor import</h1>
            <p className="muted">
              Advisor Excel/CSV import is disabled for your role on this hub. Enable
              &quot;Import advisors (Excel/CSV)&quot; under Power Admin → Capabilities.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const pendingBilling =
    quote?.payment_required && quote?.billing && quote.billing.payment_status !== 'paid'
  const showPaymentPanel = Boolean(pendingBilling || (quote?.payment_required && quote?.error))

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>Advisor import</h1>
          <p className="muted">
            Upload a CSV or Excel sheet of advisors. Imported advisors are marked subscribed
            with unlimited credits.
            {billingEnabled
              ? ' The client admin pays rate × advisors after each import (card is saved for auto-renew).'
              : ''}
          </p>
        </div>
        <div className="actions">
          {billingEnabled && !asPowerAdmin && (
            <Link className="btn ghost" to="/client-admin/payment-card">
              Payment card
            </Link>
          )}
          {canViewInvoices && (
            <Link className="btn ghost" to={invoicesPath}>
              Advisor invoices
            </Link>
          )}
          <button type="button" className="btn ghost" onClick={downloadTemplate}>
            Download CSV template
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <form className="admin-form advisor-import-form" onSubmit={onImport}>
        <h2>Upload advisors</h2>
        <p className="muted">
          Columns: <code>name</code>, <code>email</code>, optional <code>password</code>. If
          password is blank, a temporary password is generated (shown once after import). You can
          upload <strong>.csv</strong> or <strong>.xlsx</strong>.
        </p>
        <label>
          Excel / CSV file
          <input
            type="file"
            accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <div className="actions">
          <button className="btn primary" disabled={uploading || !file}>
            {uploading ? 'Importing...' : 'Import advisors'}
          </button>
        </div>
      </form>

      {showPaymentPanel && (
        <div className="import-result">
          <h2>Payment required</h2>
          {quote?.payer && (
            <p className="muted">
              Payer (client admin): <strong>{quote.payer.name}</strong> ({quote.payer.email})
            </p>
          )}
          {quote?.billing ? (
            <p>
              Applied rate: <strong>{formatMoney(quote.rate_per_advisor, quote.currency)}</strong> ×{' '}
              <strong>{quote.advisor_count}</strong> advisors ={' '}
              <strong>{formatMoney(quote.amount, quote.currency)}</strong>
              {quote.tier?.label ? ` (${quote.tier.label})` : ''}
            </p>
          ) : (
            <p className="muted">{quote?.error || 'Unable to build billing quote.'}</p>
          )}
          <p className="muted">
            {quote?.formula || 'amount = rate_per_advisor × advisor_count'}
            {quote?.renew_day
              ? ` · Auto-renew day: ${quote.renew_day} of each month`
              : ''}
          </p>

          {quote?.billing && (
            <div className="admin-form" style={{ marginTop: '1rem' }}>
              <h3>Choose payment method</h3>
              <p className="muted">
                {quote?.has_saved_card
                  ? 'Stripe will charge the client admin card on file from Payment card settings.'
                  : 'No card on file yet — Stripe Checkout will collect a card, or add one under Payment card first.'}
              </p>
              {(quote.payment_methods || []).map((method) => (
                <label key={method.id} className="checklist-item">
                  <input
                    type="radio"
                    name="payment_method"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    disabled={!method.available}
                    onChange={() => setPaymentMethod(method.id)}
                  />
                  <span>
                    {method.label}
                    {method.id === 'stripe'
                      ? quote?.has_saved_card
                        ? ' (charge card on file)'
                        : ' (enter card + auto-renew)'
                      : ''}
                    {method.id === 'saved_card' ? ' (charge now + keep auto-renew)' : ''}
                    {!method.available && method.unavailable_reason
                      ? ` — ${method.unavailable_reason}`
                      : ''}
                  </span>
                </label>
              ))}
              <div className="actions">
                <button
                  type="button"
                  className="btn primary"
                  disabled={paying || !(quote.payment_methods || []).some((m) => m.available)}
                  onClick={onPay}
                >
                  {paying
                    ? 'Processing...'
                    : paymentMethod === 'saved_card' ||
                        (paymentMethod === 'stripe' && quote?.has_saved_card)
                      ? 'Charge saved card'
                      : 'Pay now'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {bankResult && !bankResult.auto_confirmed && !bankResult.charged_saved_card && (
        <div className="import-result">
          <h2>Bank transfer pending</h2>
          <p className="muted">
            Reference:{' '}
            <code>{bankResult.payment_reference || bankResult.billing?.payment_reference}</code>
          </p>
          {bankResult.bank_details && (
            <ul className="muted">
              <li>Account: {bankResult.bank_details.account_name}</li>
              <li>Bank: {bankResult.bank_details.bank_name}</li>
              <li>Sort code: {bankResult.bank_details.sort_code}</li>
              <li>Account number: {bankResult.bank_details.account_number}</li>
            </ul>
          )}
        </div>
      )}

      {result && (
        <div className="import-result">
          <h2>Import result</h2>
          <p className="muted">
            Created {result.summary?.created ?? 0}, updated {result.summary?.updated ?? 0}, skipped{' '}
            {result.summary?.skipped ?? 0}
          </p>

          {(result.created || []).length > 0 && (
            <div className="import-block">
              <h3>New advisors (save temporary passwords now)</h3>
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Temporary password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.created.map((row) => (
                      <tr key={row.email}>
                        <td>{row.name}</td>
                        <td>{row.email}</td>
                        <td>
                          <code>{row.temporary_password || '—'}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(result.skipped || []).length > 0 && (
            <div className="import-block">
              <h3>Skipped rows</h3>
              <ul className="muted">
                {result.skipped.map((row) => (
                  <li key={`${row.row}-${row.email || 'x'}`}>
                    Row {row.row}
                    {row.email ? ` (${row.email})` : ''}: {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="advisor-list-block">
        <h2>Current advisors</h2>
        {loading ? (
          <div className="state">Loading...</div>
        ) : advisors.length === 0 ? (
          <div className="empty-state">
            <p className="muted">No advisors imported yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Credits</th>
                </tr>
              </thead>
              <tbody>
                {advisors.map((advisor) => (
                  <tr key={advisor.id}>
                    <td>{advisor.name}</td>
                    <td>{advisor.email}</td>
                    <td>{advisor.has_unlimited_credits ? 'Unlimited' : advisor.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
