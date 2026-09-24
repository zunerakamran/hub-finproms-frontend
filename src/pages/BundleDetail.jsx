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
    <section className="detail">
      <Link to="/bundles" className="back">
        ← Back to bundles
      </Link>

      <div className="detail-panel">
        {bundle.image_url ? (
          <div className="detail-cover">
            <img src={bundle.image_url} alt={bundle.title} />
          </div>
        ) : null}

        <div className="post-meta">
          <span>Bundle</span>
          <span>{bundle.posts_count ?? bundle.posts?.length ?? 0} posts</span>
          <span>
            {bundle.credits_cost} credits · £{bundle.credits_cost}
          </span>
          {bundle.is_purchased ? <span className="badge ok">Owned</span> : null}
        </div>

        <h1>{bundle.title}</h1>
        <p>{bundle.description || 'No description provided.'}</p>

        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        {bundle.is_purchased ? (
          <div className="unlock-box">
            <p className="badge ok">Purchased — all posts unlocked</p>
          </div>
        ) : canBuy ? (
          <div className="unlock-box">
            <p>
              Buy this bundle for {bundle.credits_cost} credits (£{bundle.credits_cost}).
              {oneOffEnabled ? ' No subscription required.' : ''}
            </p>
            <p className="muted">
              Your balance:{' '}
              {unlimited ? 'Unlimited' : `${user?.credits ?? 0} credits`}
            </p>
            <div className="actions">
              <button
                className="btn primary"
                onClick={purchaseWithCredits}
                disabled={
                  buying ||
                  Boolean(checkoutKey) ||
                  (!unlimited && Number(user?.credits ?? 0) < Number(bundle.credits_cost ?? 0))
                }
              >
                {buying ? 'Purchasing...' : `Buy with credits (${bundle.credits_cost})`}
              </button>
              {can('member_view_plans') && (
                <Link to="/subscriptions" className="btn ghost">
                  Get more credits
                </Link>
              )}
            </div>
            {oneOffEnabled && (
              <div className="plan-actions" style={{ marginTop: '0.75rem' }}>
                <p className="muted">Or pay directly with an enabled payment method:</p>
                <button
                  className="btn primary full"
                  onClick={() => purchaseWithPayment('stripe')}
                  disabled={!stripeMethod.available || Boolean(checkoutKey)}
                  title={stripeMethod.unavailable_reason || undefined}
                >
                  {checkoutKey === 'stripe'
                    ? 'Redirecting to Stripe...'
                    : stripeMethod.available
                      ? 'Pay with Stripe'
                      : 'Stripe unavailable'}
                </button>
                <button
                  className="btn ghost full"
                  onClick={() => purchaseWithPayment('bank_transfer')}
                  disabled={!bankMethod.available || Boolean(checkoutKey)}
                  title={bankMethod.unavailable_reason || undefined}
                  style={{ marginTop: '0.5rem' }}
                >
                  {checkoutKey === 'bank_transfer'
                    ? 'Completing test payment...'
                    : bankMethod.available
                      ? 'Pay by bank transfer'
                      : 'Bank transfer unavailable'}
                </button>
                {!stripeMethod.available && stripeMethod.unavailable_reason && (
                  <p className="field-hint">{stripeMethod.unavailable_reason}</p>
                )}
                {!bankMethod.available && bankMethod.unavailable_reason && (
                  <p className="field-hint">{bankMethod.unavailable_reason}</p>
                )}
              </div>
            )}
          </div>
        ) : !user ? (
          <div className="unlock-box">
            <p className="muted">Sign in to purchase this bundle with credits.</p>
            <Link to="/login" className="btn primary">
              Sign in to purchase
            </Link>
          </div>
        ) : null}
      </div>

      <h2 className="section-title">Included posts</h2>
      <div className="bundle-included">
        {(bundle.posts || []).map((post) => {
          const isReel = Boolean(post.is_reel) || String(post.type || '').toLowerCase() === 'reel'
          return (
            <Link key={post.id} to={`/posts/${post.id}`} className="bundle-included-card">
              <div className={`bundle-included-card__media${isReel ? ' is-reel' : ''}`}>
                {post.cover_url ? (
                  <img src={post.cover_url} alt="" />
                ) : (
                  <span className="bundle-included-card__fallback">
                    {isReel ? 'Reel' : post.type || 'Post'}
                  </span>
                )}
              </div>
              <div className="bundle-included-card__body">
                <div className="bundle-included-card__meta">
                  {post.type ? <span>{post.type}</span> : null}
                  {post.category ? <span>{post.category}</span> : null}
                  {post.is_purchased ? <span className="is-unlocked">Unlocked</span> : null}
                </div>
                <h3>{post.title}</h3>
                <p>{post.description || 'No description provided.'}</p>
              </div>
              <span className="bundle-included-card__cta">View →</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
