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

function typeLabel(type) {
  if (type === 'post_purchase') return 'Post purchase'
  if (type === 'bundle_purchase') return 'Bundle purchase'
  if (type === 'module_billing') return 'Module (one time)'
  return type || '—'
}

export default function AdminOneTimeInvoices({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub, isActingRemotely } = useHub()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ total: 0 })
  const [hubMeta, setHubMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_view_one_time_invoices')

  const targetName = isActingRemotely
    ? actingHub?.name || hubMeta?.name || 'selected hub'
    : hubMeta?.name || 'this hub'

  useEffect(() => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    api
      .oneTimeInvoices({ per_page: 100 }, { asPowerAdmin })
      .then((data) => {
        setItems(data.data || [])
        setMeta(data.meta || { total: data.total ?? (data.data || []).length })
        setHubMeta(data.hub || null)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load one-time invoices.')
        setItems([])
      })
      .finally(() => setLoading(false))
  }, [hubLoading, enabled, asPowerAdmin, actingHub?.id, isActingRemotely])

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Hub</p>
            <h1>One-time invoices</h1>
          </div>
        </div>
        <div className="empty-state">
          <h2>Capability disabled</h2>
          <p className="muted">
            Enable &quot;View one-time invoices&quot; under Capabilities for your role on this hub.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>One-time invoices</h1>
          <p className="muted">
            All one-time invoices for <strong>{targetName}</strong>
            {meta?.total != null ? ` · ${meta.total} total` : ''} — content purchases and one-time
            module charges.
          </p>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

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
            label: 'Billed to',
            filterValue: (row) => row.user?.name || row.user?.email || '',
            render: (row) =>
              row.user ? (
                <div>
                  <div>{row.user.name || '—'}</div>
                  {row.user.email ? (
                    <div className="muted" style={{ fontSize: '0.85em' }}>
                      {row.user.email}
                    </div>
                  ) : null}
                </div>
              ) : (
                '—'
              ),
          },
          {
            key: 'description',
            label: 'Description',
            grow: true,
            filterValue: (row) => row.description || '',
          },
          {
            key: 'type',
            label: 'Type',
            fit: true,
            filterValue: (row) => typeLabel(row.type),
            render: (row) => typeLabel(row.type),
          },
          {
            key: 'types',
            label: 'Types',
            fit: true,
            filterValue: () => 'One time',
            render: () => <span className="badge badge-types badge-types--one-time">One time</span>,
          },
          {
            key: 'status',
            label: 'Status',
            fit: true,
            filterValue: (row) => row.status || '',
            render: (row) => (
              <span className={`badge ${row.status === 'paid' ? 'ok' : 'warn'}`}>
                {row.status || '—'}
              </span>
            ),
          },
          {
            key: 'amount',
            label: 'Amount',
            fit: true,
            filterValue: (row) => String(row.amount ?? ''),
            render: (row) => formatMoney(row.amount, row.currency),
          },
          {
            key: 'issued_at',
            label: 'Issued',
            fit: true,
            filterValue: (row) => formatDate(row.issued_at, ''),
            render: (row) => <DataGridDate value={row.issued_at} />,
          },
        ]}
        rows={items}
        loading={loading}
        emptyMessage="No one-time invoices for this hub yet."
        getRowKey={(row) => row.id}
        rowLink={(row) => `/my-dashboard/one-time-invoices/${row.id}`}
        actions={(row) => (
          <DataGridIconBtn
            icon={FaEye}
            label="View"
            as={Link}
            to={`/my-dashboard/one-time-invoices/${row.id}`}
          />
        )}
      />
    </section>
  )
}
