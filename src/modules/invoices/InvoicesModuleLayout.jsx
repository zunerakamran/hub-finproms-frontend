import { NavLink, Outlet, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useHub } from '../../context/HubContext'
import InvoiceListPane from './InvoiceListPane'
import { INVOICE_FOLDERS, filterInvoicesByFolder } from './invoicesNav'

export default function InvoicesModuleLayout() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const folder = searchParams.get('folder') || 'all'
  const { isActingOnWhiteLabel, hub, actingHub } = useHub()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isWhiteLabel = Boolean(
    isActingOnWhiteLabel || hub?.type === 'white_label' || actingHub?.is_white_label
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .myInvoices()
      .then((data) => {
        if (!cancelled) setItems(data.data || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => filterInvoicesByFolder(items, folder), [items, folder])

  const folderCounts = useMemo(() => {
    const counts = { all: items.length }
    for (const f of INVOICE_FOLDERS) {
      if (f.types) {
        counts[f.id] = items.filter((item) => f.types.includes(item.type)).length
      }
    }
    return counts
  }, [items])

  const setFolder = (nextId) => {
    const next = new URLSearchParams(searchParams)
    if (nextId === 'all') next.delete('folder')
    else next.set('folder', nextId)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="nested-module">
      <aside className="nested-module__secondary" aria-label="Invoice folders">
        <div className="nested-module__secondary-head">
          <h2>Invoices</h2>
          <p className="muted">
            {isWhiteLabel
              ? 'Receipts for content purchases on this hub.'
              : 'Receipts for subscriptions and purchases.'}
          </p>
        </div>

        <nav className="nested-module__folders">
          {INVOICE_FOLDERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={folder === f.id ? 'is-active' : undefined}
              onClick={() => setFolder(f.id)}
            >
              <span>{f.label}</span>
              <span className="nested-module__count">{folderCounts[f.id] ?? 0}</span>
            </button>
          ))}
        </nav>

        <div className="nested-module__secondary-foot">
          {isWhiteLabel ? (
            <Link to="/" className="btn primary full">
              Browse catalog
            </Link>
          ) : (
            <Link to="/subscriptions" className="btn primary full">
              Browse plans
            </Link>
          )}
        </div>
      </aside>

      <InvoiceListPane
        items={filtered}
        loading={loading}
        error={error}
        selectedId={id}
        folder={folder}
        emptyHint={
          isWhiteLabel ? (
            <>
              No invoices yet. <Link to="/">Browse the catalog</Link>.
            </>
          ) : (
            <>
              No invoices yet. <Link to="/subscriptions">Browse plans</Link> or{' '}
              <Link to="/">buy a post</Link>.
            </>
          )
        }
      />

      <section className="nested-module__detail" aria-label="Invoice detail">
        {id ? (
          <Outlet />
        ) : (
          <div className="nested-module__empty-detail">
            <p className="eyebrow">Detail</p>
            <h3>Select an invoice</h3>
            <p className="muted">Choose a receipt from the list to view its full details here.</p>
          </div>
        )}
      </section>
    </div>
  )
}

/** Keeps folder query when linking into an invoice from the list. */
export function invoiceDetailPath(invoiceId, folder) {
  const base = `/my-dashboard/invoices/${invoiceId}`
  if (!folder || folder === 'all') return base
  return `${base}?folder=${encodeURIComponent(folder)}`
}

// Silence unused import warning if NavLink not needed — keep for future folder links
void NavLink
