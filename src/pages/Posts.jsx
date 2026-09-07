import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Posts() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({ search: '', category: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [postsRes, catsRes] = await Promise.all([
        api.posts(filters),
        api.categories(),
      ])
      setPosts(postsRes.data || [])
      setCategories(catsRes.categories || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category])

  const onSearch = (e) => {
    e.preventDefault()
    load()
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Social media posts</h1>
          <p className="muted">Browse posts and unlock them with credits.</p>
        </div>
        {!isAuthenticated && (
          <button className="btn primary" onClick={() => navigate('/register')}>
            Sign up to buy
          </button>
        )}
      </div>

      <form className="filters" onSubmit={onSearch}>
        <input
          placeholder="Search posts..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button className="btn primary" type="submit">
          Search
        </button>
      </form>

      {error && <div className="alert">{error}</div>}
      {loading ? (
        <div className="state">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="state">No posts yet.</div>
      ) : (
        <div className="post-grid">
          {posts.map((post) => (
            <Link to={`/posts/${post.id}`} key={post.id} className="post-tile">
              <div className="post-meta">
                <span>{post.category}</span>
                <span>{post.credits_cost} credits</span>
              </div>
              <h2>{post.title}</h2>
              <p>{post.description?.slice(0, 120) || 'No description'}</p>
              <div className="post-footer">
                <span>Updated {new Date(post.last_updated || post.updated_at).toLocaleDateString()}</span>
                {post.is_purchased ? <span className="badge ok">Owned</span> : <span className="badge">Locked</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
