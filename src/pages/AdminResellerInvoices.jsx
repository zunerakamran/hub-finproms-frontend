import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEye } from 'react-icons/fa'
import { api } from '../api/client'
import DataGrid, { DataGridDate, DataGridIconBtn } from '../components/DataGrid'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatDate } from '../utils/dateFormat'

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

export default function AdminResellerInvoices({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub } = useHub()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_view_reseller_invoices')

  useEffect(() => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    setNote('')
    api
      .resellerInvoices({}, { asPowerAdmin })
      .then((data) => {
        setItems(data.data || [])
        if (data.message) setNote(data.message)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [hubLoading, enabled, asPowerAdmin, actingHub?.id])

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Modules</p>
            <h1>Reseller invoices</h1>
            <p className="muted">
              Enable &quot;See network→user reseller invoices&quot; under Capabilities. Also turn on
              Network resells in Module invoice settings.
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
          <p className="eyebrow">Modules</p>
          <h1>Network→user reseller invoices</h1>
          <p className="muted">
            Invoices the network raises to users when reselling. End users see their own under{' '}
            <Link to="/my-dashboard/my-invoices">My invoices</Link>.
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {note && <div className="alert">{note}</div>}

      {loading ? (
        <div className="state">Loading...</div>
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
              key: 'user',
              label: 'User',
              render: (row) => row.user?.email || row.billing_email || '-',
            },
            {
              key: 'amount',
              label: 'Amount',
              fit: true,
              render: (row) => formatMoney(row.amount, row.currency),
            },
            {
              key: 'status',
              label: 'Status',
              fit: true,
              render: (row) => row.status || '-',
            },
            {
              key: 'issued_at',
              label: 'Issued',
              fit: true,
              render: (row) => <DataGridDate>{formatDate(row.issued_at)}</DataGridDate>,
            },
            {
              key: 'actions',
              label: '',
              fit: true,
              render: (row) => (
                <DataGridIconBtn as={Link} to={`/my-dashboard/my-invoices/${row.id}`} title="View">
                  <FaEye />
                </DataGridIconBtn>
              ),
            },
          ]}
          rows={items}
          empty="No reseller invoices yet."
        />
      )}
    </section>
  )
}
