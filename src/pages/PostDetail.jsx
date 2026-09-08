import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function PostDetail() {
  const { id } = useParams()
  const { user, isAuthenticated, isClientAdmin, setUser, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [invoice, setInvoice] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.post(id)
      setPost(data.post)
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

  if (loading) return <div className="state">Loading...</div>
  if (error && !post) return <div className="alert">{error}</div>
  if (!post) return null

  const locked = Boolean(post.is_locked) && !post.is_purchased && !isClientAdmin
  const unlocked = post.is_purchased || isClientAdmin

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
              <Link to="/register" className="btn ghost">
                Sign up free
              </Link>
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
        {post.cover_url && (
          <div className="detail-cover">
            <img src={post.cover_url} alt={post.title} />
          </div>
        )}
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
        <div className="post-metrics detail-metrics">
          <span>{Number(post.views_count || 0).toLocaleString()} views</span>
          <span>{Number(post.reach_count || 0).toLocaleString()} reach</span>
          <span>{Number(post.buy_count || 0).toLocaleString()} buys</span>
        </div>

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
            {post.attachment_url ? (
              <a
                className="btn primary"
                href={post.attachment_url}
                target="_blank"
                rel="noreferrer"
              >
                Download attachment ({post.attachment_name || 'file'})
              </a>
            ) : (
              <p className="muted">No attachment uploaded for this post.</p>
            )}
            {invoice && (
              <p className="muted">
                Invoice {invoice.invoice_number} created ·{' '}
                <Link to={`/invoices/${invoice.id}`}>View invoice</Link>
              </p>
            )}
          </div>
        ) : (
          <div className="unlock-box">
            <p>
              Buy this post for {post.credits_cost} credits (£{post.credits_cost}). No subscription
              required.
            </p>
            <p className="muted">Your balance: {user?.credits ?? 0} credits</p>
            <div className="actions">
              <button
                className="btn primary"
                onClick={buy}
                disabled={buying || (user?.credits ?? 0) < post.credits_cost}
              >
                {buying ? 'Purchasing...' : 'Buy with credits'}
              </button>
              <Link to="/subscriptions" className="btn ghost">
                Get more credits
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
