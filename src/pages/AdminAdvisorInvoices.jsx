import { useEffect, useState } from 'react'
import { api } from '../api/client'
import DataGrid from '../components/DataGrid'
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
            render: (row) => <strong>{row.invoice_number}</strong>,
          },
          {
            key: 'description',
            label: 'Description',
            filterValue: (row) => row.description,
          },
          {
            key: 'type',
            label: 'Type',
            filterValue: () => 'Advisor billing',
            render: () => <span className="badge">Advisor billing</span>,
          },
          {
            key: 'amount',
            label: 'Amount',
            filterValue: (row) => String(row.amount),
            render: (row) => formatMoney(row.amount, row.currency),
          },
          {
            key: 'issued_at',
            label: 'Issued',
            filterValue: (row) =>
              row.issued_at ? new Date(row.issued_at).toLocaleDateString() : '',
            render: (row) =>
              row.issued_at ? new Date(row.issued_at).toLocaleDateString() : '—',
          },
        ]}
        rows={items}
        loading={loading}
        emptyMessage="No advisor billing invoices yet."
        getRowKey={(row) => row.id}
        rowLink={(row) => `/my-dashboard/advisor-invoices/${row.id}`}
      />
    </section>
  )
}
