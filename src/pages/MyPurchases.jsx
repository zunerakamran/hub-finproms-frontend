import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import ReelPlayer from '../components/ReelPlayer'
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
        <div className="post-grid listing-grid">
          {items.map((purchase, index) => {
            const post = purchase.post || {}
            const isReel = Boolean(post.is_reel)
            const showCoverImage = Boolean(post.cover_url)
            const videoUrl = post.video_url || (post.is_video ? post.attachment_url : null)
            const showReelVideo = isReel && !post.cover_url && Boolean(videoUrl)

            return (
              <div
                key={purchase.id}
                className={`post-tile listing-tile smc-purchase-tile ${isReel ? 'is-reel' : ''}`.trim()}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <Link to={`/posts/${purchase.post_id}`} className="smc-purchase-link">
                  <div className="post-cover listing-cover">
                    {showCoverImage ? (
                      <img src={post.cover_url} alt={post.title} loading="lazy" />
                    ) : showReelVideo ? (
                      <ReelPlayer src={videoUrl} title={post.title || ''} compact />
                    ) : (
                      <div className="post-cover-fallback">
                        {post.type || post.category || 'Post'}
                      </div>
                    )}

                    {isReel && (
                      <span className="media-type-chip" aria-hidden="true">
                        Reel
                      </span>
                    )}

                    {isReel && showCoverImage && (
                      <span className="reel-play-btn" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor">
                          <path d="M8 5v14l11-7L8 5z" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="post-tile-body">
                    <div className="post-meta">
                      <span>{post.type}</span>
                      <span>{post.category}</span>
                      <span>{purchase.credits_spent} credits spent</span>
                    </div>
                    <h2>{post.title}</h2>
                    <p>{post.description?.slice(0, 120)}</p>
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
            )
          })}
        </div>
      )}
    </section>
  )
}
