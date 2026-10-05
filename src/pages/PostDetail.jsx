import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import AttachmentPreview from '../components/AttachmentPreview'
import PostMetrics from '../components/PostMetrics'
import ReelPlayer from '../components/ReelPlayer'
import RichTextDisplay from '../components/RichTextDisplay'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatDateTime } from '../utils/dateFormat'
import { fillPageText, pageText } from '../utils/pageContent'

export default function PostDetail() {
  const { id } = useParams()
  const { user, isAuthenticated, isClientAdmin, setUser, refreshUser } = useAuth()
  const { can, registrationEnabled, isActingAsAdvisor, pageContent } = useHub()
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
  const [cashContentPurchase, setCashContentPurchase] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const t = (key, fallback = '') => pageText(pageContent, 'post_detail', key, fallback)

  const canPurchase = can('member_purchase_content')
  const canPreview = can('member_download_content')
  const unlimited =
    user?.has_unlimited_credits ||
    (can('unlimited_credits') && (user?.is_advisor || isActingAsAdvisor))
  const oneOffEnabled = oneOffPurchase || can('one_off_purchase')
  // Shared hub only: credits + dashboard payment methods. White-labelled: credits only.
  const cashEnabled = cashContentPurchase
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
      setCashContentPurchase(Boolean(data.cash_content_purchase))
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

  if (loading) return <div className="state">{t('loading', 'Loading...')}</div>
  if (error && !post) return <div className="alert">{error}</div>
  if (!post) return null

  const locked = Boolean(post.is_locked) && !post.is_purchased && !isClientAdmin
  // Preview / Canva only after a real purchase — hub admin role must not fake ownership.
  const unlocked = Boolean(post.is_purchased)
  const isReel = Boolean(post.is_reel)
  const previewVideo = post.video_url || (unlocked && post.is_video ? post.attachment_url : null)
  const catalogBackTo = isReel ? '/posts?type=reel' : '/posts?type=post'
  const backLabel = isReel
    ? t('back_reels', '← Back to reels')
    : t('back_posts', '← Back to posts')

  if (locked) {
    return (
      <section className="detail locked-detail">
        <Link to={catalogBackTo} className="back">
          {backLabel}
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
            <p className="locked-gate-kicker">{t('login_required', 'Login required')}</p>
          </div>

          <div className="locked-gate-body">
            <div className="locked-gate-meta">
              <div className="locked-gate-meta__row">
                <span className="locked-pill">{post.type}</span>
                <span className="locked-pill cost">{post.credits_cost} credits</span>
              </div>
              {post.category ? (
                <div className="locked-gate-meta__row">
                  <span className="locked-pill">{post.category}</span>
                </div>
              ) : null}
            </div>

            <h1>{post.title}</h1>
            <p className="locked-gate-lead">
              {t(
                'locked_lead',
                'Sign in to preview this post and buy it with credits — no subscription required.'
              )}
            </p>

            <div className="locked-steps">
              <div className="locked-step">
                <span className="locked-step-num">1</span>
                <div>
                  <strong>{t('step1_title', 'Create an account')}</strong>
                  <p>{t('step1_body', 'Register or log in to browse the full catalog.')}</p>
                </div>
              </div>
              <div className="locked-step">
                <span className="locked-step-num">2</span>
                <div>
                  <strong>{t('step2_title', 'Get credits')}</strong>
                  <p>
                    {t(
                      'step2_body',
                      'Subscribe for a pack, or top up as you go.'
                    )}
                  </p>
                </div>
              </div>
              <div className="locked-step">
                <span className="locked-step-num">3</span>
                <div>
                  <strong>{t('step3_title', 'Buy this post')}</strong>
                  <p>
                    {fillPageText(
                      t('step3_body', 'Spend {credits} credits to unlock and preview the creative asset.'),
                      { credits: post.credits_cost }
                    )}
                  </p>
                </div>
              </div>
            </div>

            {error && <div className="alert">{error}</div>}

            <div className="locked-gate-actions">
              <Link to="/login" className="btn primary">
                {t('login', 'Login')}
              </Link>
              {registrationEnabled && (
                <Link to="/register" className="btn ghost">
                  {t('sign_up', 'Sign up free')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    )
  }

  const hasMedia = Boolean(previewVideo || post.cover_url)

  return (
    <section className="detail">
      <Link to={catalogBackTo} className="back">
        {backLabel}
      </Link>
      <div className={`detail-panel${hasMedia ? ' detail-panel--split' : ''}`}>
        {hasMedia ? (
          <div className={`detail-media${isReel ? ' is-reel' : ''}`}>
            {previewVideo ? (
              <ReelPlayer src={previewVideo} title={post.title} />
            ) : (
              <img src={post.cover_url} alt={post.title} />
            )}
            <PostMetrics post={post} className="post-metrics detail-media__metrics" />
          </div>
        ) : null}

        <div className="detail-body">
          <div className="post-meta post-meta--detail">
            <div className="post-meta__row">
              <span>{post.type}</span>
              <span>{post.credits_cost} credits</span>
              {post.is_new && <span className="badge new-inline">NEW</span>}
            </div>
            {post.category ? (
              <div className="post-meta__row post-meta__row--category">
                <span>{post.category}</span>
              </div>
            ) : null}
          </div>
          <h1>{post.title}</h1>
          <p className="muted">
            {fillPageText(t('last_updated', 'Last updated {date}'), {
              date: formatDateTime(post.last_updated || post.updated_at),
            })}
          </p>
          {!hasMedia ? (
            <PostMetrics post={post} className="post-metrics detail-metrics" />
          ) : null}

          <RichTextDisplay
            html={post.description}
            empty={t('no_description', 'No description provided.')}
          />
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
              <p className="badge ok">{t('unlocked', 'Unlocked')}</p>
              <div className="actions unlock-box__actions">
                {canPreview && post.attachment_url ? (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => setPreviewOpen(true)}
                  >
                    {t('download', 'Preview')}
                  </button>
                ) : canPreview ? (
                  <p className="muted">
                    {t('no_attachment', 'No attachment uploaded for this post.')}
                  </p>
                ) : (
                  <p className="muted">
                    {t(
                      'downloads_disabled',
                      'Preview is disabled for this hub by Power Admin.'
                    )}
                  </p>
                )}
                {post.canva_link && (
                  <a
                    className="btn accent"
                    href={post.canva_link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('edit_canva', 'Edit with Canva')}
                  </a>
                )}
              </div>
              {invoice && can('member_view_invoices') && (
                <p className="muted">
                  Invoice {invoice.invoice_number} created ·{' '}
                  <Link to={`/my-dashboard/my-invoices/${invoice.id}`}>View invoice</Link>
                </p>
              )}
            </div>
          ) : canPurchase ? (
            <div className="unlock-box">
              <p>
                {fillPageText(
                  t('buy_intro', 'Buy this post for {credits} credits.'),
                  { credits: post.credits_cost }
                )}
                {oneOffEnabled
                  ? ` ${t('no_subscription_note', 'No subscription required.')}`
                  : ''}
              </p>
              <p className="muted">
                {t('your_balance', 'Your balance:')}{' '}
                {unlimited
                  ? t('unlimited', 'Unlimited')
                  : `${user?.credits ?? 0} ${t('credits_suffix', 'credits')}`}
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
                  {buying
                    ? t('purchasing', 'Purchasing...')
                    : t('buy_with_credits', 'Buy with credits')}
                </button>
                {can('member_view_plans') && (
                  <Link to="/subscriptions" className="btn ghost">
                    {t('get_more_credits', 'Get more credits')}
                  </Link>
                )}
              </div>
              {cashEnabled && (
                <div className="plan-actions" style={{ marginTop: '0.75rem' }}>
                  <p className="muted">
                    {t(
                      'or_pay_directly',
                      'Or pay directly with an enabled payment method:'
                    )}
                  </p>
                  <button
                    className="btn primary full"
                    onClick={() => buyWithPayment('stripe')}
                    disabled={!stripeMethod.available || Boolean(checkoutKey)}
                    title={stripeMethod.unavailable_reason || undefined}
                  >
                    {checkoutKey === 'stripe'
                      ? t('redirecting_stripe', 'Redirecting to Stripe...')
                      : stripeMethod.available
                        ? t('pay_stripe', 'Pay with Stripe')
                        : t('stripe_unavailable', 'Stripe unavailable')}
                  </button>
                  <button
                    className="btn ghost full"
                    onClick={() => buyWithPayment('bank_transfer')}
                    disabled={!bankMethod.available || Boolean(checkoutKey)}
                    title={bankMethod.unavailable_reason || undefined}
                  >
                    {checkoutKey === 'bank_transfer'
                      ? t('processing', 'Processing...')
                      : bankMethod.available
                        ? t('pay_bank', 'Pay by bank transfer')
                        : t('bank_unavailable', 'Bank transfer unavailable')}
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
              <p className="muted">
                {t(
                  'purchasing_disabled',
                  'Purchasing content is disabled for this hub by Power Admin.'
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      <AttachmentPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        post={post}
        title={t('download', 'Preview')}
      />
    </section>
  )
}
