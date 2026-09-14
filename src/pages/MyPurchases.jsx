import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'

export default function MyPurchases() {
  const { can } = useHub()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const canCompliance =
    can('module_social_media_compliance') && can('smc_submit_request')

  useEffect(() => {
    api
      .myPurchases()
      .then((data) => setItems(data.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>My purchases</h1>
          <p className="muted">Posts you unlocked with credits.</p>
        </div>
        {canCompliance && (
          <Link className="btn ghost" to="/my-dashboard/social-media-compliance">
            My requests
          </Link>
        )}
      </div>
      {error && <div className="alert">{error}</div>}
      {loading ? (
        <div className="state">Loading...</div>
      ) : items.length === 0 ? (
        <div className="state">
          No purchases yet. <Link to="/">Browse posts</Link>
        </div>
      ) : (
        <div className="post-grid">
          {items.map((purchase) => (
            <div key={purchase.id} className="post-tile smc-purchase-tile">
              <Link to={`/posts/${purchase.post_id}`} className="smc-purchase-link">
                <div className="post-cover">
                  {purchase.post?.cover_url ? (
                    <img src={purchase.post.cover_url} alt={purchase.post?.title} />
                  ) : (
                    <div className="post-cover-fallback">
                      {purchase.post?.type || purchase.post?.category}
                    </div>
                  )}
                </div>
                <div className="post-tile-body">
                  <div className="post-meta">
                    <span>{purchase.post?.type}</span>
                    <span>{purchase.post?.category}</span>
                    <span>{purchase.credits_spent} credits spent</span>
                  </div>
                  <h2>{purchase.post?.title}</h2>
                  <p>{purchase.post?.description?.slice(0, 120)}</p>
                  <div className="post-footer">
                    <span>Bought {new Date(purchase.purchased_at).toLocaleDateString()}</span>
                    <span className="badge ok">Owned</span>
                  </div>
                </div>
              </Link>
              {canCompliance && (
                <div className="smc-purchase-actions">
                  <Link
                    className="btn ghost"
                    to={`/my-dashboard/social-media-compliance/new?post_id=${purchase.post_id}`}
                  >
                    Send for social media compliance
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
