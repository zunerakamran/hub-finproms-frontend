import { Link } from 'react-router-dom'
import { formatMoney, typeLabel } from './invoicesNav'
import { invoiceDetailPath } from './InvoicesModuleLayout'

function formatListDate(value) {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function InvoiceListPane({
  items,
  loading,
  error,
  selectedId,
  folder,
  emptyHint,
}) {
  const folderTitle =
    folder === 'subscription'
      ? 'Subscriptions'
      : folder === 'post_purchase'
        ? 'Post purchases'
        : folder === 'bundle_purchase'
          ? 'Bundle purchases'
          : 'All invoices'

  return (
    <section className="nested-module__list" aria-label={folderTitle}>
      <div className="nested-module__list-head">
        <h2>{folderTitle}</h2>
        <span className="muted">{loading ? '…' : `${items.length} item${items.length === 1 ? '' : 's'}`}</span>
      </div>

      {error ? <div className="alert nested-module__list-alert">{error}</div> : null}

      <div className="nested-module__list-body">
        {loading ? (
          <div className="state nested-module__state">Loading invoices…</div>
        ) : items.length === 0 ? (
          <div className="state nested-module__state">{emptyHint}</div>
        ) : (
          <ul className="nested-module__rows">
            {items.map((row) => {
              const selected = String(selectedId) === String(row.id)
              const initial = String(row.invoice_number || 'I').charAt(0).toUpperCase()
              return (
                <li key={row.id}>
                  <Link
                    to={invoiceDetailPath(row.id, folder)}
                    className={`nested-module__row${selected ? ' is-selected' : ''}`}
                  >
                    <span className="nested-module__avatar" aria-hidden="true">
                      {initial}
                    </span>
                    <span className="nested-module__row-main">
                      <span className="nested-module__row-top">
                        <strong>{row.invoice_number}</strong>
                        <time dateTime={row.issued_at || undefined}>
                          {formatListDate(row.issued_at)}
                        </time>
                      </span>
                      <span className="nested-module__row-preview muted">
                        {row.description || typeLabel(row.type)}
                      </span>
                      <span className="nested-module__row-meta">
                        <span className="badge">{typeLabel(row.type)}</span>
                        <span className="nested-module__amount">
                          {formatMoney(row.amount, row.currency)}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
