import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function BundleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, setUser, refreshUser } = useAuth()
  const { can, isActingAsAdvisor } = useHub()
  const [bundle, setBundle] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [oneOffPurchase, setOneOffPurchase] = useState(false)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [checkoutKey, setCheckoutKey] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.bundle(id)
      setBundle(data.bundle)
      setPaymentMethods(data.payment_methods || [])
      setOneOffPurchase(
        data.one_off_purchase !== undefined
          ? Boolean(data.one_off_purchase)
          : can('one_off_purchase')
      )
    } catch (err) {
      setError(err.message)
      setBundle(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id, user?.credits])

  const purchaseWithCredits = async () => {
    if (!user) return
    setBuying(true)
    setError('')
    setMessage('')
    try {
      const data = await api.purchaseBundle(id)
      setBundle(data.bundle)
      if (data.user) setUser(data.user)
      setMessage(data.message || 'Bundle purchased.')
      await refreshUser()
    } catch (err) {
      setError(err.message)
    } finally {
      setBuying(false)
    }
  }

  const purchaseWithPayment = async (paymentMethod) => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/bundles/${id}` } } })
      return
    }
    setCheckoutKey(paymentMethod)
    setError('')
    setMessage('')
    try {
      const data = await api.purchaseBundle(id, paymentMethod)
      if (data.payment_method === 'stripe' && data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }
      if (data.payment_method === 'bank_transfer') {
        if (data.auto_confirmed) {
          if (data.bundle) setBundle(data.bundle)
          if (data.user) setUser(data.user)
          setMessage(data.message || 'Bundle purchased.')
          await refreshUser()
          return
        }
        navigate('/subscriptions/bank-transfer', {
          state: {
            payment_reference: data.payment_reference,
            amount: data.amount,
            bank_details: data.bank_details,
            message: data.message,
            auto_confirmed: false,
            item_title: data.item_title || bundle?.title,
            invoice: data.invoice,
            user: data.user,
          },
        })
        return
      }
      if (data.bundle) setBundle(data.bundle)
      if (data.user) setUser(data.user)
      setMessage(data.message || 'Bundle purchased.')
      await refreshUser()
    } catch (err) {
      setError(err.message)
      setCheckoutKey(null)
    } finally {
      setCheckoutKey(null)
    }
  }

  if (loading) return <div className="state">Loading...</div>
  if (!bundle) {
    return (
      <section>
        <div className="alert">{error || 'Bundle not found.'}</div>
        <Link to="/bundles" className="btn ghost">
          Back to bundles
        </Link>
      </section>
    )
  }

  const canBuy =
    can('member_purchase_content') && user && !bundle.is_purchased && bundle.is_active !== false
  const unlimited =
    user?.has_unlimited_credits ||
    (can('unlimited_credits') && (user?.is_advisor || isActingAsAdvisor))
  const hasCredits = unlimited || (user?.credits ?? 0) >= (bundle.credits_cost ?? 0)
  const oneOffEnabled = oneOffPurchase || can('one_off_purchase')
  const stripeMethod = paymentMethods.find((m) => m.id === 'stripe') || {
    id: 'stripe',
    available: false,
    unavailable_reason: 'Stripe is not configured yet.',
  }
  const bankMethod = paymentMethods.find((m) => m.id === 'bank_transfer') || {
    id: 'bank_transfer',
    available: false,
    unavailable_reason: 'Bank transfer is disabled by Power Admin.',
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Bundle</p>
          <h1>{bundle.title}</h1>
          <p className="muted">
            {bundle.posts_count ?? bundle.posts?.length ?? 0} posts · {bundle.credits_cost} credits
            (£{bundle.credits_cost})
          </p>
        </div>
        <Link to="/bundles" className="btn ghost">
          All bundles
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {bundle.description && <p className="muted">{bundle.description}</p>}

      <div className="actions" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {bundle.is_purchased ? (
          <span className="badge">Purchased — all posts unlocked</span>
        ) : canBuy ? (
          <>
            {hasCredits && (
              <button className="btn primary" disabled={buying || checkoutKey} onClick={purchaseWithCredits}>
                {buying ? 'Purchasing...' : `Buy with credits (${bundle.credits_cost})`}
              </button>
            )}
            {oneOffEnabled && (
              <>
                <button
                  className="btn primary"
                  disabled={!stripeMethod.available || Boolean(checkoutKey)}
                  onClick={() => purchaseWithPayment('stripe')}
                  title={stripeMethod.unavailable_reason || undefined}
                >
                  {checkoutKey === 'stripe'
                    ? 'Redirecting to Stripe...'
                    : stripeMethod.available
                      ? 'Pay with Stripe'
                      : 'Stripe unavailable'}
                </button>
                <button
                  className="btn ghost"
                  disabled={!bankMethod.available || Boolean(checkoutKey)}
                  onClick={() => purchaseWithPayment('bank_transfer')}
                  title={bankMethod.unavailable_reason || undefined}
                >
                  {checkoutKey === 'bank_transfer'
                    ? 'Completing test payment...'
                    : bankMethod.available
                      ? 'Pay by bank transfer'
                      : 'Bank transfer unavailable'}
                </button>
              </>
            )}
            {!hasCredits && !oneOffEnabled && (
              <p className="muted">
                Insufficient credits.
                {can('member_view_plans') && (
                  <>
                    {' '}
                    <Link to="/subscriptions">Get a plan</Link>
                  </>
                )}
              </p>
            )}
          </>
        ) : !user ? (
          <Link to="/login" className="btn primary">
            Sign in to purchase
          </Link>
        ) : null}
      </div>

      {canBuy && oneOffEnabled && (
        <div style={{ marginTop: '-0.75rem', marginBottom: '1.5rem' }}>
          <p className="muted">
            No subscription required — pay with credits or an enabled payment method (1 credit = £1).
          </p>
          {!stripeMethod.available && stripeMethod.unavailable_reason && (
            <p className="field-hint">{stripeMethod.unavailable_reason}</p>
          )}
          {!bankMethod.available && bankMethod.unavailable_reason && (
            <p className="field-hint">{bankMethod.unavailable_reason}</p>
          )}
        </div>
      )}

      <h2 className="section-title">Included posts</h2>
      <div className="admin-list">
        {(bundle.posts || []).map((post) => (
          <div key={post.id} className="admin-row">
            {post.cover_url ? (
              <img className="admin-thumb" src={post.cover_url} alt="" />
            ) : post.video_url || post.is_reel ? (
              <div className="admin-thumb fallback reel-thumb">Reel</div>
            ) : (
              <div className="admin-thumb fallback" />
            )}
            <div>
              <strong>{post.title}</strong>
              <p className="muted">
                {post.type} · {post.category}
                {post.is_purchased ? ' · unlocked' : ''}
              </p>
            </div>
            <Link to={`/posts/${post.id}`} className="btn ghost">
              View
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
