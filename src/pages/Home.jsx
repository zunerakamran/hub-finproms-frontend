import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import PageLoader from '../components/PageLoader'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

function splitColumns(posts) {
  const left = []
  const right = []
  posts.forEach((post, index) => {
    ;(index % 2 === 0 ? left : right).push(post)
  })
  return { left, right }
}

function MarqueeColumn({ posts, direction }) {
  const loop = posts.length > 0 ? [...posts, ...posts] : []

  if (loop.length === 0) {
    return <div className="home-marquee__column home-marquee__column--empty" aria-hidden="true" />
  }

  return (
    <div className={`home-marquee__column home-marquee__column--${direction}`}>
      <div className="home-marquee__track">
        {loop.map((post, index) => (
          <div key={`${post.id}-${index}`} className="home-marquee__card">
            {post.cover_url ? (
              <img src={post.cover_url} alt="" loading="lazy" />
            ) : (
              <div className="home-marquee__placeholder">
                <span>{post.title || 'Post'}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const { isAuthenticated } = useAuth()
  const { hub, branding, can, registrationEnabled, loading: hubLoading } = useHub()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'
  const catalogAllowed = can('member_browse_catalog')
  const showPlans = can('member_view_plans') && (can('public_subscribe') || can('paid_credits'))

  useEffect(() => {
    if (hubLoading) return undefined
    if (!catalogAllowed) {
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError('')

    api
      .posts({ per_page: 24 })
      .then((res) => {
        if (cancelled) return
        const rows = (res.data || []).filter((p) => p.cover_url || p.title)
        setPosts(rows)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load posts')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [hubLoading, catalogAllowed])

  const { left, right } = useMemo(() => splitColumns(posts), [posts])

  const primaryCta = isAuthenticated
    ? { to: '/posts', label: 'Browse posts' }
    : { to: registrationEnabled ? '/register' : '/login', label: registrationEnabled ? 'Get started' : 'Log in' }

  const secondaryCta = isAuthenticated
    ? showPlans
      ? { to: '/subscriptions', label: 'View plans' }
      : can('member_browse_catalog')
        ? { to: '/bundles', label: 'Shop bundles' }
        : null
    : registrationEnabled
      ? { to: '/login', label: 'Log in' }
      : null

  if (hubLoading || (loading && posts.length === 0 && !error)) {
    return <PageLoader />
  }

  return (
    <section className="home-landing">
      <div className="home-landing__grid">
        <div className="home-landing__copy">
          <p className="home-landing__eyebrow">{brandName}</p>
          <h1 className="home-landing__title">
            <em>Transform</em> your social media in minutes with ready-made{' '}
            <em>templates</em>
          </h1>
          <p className="home-landing__lead">
            Discover <strong>fully editable</strong> posts and reels designed to simplify your
            creative process — compliant content, ready to publish.
          </p>
          <div className="home-landing__actions">
            <Link to={primaryCta.to} className="btn primary">
              {primaryCta.label}
            </Link>
            {secondaryCta && (
              <Link to={secondaryCta.to} className="btn ghost home-landing__ghost">
                {secondaryCta.label}
              </Link>
            )}
          </div>
          {!isAuthenticated && (
            <p className="home-landing__hint muted">
              Browse the home showcase freely. Sign in to open posts, bundles, and plans.
            </p>
          )}
          {error && <p className="error">{error}</p>}
        </div>

        <div className="home-landing__showcase" aria-hidden={posts.length === 0}>
          {!catalogAllowed ? (
            <div className="home-landing__empty muted">Catalog browsing is not enabled on this hub.</div>
          ) : posts.length === 0 ? (
            <div className="home-landing__empty muted">Posts will appear here once published.</div>
          ) : (
            <div className="home-marquee">
              <MarqueeColumn posts={left.length ? left : posts} direction="down" />
              <MarqueeColumn posts={right.length ? right : posts} direction="up" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
