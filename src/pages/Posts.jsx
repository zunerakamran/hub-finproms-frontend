import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import PageLoader from '../components/PageLoader'
import PostMetrics from '../components/PostMetrics'
import ReelPlayer from '../components/ReelPlayer'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Posts() {
  const { isAuthenticated, user, isClientAdmin } = useAuth()
  const { can, loading: hubLoading, registrationEnabled } = useHub()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [totalResults, setTotalResults] = useState(0)
  const [types, setTypes] = useState([])
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [totalPosts, setTotalPosts] = useState(0)
  const [filters, setFilters] = useState({ search: '', type: '', category: '', tag: '' })
  const [searchDraft, setSearchDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [initialReady, setInitialReady] = useState(false)
  const [error, setError] = useState('')

  const catalogAllowed = can('member_browse_catalog')

  useEffect(() => {
    if (hubLoading) return undefined

    if (!catalogAllowed) {
      setLoading(false)
      setInitialReady(true)
      return undefined
    }

    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError('')
      try {
        // First paint: wait for filters + posts together.
        // Later filter changes: only refresh posts (faster, less flicker).
        if (!initialReady) {
          const [typesRes, catsRes, tagsRes, postsRes] = await Promise.all([
            api.listTypes(),
            api.listCategories(),
            api.listTags(),
            api.posts(filters),
          ])
          if (cancelled) return
          setTypes(typesRes.types || [])
          setCategories(catsRes.categories || [])
          setTotalPosts(catsRes.total_posts ?? typesRes.total_posts ?? 0)
          setTags(tagsRes.tags || [])
          setPosts(postsRes.data || [])
          setTotalResults(postsRes.total ?? postsRes.data?.length ?? 0)
        } else {
          const postsRes = await api.posts(filters)
          if (cancelled) return
          setPosts(postsRes.data || [])
          setTotalResults(postsRes.total ?? postsRes.data?.length ?? 0)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) {
          setLoading(false)
          setInitialReady(true)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hubLoading,
    catalogAllowed,
    filters.type,
    filters.category,
    filters.tag,
    filters.search,
    user?.credits,
    user?.id,
  ])

  const onSearch = (e) => {
    e.preventDefault()
    setFilters((prev) => ({ ...prev, search: searchDraft.trim() }))
  }

  const clearFilters = () => {
    setSearchDraft('')
    setFilters({ search: '', type: '', category: '', tag: '' })
  }

  const hasFilters = Boolean(filters.search || filters.type || filters.category || filters.tag)
  const catalogLocked = !isAuthenticated && !isClientAdmin

  const resultLabel = useMemo(() => {
    if (loading) return 'Finding content...'
    if (totalResults === 0) return 'No content match'
    return `${totalResults} item${totalResults === 1 ? '' : 's'} found`
  }, [loading, totalResults])

  if (hubLoading || !initialReady) {
    return <PageLoader />
  }

  if (!catalogAllowed) {
    return (
      <section>
        <div className="page-head">
          <div>
            <h1>Catalog unavailable</h1>
            <p className="muted">Browsing posts is disabled for this hub by Power Admin.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={`listing-page ${loading ? 'is-refreshing' : ''}`}>
      {loading && (
        <div className="listing-refresh-overlay" aria-live="polite" aria-label="Loading">
          <div className="page-loader__spinner" />
        </div>
      )}
      <div className="catalog-hero">
        <div className="catalog-hero__copy">
          <p className="catalog-hero__eyebrow">Content library</p>
          <h1>Ready-to-post social content</h1>
          <p className="catalog-hero__lead">
            Browse promo posts and reels, unlock with credits, and download the assets you need.
            1 credit = £1.
          </p>
        </div>
        <div className="catalog-hero__aside">
          {isAuthenticated ? (
            <div className="catalog-balance">
              <span>Your balance</span>
              <strong>{user?.credits ?? 0}</strong>
              <em>credits available</em>
              <Link to="/subscriptions" className="btn ghost">
                Top up
              </Link>
            </div>
          ) : (
            <div className="catalog-cta">
              <p>
                {registrationEnabled
                  ? 'Create an account to preview content and buy with credits.'
                  : 'This hub is invite-only. Sign in with your invited account to continue.'}
              </p>
              {registrationEnabled ? (
                <button className="btn primary" onClick={() => navigate('/register')}>
                  Sign up free
                </button>
              ) : (
                <button className="btn primary" onClick={() => navigate('/login')}>
                  Sign in
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {catalogLocked && (
        <div className="catalog-lock-banner">
          <div>
            <strong>Content is locked</strong>
            <p className="muted">Log in to preview posts and buy them with credits (1 credit = £1).</p>
          </div>
          <div className="actions">
            <Link to="/login" className="btn ghost">
              Login
            </Link>
            {registrationEnabled && (
              <Link to="/register" className="btn primary">
                Sign up
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
              value={filters.type}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
              aria-label="Filter by type"
            >
              <option value="">All types ({totalPosts})</option>
              {types.map((type) => (
                <option key={type.id || type.name} value={type.name}>
                  {type.name} ({type.posts_count ?? 0})
                </option>
              ))}
            </select>
          </label>

          <label className="filter-select">
            <span>Category</span>
            <select
              value={filters.category}
              onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
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
                {filters.type && (
                  <button
                    type="button"
                    className="filter-pill"
                    onClick={() => setFilters((prev) => ({ ...prev, type: '' }))}
                  >
                    Type: {filters.type}
                    <span aria-hidden="true">×</span>
                  </button>
                )}
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

      {posts.length === 0 && !loading ? (
        <div className="empty-state">
          <h2>No content found</h2>
          <p className="muted">
            {hasFilters
              ? 'Try another type, category, tag, or clear your search.'
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
            const showCoverImage = !locked && Boolean(post.cover_url)
            const showReelVideo = !locked && isReel && !post.cover_url && Boolean(post.video_url)

            return (
              <Link
                to={`/posts/${post.id}`}
                key={post.id}
                className={`post-tile listing-tile ${locked ? 'is-locked' : ''} ${isReel ? 'is-reel' : ''}`}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="post-cover listing-cover">
                  {showCoverImage ? (
                    <img src={post.cover_url} alt={post.title} loading="lazy" />
                  ) : showReelVideo ? (
                    <ReelPlayer src={post.video_url} title={post.title} compact />
                  ) : (
                    <div className="post-cover-fallback locked-cover">
                      {locked ? 'Locked' : post.type || post.category}
                    </div>
                  )}

                  {post.is_new && <span className="new-banner">NEW</span>}

                  {isReel && !locked && (
                    <span className="media-type-chip" aria-hidden="true">
                      Reel
                    </span>
                  )}

                  {isReel && showCoverImage && (
                    <span className="reel-play-btn" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                        <path d="M8 5v14l11-7L8 5z" />
                      </svg>
                    </span>
                  )}

                  <div className="cover-overlay">
                    <span className={`badge ${post.is_purchased ? 'ok' : locked ? '' : 'ok'}`}>
                      {post.is_purchased ? 'Owned' : locked ? 'Locked' : 'Available'}
                    </span>
                    <span className="credit-chip">
                      {post.credits_cost} credits
                    </span>
                  </div>
                </div>
                <div className="post-tile-body">
                  <div className="post-meta">
                    <span className="category-label">{isReel ? 'Reel' : post.type || 'Post'}</span>
                    <span className="muted">{post.category}</span>
                    <span>{formatDate(post.last_updated || post.updated_at)}</span>
                  </div>
                  <h2>{post.title}</h2>
                  {locked ? (
                    <p className="post-excerpt muted">
                      Log in to preview this item and buy it with credits.
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
                  <PostMetrics post={post} />
                  <div className="post-footer">
                    <span className="view-link">
                      {locked
                        ? 'Login to unlock →'
                        : post.is_purchased
                          ? isReel
                            ? 'Play reel →'
                            : 'View post →'
                          : isReel
                            ? 'Buy & play →'
                            : 'Buy post →'}
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
