import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export default function MyPurchases() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
          <p className="eyebrow">Library</p>
          <h1>My purchases</h1>
          <p className="muted">Posts you unlocked with credits.</p>
        </div>
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
            <Link to={`/posts/${purchase.post_id}`} key={purchase.id} className="post-tile">
              <div className="post-meta">
                <span>{purchase.post?.category}</span>
                <span>{purchase.credits_spent} credits spent</span>
              </div>
              <h2>{purchase.post?.title}</h2>
              <p>{purchase.post?.description?.slice(0, 120)}</p>
              <div className="post-footer">
                <span>Bought {new Date(purchase.purchased_at).toLocaleDateString()}</span>
                <span className="badge ok">Owned</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
