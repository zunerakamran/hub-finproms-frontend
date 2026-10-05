import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import FilterSelect from '../components/FilterSelect'
import PageLoader from '../components/PageLoader'
import PostMetrics from '../components/PostMetrics'
import ReelPlayer from '../components/ReelPlayer'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import usePostReachTracking from '../hooks/usePostReachTracking'
import { formatDate } from '../utils/dateFormat'
import { fillPageText, pageText } from '../utils/pageContent'
import { truncateRichText } from '../utils/richText'

/** Normalize URL ?type= into post | reel */
function resolveCatalogType(raw) {
  const value = String(raw || '').trim().toLowerCase()
  if (value === 'reel' || value === 'reels') return 'reel'
  return 'post'
}

export default function Posts() {
  const { isAuthenticated, user, isClientAdmin } = useAuth()
  const {
    can,
    loading: hubLoading,
    registrationEnabled,
    pageContent,
    hub,
    actingHub,
    isActingOnWhiteLabel,
  } = useHub()
  const isWhiteLabelHub = Boolean(
    isActingOnWhiteLabel || hub?.type === 'white_label' || actingHub?.is_white_label
  )
  const navigate = useNavigate()
  const t = (key, fallback = '') => pageText(pageContent, 'catalog', key, fallback)
  const [searchParams, setSearchParams] = useSearchParams()
  const catalogType = resolveCatalogType(searchParams.get('type'))
  const isReelsPage = catalogType === 'reel'

  const [posts, setPosts] = useState([])
  const [totalResults, setTotalResults] = useState(0)
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [filters, setFilters] = useState({ search: '', category: '', tag: '' })
  const [searchDraft, setSearchDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [initialReady, setInitialReady] = useState(false)
  const [error, setError] = useState('')

  const catalogAllowed = can('member_browse_catalog')

  // Keep /posts and /posts?type=post as the posts page; /posts?type=reel for reels.
  useEffect(() => {
    const raw = searchParams.get('type')
    if (!raw || resolveCatalogType(raw) !== raw) {
      const next = new URLSearchParams(searchParams)
      next.set('type', catalogType)
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, catalogType, setSearchParams])

  // Reset listing filters when switching posts ↔ reels.
  useEffect(() => {
    setSearchDraft('')
    setFilters({ search: '', category: '', tag: '' })
    setInitialReady(false)
  }, [catalogType])

  useEffect(() => {
    if (hubLoading) return undefined

    if (!catalogAllowed) {
      setLoading(false)
      setInitialReady(true)
      return undefined
    }

    let cancelled = false

    const query = {
      ...filters,
      type: catalogType,
    }

    const run = async () => {
      setLoading(true)
      setError('')
      try {
        if (!initialReady) {
          const [catsRes, tagsRes, postsRes] = await Promise.all([
            api.listCategories(),
            api.listTags(),
            api.posts(query),
          ])
          if (cancelled) return
          setCategories(catsRes.categories || [])
          setTags(tagsRes.tags || [])
          setPosts(postsRes.data || [])
          setTotalResults(postsRes.total ?? postsRes.data?.length ?? 0)
        } else {
          const postsRes = await api.posts(query)
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
    catalogType,
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
    setFilters({ search: '', category: '', tag: '' })
  }

  const hasFilters = Boolean(filters.search || filters.category || filters.tag)
  const catalogLocked = !isAuthenticated && !isClientAdmin

  const resultLabel = useMemo(() => {
    if (loading) {
      return isReelsPage
        ? t('finding_reels', 'Finding reels...')
        : t('finding_posts', 'Finding posts...')
    }
    if (totalResults === 0) {
      return isReelsPage
        ? t('no_match_reels', 'No reels match')
        : t('no_match_posts', 'No posts match')
    }
    const key = isReelsPage
      ? totalResults === 1
        ? 'results_reel'
        : 'results_reels'
      : totalResults === 1
        ? 'results_post'
        : 'results_posts'
    const fallback =
      totalResults === 1
        ? isReelsPage
          ? '{count} reel found'
          : '{count} post found'
        : isReelsPage
          ? '{count} reels found'
          : '{count} posts found'
    return fillPageText(t(key, fallback), { count: totalResults })
  }, [loading, totalResults, isReelsPage, pageContent])

  const onReached = useCallback((ids) => {
    const bumped = new Set(ids.map(Number))
    setPosts((prev) =>
      prev.map((post) => {
        if (!bumped.has(Number(post.id)) || post.reach_count == null) return post
        return { ...post, reach_count: Number(post.reach_count) + 1 }
      })
    )
  }, [])

  usePostReachTracking(loading ? [] : posts, onReached)

  if (hubLoading || !initialReady) {
    return <PageLoader />
  }

  if (!catalogAllowed) {
    return (
      <section>
        <div className="page-head">
          <div>
            <h1>{t('catalog_unavailable_title', 'Catalog unavailable')}</h1>
            <p className="muted">
              {t(
                'catalog_unavailable_body',
                'Browsing posts is disabled for this hub by Power Admin.'
              )}
            </p>
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
          <p className="catalog-hero__eyebrow">{t('eyebrow', 'Content library')}</p>
          <h1>
            {isReelsPage
              ? t('title_reels', 'Ready-to-post reels')
              : t('title_posts', 'Ready-to-post social posts')}
          </h1>
          <p className="catalog-hero__lead">
            {isReelsPage
              ? t(
                  'lead_reels',
                  'Browse short-form reels, unlock with credits, and preview the assets you need.'
                )
              : t(
                  'lead_posts',
                  'Browse promo posts, unlock with credits, and preview the assets you need.'
                )}
          </p>
        </div>
        <div className="catalog-hero__aside">
          {isAuthenticated && !isWhiteLabelHub ? (
            <div className="catalog-balance">
              <span>{t('balance_label', 'Your balance')}</span>
              <strong>{user?.credits ?? 0}</strong>
              <em>{t('credits_available', 'credits available')}</em>
              <Link to="/subscriptions" className="btn ghost">
                {t('top_up', 'Top up')}
              </Link>
            </div>
          ) : !isAuthenticated ? (
            <div className="catalog-cta">
              <p>
                {registrationEnabled
                  ? t(
                      'guest_cta_register',
                      'Create an account to preview content and buy with credits.'
                    )
                  : t(
                      'guest_cta_invite',
                      'This hub is invite-only. Sign in with your invited account to continue.'
                    )}
              </p>
              {registrationEnabled ? (
                <button className="btn primary" onClick={() => navigate('/register')}>
                  {t('sign_up', 'Sign up free')}
                </button>
              ) : (
                <button className="btn primary" onClick={() => navigate('/login')}>
                  {t('sign_in', 'Sign in')}
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {catalogLocked && (
        <div className="catalog-lock-banner">
          <div>
            <strong>{t('lock_title', 'Content is locked')}</strong>
            <p className="muted">
              {t(
                'lock_body',
                'Log in to preview posts and buy them with credits.'
              )}
            </p>
          </div>
          <div className="actions">
            <Link to="/login" className="btn ghost">
              {t('login', 'Login')}
            </Link>
            {registrationEnabled && (
              <Link to="/register" className="btn primary">
                {t('sign_up', 'Sign up free')}
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="listing-filters">
        <div className="listing-filter-row">
          <form className="listing-search" onSubmit={onSearch}>
            <input
              placeholder={
                isReelsPage
                  ? t('search_reels', 'Search reels by title or description...')
                  : t('search_posts', 'Search posts by title or description...')
              }
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              aria-label={isReelsPage ? 'Search reels' : 'Search posts'}
            />
            <button className="btn primary" type="submit">
              {t('search_button', 'Search')}
            </button>
          </form>

          <FilterSelect
            label={t('category_label', 'Category')}
            aria-label="Filter by category"
            value={filters.category}
            onChange={(next) => setFilters((prev) => ({ ...prev, category: next }))}
            options={[
              { value: '', label: t('all_categories', 'All categories') },
              ...categories.map((category) => ({
                value: category.name,
                label: `${category.name} (${category.posts_count ?? 0})`,
              })),
            ]}
          />

          {tags.length > 0 && (
            <FilterSelect
              label={t('tag_label', 'Tag')}
              aria-label="Filter by tag"
              value={filters.tag}
              onChange={(next) => setFilters((prev) => ({ ...prev, tag: next }))}
              options={[
                { value: '', label: t('all_tags', 'All tags') },
                ...tags.map((tag) => ({
                  value: tag.name,
                  label: `${tag.name} (${tag.posts_count ?? 0})`,
                })),
              ]}
            />
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
              {t('clear_all', 'Clear all')}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {posts.length === 0 && !loading ? (
        <div className="empty-state">
          <h2>
            {isReelsPage
              ? t('empty_title_reels', 'No reels found')
              : t('empty_title_posts', 'No posts found')}
          </h2>
          <p className="muted">
            {hasFilters
              ? t('empty_filtered', 'Try another category, tag, or clear your search.')
              : isReelsPage
                ? t(
                    'empty_body_reels',
                    'New reels will appear here once the client admin adds them.'
                  )
                : t(
                    'empty_body_posts',
                    'New posts will appear here once the client admin adds them.'
                  )}
          </p>
          {hasFilters && (
            <button className="btn primary" onClick={clearFilters}>
              {t('reset_filters', 'Reset filters')}
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
                data-post-id={post.id}
                data-track-reach="1"
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
                      {locked
                        ? t('badge_locked', 'Locked')
                        : post.type || post.category}
                    </div>
                  )}

                  {post.is_new && <span className="new-banner">NEW</span>}

                  {isReel && !locked && (
                    <span className="media-type-chip" aria-hidden="true">
                      {t('reel_label', 'Reel')}
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
                      {post.is_purchased
                        ? t('badge_owned', 'Owned')
                        : locked
                          ? t('badge_locked', 'Locked')
                          : t('badge_available', 'Available')}
                    </span>
                    <span className="credit-chip">{post.credits_cost} credits</span>
                  </div>
                </div>
                <div className="post-tile-body">
                  <div className="post-meta">
                    <span className="category-label">
                      {isReel ? t('reel_label', 'Reel') : post.type || 'Post'}
                    </span>
                    <span className="muted">{post.category}</span>
                    <span>{formatDate(post.last_updated || post.updated_at)}</span>
                  </div>
                  <h2>{post.title}</h2>
                  {locked ? (
                    <p className="post-excerpt muted">
                      {t(
                        'locked_excerpt',
                        'Log in to preview this item and buy it with credits.'
                      )}
                    </p>
                  ) : (
                    <p className="post-excerpt">
                      {truncateRichText(post.description, 110) ||
                        t('no_description', 'No description provided.')}
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
                        ? t('login_to_unlock', 'Login to unlock →')
                        : post.is_purchased
                          ? isReel
                            ? t('play_reel', 'Play reel →')
                            : t('view_post', 'View post →')
                          : isReel
                            ? t('buy_reel', 'Buy & play →')
                            : t('buy_post', 'Buy post →')}
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
