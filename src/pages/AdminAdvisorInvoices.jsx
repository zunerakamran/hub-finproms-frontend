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

function typesLabel(types) {
  if (types === 'one_time') return 'One time'
  if (types === 'per_user_buying') return 'Per user buying'
  if (types === 'ongoing') return 'Ongoing'
  return types || '—'
}

export default function AdminAdvisorInvoices({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub } = useHub()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_view_advisor_invoices')
  const eyebrow = 'Advisors & billing'

  useEffect(() => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    api
      .advisorInvoices({}, { asPowerAdmin })
      .then((data) => setItems(data.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [hubLoading, enabled, asPowerAdmin, actingHub?.id])

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
          <p className="muted">Invoices for rate × advisors white-labelled hub subscription billing.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

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
            filterValue: () => 'Advisor billing',
            render: () => <span className="badge">Advisor billing</span>,
          },
          {
            key: 'types',
            label: 'Types',
            fit: true,
            filterValue: (row) => typesLabel(row.types),
            render: (row) => <span className="badge">{typesLabel(row.types)}</span>,
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
              row.issued_at ? formatDate(row.issued_at, '') : '',
            render: (row) => <DataGridDate value={row.issued_at} withTime={false} />,
          },
        ]}
        rows={items}
        loading={loading}
        emptyMessage="No advisor billing invoices yet."
        getRowKey={(row) => row.id}
        rowLink={(row) => `/my-dashboard/advisor-invoices/${row.id}`}
        actions={(row) => (
          <DataGridIconBtn
            icon={FaEye}
            label="View"
            as={Link}
            to={`/my-dashboard/advisor-invoices/${row.id}`}
          />
        )}
      />
    </section>
  )
}
