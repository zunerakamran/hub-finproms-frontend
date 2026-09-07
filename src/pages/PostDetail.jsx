import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function PostDetail() {
  const { id } = useParams()
  const { user, isAuthenticated, setUser, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)

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
  }, [id])

  const buy = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setBuying(true)
    setError('')
    setMessage('')
    try {
      const data = await api.purchasePost(id)
      setPost(data.post)
      setUser(data.user)
      setMessage(data.message)
      await refreshUser()
    } catch (err) {
      setError(err.message)
    } finally {
      setBuying(false)
    }
  }

  if (loading) return <div className="state">Loading...</div>
  if (error && !post) return <div className="alert">{error}</div>
  if (!post) return null

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
          <span>{post.category}</span>
          <span>{post.credits_cost} credits</span>
        </div>
        <h1>{post.title}</h1>
        <p className="muted">
          Last updated {new Date(post.last_updated || post.updated_at).toLocaleString()}
        </p>
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

        {post.is_purchased || user?.role === 'admin' ? (
          <div className="unlock-box">
            <p className="badge ok">Unlocked</p>
            {post.attachment_url ? (
              <a className="btn primary" href={post.attachment_url} target="_blank" rel="noreferrer">
                Download attachment ({post.attachment_name || 'file'})
              </a>
            ) : (
              <p className="muted">No attachment uploaded for this post.</p>
            )}
          </div>
        ) : (
          <div className="unlock-box">
            <p>You need {post.credits_cost} credits to unlock this post.</p>
            <p className="muted">Your balance: {user?.credits ?? 0} credits</p>
            <div className="actions">
              <button className="btn primary" onClick={buy} disabled={buying}>
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
