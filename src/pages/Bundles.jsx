import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import PageLoader from '../components/PageLoader'
import PostMetrics from '../components/PostMetrics'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

export default function Bundles() {
  const { user } = useAuth()
  const { can, loading: hubLoading } = useHub()
  const [bundles, setBundles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const catalogAllowed = can('member_browse_catalog')

  useEffect(() => {
    if (hubLoading) return undefined
    if (!catalogAllowed) {
      setLoading(false)
      return undefined
    }

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
  }, [hubLoading, catalogAllowed])

  if (hubLoading || (catalogAllowed && loading)) {
    return <PageLoader />
  }

  if (!catalogAllowed) {
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
    <section className="listing-page">
      <div className="catalog-hero catalog-hero--compact">
        <div className="catalog-hero__copy">
          <p className="catalog-hero__eyebrow">Catalog</p>
          <h1>Bundles</h1>
          <p className="catalog-hero__lead">
            Buy a set of posts and reels together for a single credit price.
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {bundles.length === 0 ? (
        <div className="empty-state">
          <h2>No bundles yet</h2>
          <p className="muted">Check back later, or browse individual posts.</p>
          <Link to="/" className="btn ghost">
            Browse posts
          </Link>
        </div>
      ) : (
        <div className="tool-grid">
          {bundles.map((bundle, index) => (
            <Link
              key={bundle.id}
              to={`/bundles/${bundle.id}`}
              className="tool-card bundle-card"
              style={{ '--card-i': index }}
            >
              <div className="bundle-card__media">
                {bundle.image_url ? (
                  <img src={bundle.image_url} alt="" />
                ) : (
                  <span className="bundle-card__placeholder" aria-hidden="true">
                    Bundle
                  </span>
                )}
              </div>
              <div className="bundle-card__body">
                <span className="tool-card__index">
                  {bundle.posts_count ?? 0} items
                </span>
                <h2>{bundle.title}</h2>
                <PostMetrics post={bundle} />
                <p className="bundle-card__desc">{bundle.description || 'No description.'}</p>
                <div className="tool-card__meta">
                  <strong>{bundle.credits_cost} credits</strong>
                  {bundle.is_purchased && <span className="badge ok">Owned</span>}
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
