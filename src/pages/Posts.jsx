import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Posts() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({ search: '', category: '' })
  const [searchDraft, setSearchDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (nextFilters = filters) => {
    setLoading(true)
    setError('')
    try {
      const [postsRes, catsRes] = await Promise.all([
        api.posts(nextFilters),
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
  }, [filters.category, filters.search])

  const onSearch = (e) => {
    e.preventDefault()
    setFilters((prev) => ({ ...prev, search: searchDraft.trim() }))
  }

  const clearFilters = () => {
    setSearchDraft('')
    setFilters({ search: '', category: '' })
  }

  const hasFilters = Boolean(filters.search || filters.category)

  const resultLabel = useMemo(() => {
    if (loading) return 'Finding posts...'
    if (posts.length === 0) return 'No posts match'
    return `${posts.length} post${posts.length === 1 ? '' : 's'}`
  }, [loading, posts.length])

  return (
    <section className="listing-page">
      <div className="listing-hero">
        <div>
          <p className="eyebrow">Hub Finproms catalog</p>
          <h1>Ready-to-post social content</h1>
          <p className="listing-lead">
            Browse promo posts, unlock with credits, and download the creative assets you need.
          </p>
        </div>
        <div className="listing-hero-aside">
          {isAuthenticated ? (
            <div className="listing-stat">
              <span>Your balance</span>
              <strong>{user?.credits ?? 0}</strong>
              <em>credits</em>
              <Link to="/subscriptions" className="btn ghost">
                Top up
              </Link>
            </div>
          ) : (
            <div className="listing-cta-panel">
              <p>Create an account to buy credits and unlock posts.</p>
              <button className="btn primary" onClick={() => navigate('/register')}>
                Sign up free
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="listing-toolbar">
        <form className="listing-search" onSubmit={onSearch}>
          <input
            placeholder="Search by title or description..."
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            aria-label="Search posts"
          />
          <button className="btn primary" type="submit">
            Search
          </button>
        </form>

        <div className="category-chips" role="list">
          <button
            type="button"
            className={`chip ${!filters.category ? 'active' : ''}`}
            onClick={() => setFilters((prev) => ({ ...prev, category: '' }))}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`chip ${filters.category === category ? 'active' : ''}`}
              onClick={() => setFilters((prev) => ({ ...prev, category }))}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="listing-meta-row">
          <p className="listing-count">{resultLabel}</p>
          {hasFilters && (
            <button type="button" className="text-btn" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <div className="post-grid listing-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="post-tile skeleton-tile" aria-hidden="true">
              <div className="skeleton-cover" />
              <div className="post-tile-body">
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
                <div className="skeleton-line medium" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <h2>No posts found</h2>
          <p className="muted">
            {hasFilters
              ? 'Try another category or clear your search.'
              : 'New posts will appear here once the admin adds them.'}
          </p>
          {hasFilters && (
            <button className="btn primary" onClick={clearFilters}>
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="post-grid listing-grid">
          {posts.map((post, index) => (
            <Link
              to={`/posts/${post.id}`}
              key={post.id}
              className="post-tile listing-tile"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="post-cover">
                {post.cover_url ? (
                  <img src={post.cover_url} alt={post.title} loading="lazy" />
                ) : (
                  <div className="post-cover-fallback">{post.category}</div>
                )}
                <div className="cover-overlay">
                  <span className={`badge ${post.is_purchased ? 'ok' : ''}`}>
                    {post.is_purchased ? 'Owned' : 'Locked'}
                  </span>
                  <span className="credit-chip">{post.credits_cost} credits</span>
                </div>
              </div>
              <div className="post-tile-body">
                <div className="post-meta">
                  <span className="category-label">{post.category}</span>
                  <span>{formatDate(post.last_updated || post.updated_at)}</span>
                </div>
                <h2>{post.title}</h2>
                <p className="post-excerpt">
                  {post.description?.slice(0, 110) || 'No description provided.'}
                  {post.description?.length > 110 ? '…' : ''}
                </p>
                {!!post.tags?.length && (
                  <div className="tags">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                )}
                <div className="post-footer">
                  <span className="view-link">View post →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
