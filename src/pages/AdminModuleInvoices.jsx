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

function typesBadgeClass(types) {
  if (types === 'one_time') return 'badge badge-types badge-types--one-time'
  if (types === 'per_user_buying') return 'badge badge-types badge-types--per-user'
  if (types === 'ongoing') return 'badge badge-types badge-types--ongoing'
  return 'badge badge-types'
}

export default function AdminModuleInvoices({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHub } = useHub()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createdNote, setCreatedNote] = useState('')
  const [targetHub, setTargetHub] = useState(null)

  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const enabled = can('dashboard_view_module_invoices')
  const eyebrow = 'Modules'

  useEffect(() => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    setCreatedNote('')
    api
      .moduleInvoices({}, { asPowerAdmin })
      .then((data) => {
        setItems(data.data || [])
        setTargetHub(data.target_hub || null)
        const created = data.module_invoices_created || []
        if (created.length > 0) {
          setCreatedNote(
            `Generated ${created.length} missing module invoice${created.length === 1 ? '' : 's'} for enabled modules.`
          )
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [hubLoading, enabled, asPowerAdmin, actingHub?.id])

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>Module invoices</h1>
            <p className="muted">
              Enable &quot;View module invoices&quot; for your role under Power Admin → Capabilities,
              and turn on Functionalities → Charge amount per module (one time).
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
          <h1>Module invoices</h1>
          <p className="muted">
            One-time module catalogue charges
            {targetHub?.name ? ` for ${targetHub.name}` : ' for this hub'}. Charged by FinProms
            (Stripe merchant account pending). Open an unpaid invoice to mark it paid when you have
            the &quot;Mark module invoices as paid&quot; capability.
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {createdNote && <div className="alert success">{createdNote}</div>}

      {!loading && targetHub && targetHub.charge_amount_per_module === false && (
        <div className="alert">
          Functionality &quot;Charge amount per module (one time)&quot; is off for this hub — enable
          it under Functionalities to generate invoices for enabled modules.
        </div>
      )}

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
            key: 'module',
            label: 'Module',
            fit: true,
            filterValue: (row) => row.module_billing?.module_key || '',
            render: (row) => row.module_billing?.module_key || '—',
          },
          {
            key: 'types',
            label: 'Types',
            fit: true,
            filterValue: (row) => typesLabel(row.types),
            render: (row) => (
              <span className={typesBadgeClass(row.types || 'one_time')}>
                {typesLabel(row.types || 'one_time')}
              </span>
            ),
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
            render: (row) => formatMoney(row.amount, row.currency),
          },
          {
            key: 'charged_by',
            label: 'Charged by',
            fit: true,
            filterValue: () => 'FinProms platform',
            render: () => (
              <div>
                <div>FinProms platform</div>
                <div className="muted" style={{ fontSize: '0.8em' }}>
                  Stripe TBD
                </div>
              </div>
            ),
          },
          {
            key: 'issued_at',
            label: 'Issued',
            fit: true,
            filterValue: (row) => formatDate(row.issued_at),
            render: (row) => <DataGridDate value={row.issued_at} />,
          },
        ]}
        rows={items}
        loading={loading}
        emptyMessage="No module invoices yet."
        getRowKey={(row) => row.id}
        rowLink={(row) => `/my-dashboard/module-invoices/${row.id}`}
        actions={(row) => (
          <DataGridIconBtn
            icon={FaEye}
            label="View"
            as={Link}
            to={`/my-dashboard/module-invoices/${row.id}`}
          />
        )}
      />
    </section>
  )
}
