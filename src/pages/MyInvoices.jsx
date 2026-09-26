import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEye } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import { useHub } from '../context/HubContext'

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
  const { isActingOnWhiteLabel, hub, actingHub } = useHub()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isWhiteLabel = Boolean(
    isActingOnWhiteLabel || hub?.type === 'white_label' || actingHub?.is_white_label
  )

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
          <p className="eyebrow">Account</p>
          <h1>My invoices</h1>
          <p className="muted">
            {isWhiteLabel
              ? 'Receipts for content purchases on this hub.'
              : 'Receipts for subscriptions and post purchases.'}
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {!loading && items.length === 0 ? (
        <div className="state">
          No invoices yet.{' '}
          {isWhiteLabel ? (
            <Link to="/">Browse the catalog</Link>
          ) : (
            <>
              <Link to="/subscriptions">Browse plans</Link> or <Link to="/">buy a post</Link>.
            </>
          )}
        </div>
      ) : (
        <DataGrid
          columns={[
            {
              key: 'invoice_number',
              label: 'Invoice #',
              fit: true,
              render: (row) => <strong>{row.invoice_number}</strong>,
            },
            {
              key: 'description',
              label: 'Description',
              grow: true,
              filterValue: (row) => row.description,
            },
            {
              key: 'type',
              label: 'Type',
              fit: true,
              filterValue: (row) => typeLabel(row.type),
              render: (row) => <span className="badge">{typeLabel(row.type)}</span>,
            },
            {
              key: 'amount',
              label: 'Amount',
              fit: true,
              filterValue: (row) => String(row.amount),
              render: (row) => formatMoney(row.amount, row.currency),
            },
            {
              key: 'issued_at',
              label: 'Issued',
              date: true,
              filterValue: (row) =>
                row.issued_at ? new Date(row.issued_at).toLocaleDateString() : '',
              render: (row) => <DataGridDate value={row.issued_at} withTime={false} />,
            },
          ]}
          rows={items}
          loading={loading}
          emptyMessage="No invoices yet."
          pageSize={10}
          getRowKey={(row) => row.id}
          rowLink={(row) => `/my-dashboard/invoices/${row.id}`}
          actions={(row) => (
            <DataGridIconBtn
              icon={FaEye}
              label="View"
              as={Link}
              to={`/my-dashboard/invoices/${row.id}`}
            />
          )}
        />
      )}
    </section>
  )
}
