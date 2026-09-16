import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import PostMetrics from '../components/PostMetrics'
import ReelPlayer from '../components/ReelPlayer'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function PostDetail() {
  const { id } = useParams()
  const { user, isAuthenticated, isClientAdmin, setUser, refreshUser } = useAuth()
  const { can, registrationEnabled } = useHub()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [checkoutKey, setCheckoutKey] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [oneOffPurchase, setOneOffPurchase] = useState(false)

  const canPurchase = can('member_purchase_content')
  const canDownload = can('member_download_content')
  const unlimited =
    user?.has_unlimited_credits || (can('unlimited_credits') && user?.is_advisor)
  const oneOffEnabled = oneOffPurchase || can('one_off_purchase')
  const stripeMethod = paymentMethods.find((m) => m.id === 'stripe') || {
    id: 'stripe',
    label: 'Card (Stripe)',
    available: false,
    unavailable_reason: 'Stripe is not configured yet.',
  }
  const bankMethod = paymentMethods.find((m) => m.id === 'bank_transfer') || {
    id: 'bank_transfer',
    label: 'Bank transfer',
    available: false,
    unavailable_reason: 'Bank transfer is disabled by Power Admin.',
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.post(id)
      setPost(data.post)
      setPaymentMethods(data.payment_methods || [])
      setOneOffPurchase(
        data.one_off_purchase !== undefined
          ? Boolean(data.one_off_purchase)
          : can('one_off_purchase')
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.credits, user?.id])

  const buy = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setBuying(true)
    setError('')
    setMessage('')
    setInvoice(null)
    try {
      const data = await api.purchasePost(id)
      setPost(data.post)
      setUser(data.user)
      setMessage(data.message)
      setInvoice(data.invoice || null)
      await refreshUser()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBuying(false)
    }
  }

  const buyWithPayment = async (paymentMethod) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setCheckoutKey(paymentMethod)
    setError('')
    setMessage('')
    setInvoice(null)
    try {
      const data = await api.purchasePost(id, paymentMethod)
      if (data.payment_method === 'stripe' && data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }
      if (data.payment_method === 'bank_transfer' && !data.auto_confirmed) {
        navigate('/subscriptions/bank-transfer', {
          state: {
            payment_reference: data.payment_reference,
            amount: data.amount,
            bank_details: data.bank_details,
            message: data.message,
            auto_confirmed: false,
            item_title: data.item_title || post?.title,
            invoice: data.invoice,
            user: data.user,
          },
        })
        return
      }
      if (data.post) setPost(data.post)
      if (data.user) setUser(data.user)
      setMessage(data.message || 'Post purchased.')
      setInvoice(data.invoice || null)
      await refreshUser()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setCheckoutKey(null)
    }
  }

  if (loading) return <div className="state">Loading...</div>
  if (error && !post) return <div className="alert">{error}</div>
  if (!post) return null

  const locked = Boolean(post.is_locked) && !post.is_purchased && !isClientAdmin
  const unlocked = post.is_purchased || isClientAdmin
  const isReel = Boolean(post.is_reel)
  const previewVideo = post.video_url || (unlocked && post.is_video ? post.attachment_url : null)

  if (locked) {
    return (
      <section className="detail locked-detail">
        <Link to="/" className="back">
          ← Back to posts
        </Link>

        <div className="locked-gate">
          <div className="locked-gate-visual" aria-hidden="true">
            <div className="locked-gate-glow" />
            <div className="locked-gate-icon">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" aria-hidden="true">
                <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M8 10V7a4 4 0 0 1 8 0v3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="15" r="1.4" fill="currentColor" />
              </svg>
            </div>
            <p className="locked-gate-kicker">Login required</p>
          </div>

          <div className="locked-gate-body">
            <div className="locked-gate-meta">
              <span className="locked-pill">{post.type}</span>
              <span className="locked-pill">{post.category}</span>
              <span className="locked-pill cost">{post.credits_cost} credits · £{post.credits_cost}</span>
            </div>

            <h1>{post.title}</h1>
            <p className="locked-gate-lead">
              Sign in to preview this post and buy it with credits — no subscription required. 1
              credit = £1.
            </p>

            <div className="locked-steps">
              <div className="locked-step">
                <span className="locked-step-num">1</span>
                <div>
                  <strong>Create an account</strong>
                  <p>Register or log in to browse the full catalog.</p>
                </div>
              </div>
              <div className="locked-step">
                <span className="locked-step-num">2</span>
                <div>
                  <strong>Get credits</strong>
                  <p>Subscribe for a pack, or top up as you go (1 credit = £1).</p>
                </div>
              </div>
              <div className="locked-step">
                <span className="locked-step-num">3</span>
                <div>
                  <strong>Buy this post</strong>
                  <p>Spend {post.credits_cost} credits to download the creative asset.</p>
                </div>
              </div>
            </div>

            {error && <div className="alert">{error}</div>}

            <div className="locked-gate-actions">
              <Link to="/login" className="btn primary">
                Login
              </Link>
              {registrationEnabled && (
                <Link to="/register" className="btn ghost">
                  Sign up free
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="detail">
      <Link to="/" className="back">
        ← Back to posts
      </Link>
      <div className="detail-panel">
        {previewVideo ? (
          <div className={`detail-cover ${isReel ? 'is-reel' : ''}`}>
            <ReelPlayer src={previewVideo} title={post.title} />
          </div>
        ) : post.cover_url ? (
          <div className="detail-cover">
            <img src={post.cover_url} alt={post.title} />
          </div>
        ) : null}
        <div className="post-meta">
          <span>{post.type}</span>
          <span>{post.category}</span>
          <span>
            {post.credits_cost} credits · £{post.credits_cost}
          </span>
          {post.is_new && <span className="badge new-inline">NEW</span>}
        </div>
        <h1>{post.title}</h1>
        <p className="muted">
          Last updated {new Date(post.last_updated || post.updated_at).toLocaleString()}
        </p>
        <PostMetrics post={post} className="post-metrics detail-metrics" />

        <p>{post.description || 'No description provided.'}</p>
        {!!post.tags?.length && (
          <div className="tags">
            {post.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}

        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        {unlocked ? (
          <div className="unlock-box">
            <p className="badge ok">Unlocked</p>
            {canDownload && post.attachment_url ? (
              <a
                className="btn primary"
                href={post.attachment_url}
                target="_blank"
                rel="noreferrer"
              >
                Download attachment ({post.attachment_name || 'file'})
              </a>
            ) : canDownload ? (
              <p className="muted">No attachment uploaded for this post.</p>
            ) : (
              <p className="muted">Downloads are disabled for this hub by Power Admin.</p>
            )}
            {post.is_purchased &&
              can('module_social_media_compliance') &&
              can('smc_submit_request') && (
                <Link
                  className="btn ghost"
                  to={`/my-dashboard/social-media-compliance/new?post_id=${post.id}`}
                >
                  Send for social media compliance
                </Link>
              )}
            {invoice && can('member_view_invoices') && (
              <p className="muted">
                Invoice {invoice.invoice_number} created ·{' '}
                <Link to={`/my-dashboard/invoices/${invoice.id}`}>View invoice</Link>
              </p>
            )}
          </div>
        ) : canPurchase ? (
          <div className="unlock-box">
            <p>
              Buy this post for {post.credits_cost} credits (£{post.credits_cost}).
              {oneOffEnabled ? ' No subscription required.' : ''}
            </p>
            <p className="muted">
              Your balance:{' '}
              {unlimited ? 'Unlimited' : `${user?.credits ?? 0} credits`}
            </p>
            <div className="actions">
              <button
                className="btn primary"
                onClick={buy}
                disabled={
                  buying ||
                  Boolean(checkoutKey) ||
                  (!unlimited && (user?.credits ?? 0) < post.credits_cost)
                }
              >
                {buying ? 'Purchasing...' : 'Buy with credits'}
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
                  onClick={() => buyWithPayment('stripe')}
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
                  onClick={() => buyWithPayment('bank_transfer')}
                  disabled={!bankMethod.available || Boolean(checkoutKey)}
                  title={bankMethod.unavailable_reason || undefined}
                >
                  {checkoutKey === 'bank_transfer'
                    ? 'Processing...'
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
        ) : (
          <div className="unlock-box">
            <p className="muted">Purchasing content is disabled for this hub by Power Admin.</p>
          </div>
        )}
      </div>
    </section>
  )
}
