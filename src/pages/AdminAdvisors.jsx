import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaChevronDown, FaChevronRight } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate } from '../components/DataGrid'
import FileDropzone from '../components/FileDropzone'
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

function ImportBatchDetails({ batch }) {
  const isPending = batch.status === 'pending'
  const pendingUsers = batch.pending_users || []
  const sections = isPending
    ? [{ key: 'pending_users', label: 'Users in sheet', rows: pendingUsers }]
    : [
        { key: 'created', label: 'Created', rows: batch.created || [] },
        { key: 'updated', label: 'Updated', rows: batch.updated || [] },
        { key: 'reactivated', label: 'Reactivated', rows: batch.reactivated || [] },
      ]

  return (
    <div className="import-block" style={{ marginTop: '0.75rem' }}>
      {batch.message ? <p className="muted">{batch.message}</p> : null}
      {isPending ? (
        <p>
          <strong>{batch.user_count ?? batch.submitted_user_count ?? pendingUsers.length}</strong> user
          {(batch.user_count ?? batch.submitted_user_count ?? pendingUsers.length) === 1 ? '' : 's'} in
          this submitted sheet (pending import).
        </p>
      ) : null}
      {sections.map((section) =>
        section.rows.length > 0 ? (
          <div key={section.key} style={{ marginBottom: '0.75rem' }}>
            <h4>
              {section.label} ({section.rows.length})
            </h4>
            <ul className="muted">
              {section.rows.map((row) => (
                <li key={`${section.key}-${row.email || row.name}`}>
                  {row.name || '—'} ({row.email || '—'})
                  {row.role ? ` · ${row.role}` : ''}
                  {row.firm ? ` · ${row.firm}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null
      )}
      {(batch.skipped || []).length > 0 ? (
        <div>
          <h4>Skipped ({batch.skipped.length})</h4>
          <ul className="muted">
            {batch.skipped.map((row) => (
              <li key={`skipped-${row.row}-${row.email || 'x'}`}>
                Row {row.row}
                {row.email ? ` (${row.email})` : ''}: {row.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default function AdminAdvisors({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, advisorBillingEnabled, canManagePaymentCard, actingHub } = useHub()
  const [batches, setBatches] = useState([])
  const [historyMeta, setHistoryMeta] = useState({ total: 0 })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [file, setFile] = useState(null)
  const [submitFile, setSubmitFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [importingSubmissionId, setImportingSubmissionId] = useState(null)
  const [quote, setQuote] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('stripe')
  const [paying, setPaying] = useState(false)
  const [bankResult, setBankResult] = useState(null)
  const [expandedBatchId, setExpandedBatchId] = useState(null)

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const canImport = can('advisor_excel_import')
  const canSubmit = can('advisor_excel_submit')
  const canDownloadTemplate = can('advisor_excel_template') || canImport || canSubmit
  const enabled = canImport || can('advisor_excel_template') || canSubmit
  const billingEnabled = advisorBillingEnabled
  const canViewInvoices = can('dashboard_view_advisor_invoices')
  const eyebrow = 'Advisors & billing'
  const apiOpts = { asPowerAdmin }
  const invoicesPath = '/my-dashboard/advisor-invoices'

  const loadHistory = async () => {
    if (!enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.advisorImportHistory({ per_page: 50 }, apiOpts)
      setBatches(data.batches || [])
      setHistoryMeta(data.meta || { total: 0 })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hubLoading) return
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLoading, enabled, asPowerAdmin, actingHub?.id])

  const downloadTemplate = async () => {
    setError('')
    try {
      const response = await fetch(api.advisorTemplateUrl(apiOpts), {
        credentials: 'include',
        headers: {
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'X-Requested-With': 'XMLHttpRequest',
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
      a.download = 'advisor-import-template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  const onImport = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Choose an Excel (.xlsx) file to import.')
      return
    }
    const name = (file.name || '').toLowerCase()
    if (!name.endsWith('.xlsx')) {
      setError('Only Excel (.xlsx) files are supported. Download the template and fill it in.')
      return
    }
    setUploading(true)
    setError('')
    setMessage('Import queued… processing in the background.')
    setResult(null)
    setQuote(null)
    setBankResult(null)
    try {
      const data = await api.importAdvisors(file, apiOpts)
      setMessage(data.message || 'Import ready.')
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
      if (!data.awaiting_payment) {
        await loadHistory()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const onSubmitSheet = async (e) => {
    e.preventDefault()
    if (!submitFile) {
      setError('Choose a filled Excel (.xlsx) file to send for import.')
      return
    }
    const name = (submitFile.name || '').toLowerCase()
    if (!name.endsWith('.xlsx')) {
      setError('Only Excel (.xlsx) files are supported. Download the template and fill it in.')
      return
    }
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const data = await api.submitAdvisorImportSheet(submitFile, apiOpts)
      setMessage(data.message || 'Excel sheet sent for import.')
      setSubmitFile(null)
      await loadHistory()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const onImportSubmission = async (batch) => {
    if (!batch?.id) return
    const ok = window.confirm(
      `Import the sheet “${batch.original_filename || 'submission'}” with ${batch.user_count ?? batch.submitted_user_count ?? 0} pending user(s)?`
    )
    if (!ok) return

    setImportingSubmissionId(batch.id)
    setError('')
    setMessage('Importing submitted sheet…')
    setResult(null)
    setQuote(null)
    try {
      const data = await api.importAdvisorSubmission(batch.id, apiOpts)
      setMessage(data.message || 'Submitted sheet imported.')
      setResult(data)
      setQuote(data.quote || null)
      if (data.quote?.error) {
        setError(data.quote.error)
      }
      await loadHistory()
    } catch (err) {
      setError(err.message)
    } finally {
      setImportingSubmissionId(null)
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
      if (data.import) {
        setResult({
          ...(result || {}),
          ...data.import,
          awaiting_payment: false,
        })
      }
      if (data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }
      setBankResult(data)
      if (data.charged_saved_card || data.auto_confirmed) {
        setMessage(data.message || 'Payment successful. Advisors created and invoice issued.')
        setQuote({
          ...quote,
          billing: data.billing,
          payment_required: false,
        })
      } else if (data.import) {
        setMessage(data.message || 'Advisors created. Complete payment to finish billing.')
      }
      await loadHistory()
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
            <h1>Import Users</h1>
            <p className="muted">
              Advisor import tools are disabled for your role on this hub. Enable
              &quot;Import advisors&quot;, &quot;Download import Excel template&quot;, and/or
              &quot;Submit filled Excel for import&quot; under Power Admin → Capabilities.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const pendingBilling =
    quote?.payment_required && quote?.billing && quote.billing.payment_status !== 'paid'
  const showPaymentPanel = Boolean(pendingBilling || (quote?.payment_required && quote?.error))

  const historyColumns = useMemo(
    () => [
      {
        key: 'created_at',
        label: 'When',
        render: (row) => <DataGridDate value={row.created_at} />,
      },
      {
        key: 'imported_by',
        label: 'By',
        filterValue: (row) =>
          [row.submitted_by?.name || row.imported_by?.name, row.submitted_by?.email || row.imported_by?.email]
            .filter(Boolean)
            .join(' '),
        render: (row) => {
          const person = row.submitted_by || row.imported_by
          return person?.name
            ? `${person.name}${person.email ? ` (${person.email})` : ''}`
            : '—'
        },
      },
      {
        key: 'original_filename',
        label: 'File',
        render: (row) => row.original_filename || '—',
      },
      {
        key: 'summary',
        label: 'Users / summary',
        filterValue: (row) =>
          row.status === 'pending'
            ? `pending ${row.user_count ?? row.submitted_user_count ?? 0} users`
            : `created ${row.summary?.created ?? 0} updated ${row.summary?.updated ?? 0} reactivated ${row.summary?.reactivated ?? 0} skipped ${row.summary?.skipped ?? 0}`,
        render: (row) =>
          row.status === 'pending'
            ? `${row.user_count ?? row.submitted_user_count ?? 0} users (sent for import)`
            : `${row.summary?.created ?? 0} created · ${row.summary?.updated ?? 0} updated · ${row.summary?.reactivated ?? 0} reactivated · ${row.summary?.skipped ?? 0} skipped`,
      },
      {
        key: 'status',
        label: 'Status',
        filterValue: (row) =>
          row.status === 'pending'
            ? 'Pending'
            : row.status === 'completed'
              ? 'Completed'
              : row.status || '',
        render: (row) => {
          const pending = row.status === 'pending'
          const label = pending
            ? 'Pending'
            : row.status === 'completed'
              ? 'Completed'
              : row.status || '—'
          return <span className={`badge ${row.status === 'completed' ? 'ok' : ''}`}>{label}</span>
        },
      },
    ],
    []
  )

  const expandedBatch = useMemo(
    () => batches.find((batch) => batch.id === expandedBatchId) || null,
    [batches, expandedBatchId]
  )

  const pageDescription = (() => {
    if (canImport && canSubmit) {
      return billingEnabled
        ? 'Download the template, send a filled sheet for import, or import directly. New advisors are created only after Pay now when billing applies.'
        : 'Download the template, send a filled sheet for an importer, or import a sheet yourself.'
    }
    if (canSubmit) {
      return 'Download the Excel template, fill in the users, then send the completed sheet here. An importer will process it (status Pending until then).'
    }
    if (canDownloadTemplate && !canImport) {
      return 'Download the Excel template, fill in the users, then send the completed sheet to a colleague who can Import advisors.'
    }
    if (canImport) {
      return 'Upload a filled Excel sheet of users for this white-labelled hub.'
    }
    return 'Import user tools for this white-labelled hub.'
  })()

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>Import Users</h1>
          <p className="muted">
            {pageDescription}
            {canImport && billingEnabled
              ? ' The client admin pays rate × advisors per import batch (card is saved for auto-renew).'
              : ''}
            {' '}
            To discontinue a user, use Hub → Users.
          </p>
        </div>
        <div className="actions">
          {canManagePaymentCard && !asPowerAdmin && canImport && (
            <Link className="btn ghost" to="/my-dashboard/payment-card">
              Payment card
            </Link>
          )}
          {canViewInvoices && (
            <Link className="btn ghost" to={invoicesPath}>
              Advisor invoices
            </Link>
          )}
          {canDownloadTemplate && (
            <button type="button" className="btn ghost" onClick={downloadTemplate}>
              Download Excel template
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {canSubmit && (
        <form className="admin-form advisor-import-form" onSubmit={onSubmitSheet}>
          <h2>Send filled Excel for import</h2>
          <p className="muted">
            Upload the completed sheet. It is queued as <strong>Pending</strong> with the user count
            for someone who has &quot;Import advisors&quot;. Users are not created until they import it.
          </p>
          <FileDropzone
            id="admin-advisors-submit-xlsx"
            label="Filled Excel file (.xlsx)"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            files={submitFile ? [submitFile] : []}
            onChange={(next) => setSubmitFile(next[0] || null)}
            disabled={submitting}
          />
          <div className="actions">
            <button className="btn primary" disabled={submitting || !submitFile}>
              {submitting ? 'Sending…' : 'Send for import'}
            </button>
          </div>
        </form>
      )}

      {canDownloadTemplate && !canImport && !canSubmit && (
        <div className="import-result">
          <h2>Fill the Excel template</h2>
          <p className="muted">
            Download the blank template (role, firm, and modules dropdowns included), complete the
            rows for each user, then ask an admin to enable &quot;Submit filled Excel for import&quot;
            so you can send it, or send the file outside the app to someone with Import advisors.
          </p>
          <div className="actions">
            <button type="button" className="btn primary" onClick={downloadTemplate}>
              Download Excel template
            </button>
          </div>
        </div>
      )}

      {canImport && (
        <form className="admin-form advisor-import-form" onSubmit={onImport}>
          <h2>Import users now</h2>
          <p className="muted">
            Import a filled .xlsx yourself, or use <strong>Import submitted sheet</strong> on a
            Pending row in history below.
          </p>
          <FileDropzone
            id="admin-advisors-import-xlsx"
            label="Excel file (.xlsx)"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            files={file ? [file] : []}
            onChange={(next) => setFile(next[0] || null)}
            disabled={uploading}
          />
          <div className="actions">
            <button className="btn primary" disabled={uploading || !file}>
              {uploading ? 'Checking file...' : billingEnabled ? 'Review & continue' : 'Import advisors'}
            </button>
          </div>
        </form>
      )}

      {canImport && showPaymentPanel && (
        <div className="import-result">
          <h2>Payment required</h2>
          <p className="muted">
            No advisor accounts have been created yet. Choose a payment method and click Pay now
            to create them and issue the invoice for this batch.
          </p>
          {quote?.payer && (
            <p className="muted">
              Payer (client admin): <strong>{quote.payer.name}</strong> ({quote.payer.email})
            </p>
          )}
          {quote?.billing ? (
            <>
              <p>
                This import batch: <strong>{formatMoney(quote.rate_per_advisor, quote.currency)}</strong> ×{' '}
                <strong>{quote.batch_count ?? quote.advisor_count}</strong> new advisors ={' '}
                <strong>{formatMoney(quote.amount, quote.currency)}</strong>
                {quote.tier?.label ? ` (${quote.tier.label})` : ''}
              </p>
              {quote.total_advisors != null && (
                <p className="muted">
                  Tier rate is based on <strong>{quote.total_advisors}</strong> total advisors on the hub.
                  Previously paid advisors are not charged again on this invoice.
                </p>
              )}
              {quote.renewal_preview && (
                <p className="muted">
                  Monthly auto-renew (one invoice):{' '}
                  {formatMoney(quote.renewal_preview.rate_per_advisor, quote.renewal_preview.currency)} ×{' '}
                  {quote.renewal_preview.advisor_count} ={' '}
                  {formatMoney(quote.renewal_preview.amount, quote.renewal_preview.currency)}
                </p>
              )}
            </>
          ) : (
            <p className="muted">{quote?.error || 'Unable to build billing quote.'}</p>
          )}
          <p className="muted">
            {quote?.formula || 'amount = rate(total_advisors) × batch_count'}
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

      {canImport && result && (
        <div className="import-result">
          <h2>{result.awaiting_payment ? 'Import preview' : 'Import result'}</h2>
          <p className="muted">
            {result.awaiting_payment
              ? `Will create ${result.summary?.created ?? result.preview?.created?.length ?? 0}, update ${result.summary?.updated ?? result.preview?.updated?.length ?? 0}, skip ${result.summary?.skipped ?? 0} — after payment.`
              : `Created ${result.summary?.created ?? 0}, updated ${result.summary?.updated ?? 0}, skipped ${result.summary?.skipped ?? 0}`}
          </p>

          {result.awaiting_payment && (result.preview?.created || []).length > 0 && (
            <div className="import-block">
              <h3>Users to create (after Pay now)</h3>
              <ul className="muted">
                {result.preview.created.map((row) => (
                  <li key={row.email}>
                    {row.name} ({row.email})
                    {row.role ? ` · ${row.role}` : ''}
                    {row.firm ? ` · ${row.firm}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!result.awaiting_payment && (result.created || []).length > 0 && (
            <div className="import-block">
              <h3>New users (save temporary passwords now)</h3>
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Firm</th>
                      <th>Temporary password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.created.map((row) => (
                      <tr key={row.email}>
                        <td>{row.name}</td>
                        <td>{row.email}</td>
                        <td>{row.role || '—'}</td>
                        <td>{row.firm || '—'}</td>
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
        <h2>Import history</h2>
        <p className="muted">
          Submitted sheets show as <strong>Pending</strong> with how many users are in the file.
          Completed imports list created / updated / skipped counts
          {historyMeta?.total != null ? ` · ${historyMeta.total} total` : ''}.
        </p>
        <DataGrid
          columns={historyColumns}
          rows={batches}
          loading={loading}
          emptyMessage="No imports or submissions recorded yet."
          pageSize={10}
          getRowKey={(row) => row.id}
          actions={(batch) => (
            <div className="actions" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() =>
                  setExpandedBatchId((current) => (current === batch.id ? null : batch.id))
                }
              >
                {expandedBatchId === batch.id ? <FaChevronDown /> : <FaChevronRight />}
                <span style={{ marginLeft: '0.35rem' }}>
                  {expandedBatchId === batch.id ? 'Hide' : 'Details'}
                </span>
              </button>
              {canImport && batch.can_import_submission ? (
                <button
                  type="button"
                  className="btn primary"
                  disabled={importingSubmissionId === batch.id}
                  onClick={() => onImportSubmission(batch)}
                >
                  {importingSubmissionId === batch.id ? 'Importing…' : 'Import submitted sheet'}
                </button>
              ) : null}
            </div>
          )}
        />
        {expandedBatch ? (
          <div className="import-result" style={{ marginTop: '1rem' }}>
            <h3>
              {expandedBatch.status === 'pending' ? 'Submission details' : 'Import details'}
              {expandedBatch.original_filename ? ` · ${expandedBatch.original_filename}` : ''}
            </h3>
            <ImportBatchDetails batch={expandedBatch} />
          </div>
        ) : null}
      </div>
    </section>
  )
}
