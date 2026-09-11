import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function BundleDetail() {
  const { id } = useParams()
  const { user, setUser, refreshUser } = useAuth()
  const { can } = useHub()
  const [bundle, setBundle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.bundle(id)
      setBundle(data.bundle)
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

  const purchase = async () => {
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

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Bundle</p>
          <h1>{bundle.title}</h1>
          <p className="muted">
            {bundle.posts_count ?? bundle.posts?.length ?? 0} posts · {bundle.credits_cost} credits
          </p>
        </div>
        <Link to="/bundles" className="btn ghost">
          All bundles
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {bundle.description && <p className="muted">{bundle.description}</p>}

      <div className="actions" style={{ marginBottom: '1.5rem' }}>
        {bundle.is_purchased ? (
          <span className="badge">Purchased — all posts unlocked</span>
        ) : canBuy ? (
          <button className="btn primary" disabled={buying} onClick={purchase}>
            {buying ? 'Purchasing...' : `Buy bundle (${bundle.credits_cost} credits)`}
          </button>
        ) : !user ? (
          <Link to="/login" className="btn primary">
            Sign in to purchase
          </Link>
        ) : null}
      </div>

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
