import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

export default function AdminPaymentCardSuccess() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = params.get('session_id')
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) {
      setError('Missing Stripe session.')
      setLoading(false)
      return
    }
    api
      .confirmPaymentCard(sessionId)
      .then((data) => setProfile(data.payment_profile))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Payment card</p>
          <h1>Card setup result</h1>
        </div>
      </div>

      {loading && <div className="state">Saving card...</div>}
      {error && <div className="alert">{error}</div>}

      {!loading && !error && (
        <div className="import-result">
          <h2>{profile?.has_saved_card ? 'Card saved' : 'Setup recorded'}</h2>
          <p className="muted">
            {profile?.has_saved_card
              ? 'Future advisor imports that use Stripe will charge this card.'
              : 'Stripe checkout completed but no card was found on the session.'}
          </p>
          <div className="actions">
            <Link className="btn primary" to="/client-admin/payment-card">
              Back to payment card
            </Link>
            <button
              type="button"
              className="btn ghost"
              onClick={() => navigate('/client-admin/advisors')}
            >
              Advisor import
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
