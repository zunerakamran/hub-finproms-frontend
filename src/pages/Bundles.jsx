import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function Bundles() {
  const { user } = useAuth()
  const { can } = useHub()
  const [bundles, setBundles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await api.bundles({ per_page: 24 })
        if (!cancelled) setBundles(data.data || [])
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!can('member_browse_catalog')) {
    return (
      <section>
        <div className="empty-state">
          <h1>Bundles</h1>
          <p className="muted">Browsing is not enabled for your role on this hub.</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Bundles</h1>
          <p className="muted">Buy a set of posts/reels together for a single credit price.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {loading ? (
        <div className="state">Loading bundles...</div>
      ) : bundles.length === 0 ? (
        <div className="empty-state">
          <h2>No bundles yet</h2>
          <p className="muted">Check back later, or browse individual posts.</p>
          <Link to="/" className="btn ghost">
            Browse posts
          </Link>
        </div>
      ) : (
        <div className="posts-grid">
          {bundles.map((bundle) => (
            <Link key={bundle.id} to={`/bundles/${bundle.id}`} className="post-card">
              <div className="post-card-body">
                <p className="eyebrow">Bundle · {bundle.posts_count ?? 0} items</p>
                <h2>{bundle.title}</h2>
                <p className="muted">{bundle.description || 'No description.'}</p>
                <div className="post-card-meta">
                  <span>{bundle.credits_cost} credits</span>
                  {bundle.is_purchased && <span className="badge">Owned</span>}
                  {!user && <span className="badge">Sign in to buy</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
