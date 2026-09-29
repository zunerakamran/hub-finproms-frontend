import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

export default function AdvisorBillingSuccess() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = params.get('session_id')
  const [error, setError] = useState('')
  const [billing, setBilling] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) {
      setError('Missing Stripe session.')
      setLoading(false)
      return
    }
    api
      .confirmAdvisorBilling(sessionId)
      .then((data) => setBilling(data.billing))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Advisor billing</p>
          <h1>Payment result</h1>
        </div>
      </div>

      {loading && <div className="state">Confirming payment...</div>}
      {error && <div className="alert">{error}</div>}

      {!loading && !error && (
        <div className="import-result">
          <h2>
            {billing?.payment_status === 'paid' ? 'Payment successful' : 'Checkout recorded'}
          </h2>
          <p className="muted">
            {billing?.auto_renew
              ? 'Stripe subscription is active and will auto-renew monthly.'
              : 'Billing recorded.'}
          </p>
          <div className="actions">
            <Link className="btn primary" to="/my-dashboard/advisor-invoices">
              View advisor invoices
            </Link>
            <button type="button" className="btn ghost" onClick={() => navigate('/my-dashboard/advisors')}>
              Back to advisors
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
