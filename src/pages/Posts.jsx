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

function formatCount(value) {
  return Number(value || 0).toLocaleString()
}

export default function Posts() {
  const { isAuthenticated, user, isClientAdmin } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [totalResults, setTotalResults] = useState(0)
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [totalPosts, setTotalPosts] = useState(0)
  const [canViewCatalog, setCanViewCatalog] = useState(true)
  const [filters, setFilters] = useState({ search: '', category: '', tag: '' })
  const [searchDraft, setSearchDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadFilters = async () => {
    const [catsRes, tagsRes] = await Promise.all([api.listCategories(), api.listTags()])
    setCategories(catsRes.categories || catsRes.types || [])
    setTotalPosts(catsRes.total_posts ?? 0)
    setTags(tagsRes.tags || [])
  }

  const loadPosts = async (nextFilters = filters) => {
    setLoading(true)
    setError('')
    try {
      const postsRes = await api.posts(nextFilters)
      setPosts(postsRes.data || [])
      setTotalResults(postsRes.total ?? postsRes.data?.length ?? 0)
      setCanViewCatalog(Boolean(postsRes.can_view_catalog) || isClientAdmin)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFilters().catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    loadPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.tag, filters.search, user?.credits, user?.id])

  const onSearch = (e) => {
    e.preventDefault()
    setFilters((prev) => ({ ...prev, search: searchDraft.trim() }))
  }

  const clearFilters = () => {
    setSearchDraft('')
    setFilters({ search: '', category: '', tag: '' })
  }

  const hasFilters = Boolean(filters.search || filters.category || filters.tag)
  const catalogLocked = !canViewCatalog && !isClientAdmin

  const resultLabel = useMemo(() => {
    if (loading) return 'Finding content...'
    if (totalResults === 0) return 'No content match'
    return `${totalResults} item${totalResults === 1 ? '' : 's'} found`
  }, [loading, totalResults])

  return (
    <section className="listing-page">
      <div className="listing-hero">
        <div>
          <p className="eyebrow">Hub Finproms catalog</p>
          <h1>Ready-to-post social content</h1>
          <p className="listing-lead">
            Browse promo posts and reels, unlock with credits, and download the creative assets you
            need.
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

      {catalogLocked && (
        <div className="catalog-lock-banner">
          <div>
            <strong>Content is locked</strong>
            <p className="muted">Subscribe or buy credits to preview and unlock content.</p>
          </div>
          <div className="actions">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="btn ghost">
                  Login
                </Link>
                <Link to="/subscriptions" className="btn primary">
                  View plans
                </Link>
              </>
            ) : (
              <Link to="/subscriptions" className="btn primary">
                Get credits
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="listing-filters">
        <div className="listing-filter-row">
          <form className="listing-search" onSubmit={onSearch}>
            <input
              placeholder="Search by title or description..."
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              aria-label="Search content"
            />
            <button className="btn primary" type="submit">
              Search
            </button>
          </form>

          <label className="filter-select">
            <span>Type</span>
            <select
              value={filters.category}
              onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
              aria-label="Filter by type"
            >
              <option value="">All types ({totalPosts})</option>
              {categories.map((category) => (
                <option key={category.id || category.name} value={category.name}>
                  {category.name} ({category.posts_count ?? 0})
                </option>
              ))}
            </select>
          </label>

          {tags.length > 0 && (
            <label className="filter-select">
              <span>Tag</span>
              <select
                value={filters.tag}
                onChange={(e) => setFilters((prev) => ({ ...prev, tag: e.target.value }))}
                aria-label="Filter by tag"
              >
                <option value="">All tags</option>
                {tags.map((tag) => (
                  <option key={tag.id || tag.name} value={tag.name}>
                    {tag.name} ({tag.posts_count ?? 0})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="listing-meta-row">
          <div>
            <p className="listing-count">{resultLabel}</p>
            {hasFilters && (
              <div className="active-filter-pills">
                {filters.category && (
                  <button
                    type="button"
                    className="filter-pill"
                    onClick={() => setFilters((prev) => ({ ...prev, category: '' }))}
                  >
                    {filters.category}
                    <span aria-hidden="true">×</span>
                  </button>
                )}
                {filters.tag && (
                  <button
                    type="button"
                    className="filter-pill"
                    onClick={() => setFilters((prev) => ({ ...prev, tag: '' }))}
                  >
                    #{filters.tag}
                    <span aria-hidden="true">×</span>
                  </button>
                )}
                {filters.search && (
                  <button
                    type="button"
                    className="filter-pill"
                    onClick={() => {
                      setSearchDraft('')
                      setFilters((prev) => ({ ...prev, search: '' }))
                    }}
                  >
                    “{filters.search}”
                    <span aria-hidden="true">×</span>
                  </button>
                )}
              </div>
            )}
          </div>
          {hasFilters && (
            <button type="button" className="text-btn" onClick={clearFilters}>
              Clear all
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
          <h2>No content found</h2>
          <p className="muted">
            {hasFilters
              ? 'Try another type, tag, or clear your search.'
              : 'New posts and reels will appear here once the client admin adds them.'}
          </p>
          {hasFilters && (
            <button className="btn primary" onClick={clearFilters}>
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="post-grid listing-grid">
          {posts.map((post, index) => {
            const locked = post.is_locked && !post.is_purchased && !isClientAdmin
            const isReel = Boolean(post.is_reel)

            return (
              <Link
                to={`/posts/${post.id}`}
                key={post.id}
                className={`post-tile listing-tile ${locked ? 'is-locked' : ''} ${isReel ? 'is-reel' : ''}`}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="post-cover">
                  {!locked && post.cover_url ? (
                    <img src={post.cover_url} alt={post.title} loading="lazy" />
                  ) : (
                    <div className="post-cover-fallback locked-cover">
                      {locked ? 'Locked' : post.category}
                    </div>
                  )}

                  {post.is_new && <span className="new-banner">NEW</span>}

                  {isReel && !locked && (
                    <span className="reel-play-btn" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                        <path d="M8 5v14l11-7L8 5z" />
                      </svg>
                    </span>
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
                  {locked ? (
                    <p className="post-excerpt muted">
                      Content is hidden. Get credits to preview and unlock this item.
                    </p>
                  ) : (
                    <p className="post-excerpt">
                      {post.description?.slice(0, 110) || 'No description provided.'}
                      {post.description?.length > 110 ? '…' : ''}
                    </p>
                  )}
                  {!locked && !!post.tags?.length && (
                    <div className="tags">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="post-metrics">
                    <span title="Views">{formatCount(post.views_count)} views</span>
                    <span title="Reach">{formatCount(post.reach_count)} reach</span>
                    <span title="Buys">{formatCount(post.buy_count)} buys</span>
                  </div>
                  <div className="post-footer">
                    <span className="view-link">
                      {locked ? 'Unlock access →' : isReel ? 'Play reel →' : 'View post →'}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
