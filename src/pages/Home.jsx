import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import PageLoader from '../components/PageLoader'
import StStatusBadge from '../components/SupportTicketsUI'
import TemplateScrollPreview from '../websiteCompliance/components/TemplateScrollPreview'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatPageHtml, pageText } from '../utils/pageContent'
import '../websiteCompliance/wc.css'

function splitColumns(posts) {
  const left = []
  const right = []
  posts.forEach((post, index) => {
    ;(index % 2 === 0 ? left : right).push(post)
  })
  return { left, right }
}

function MarqueeColumn({ posts, direction }) {
  const loop =
    posts.length > 0
      ? posts.length < 6
        ? [...posts, ...posts, ...posts, ...posts]
        : [...posts, ...posts]
      : []

  if (loop.length === 0) {
    return <div className="home-marquee__column home-marquee__column--empty" aria-hidden="true" />
  }

  return (
    <div className={`home-marquee__column home-marquee__column--${direction}`}>
      <div className="home-marquee__track">
        {loop.map((post, index) => (
          <div key={`${post.id}-${index}`} className="home-marquee__card">
            <img src={post.cover_url} alt="" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  )
}

function categoryInitial(name) {
  const text = String(name || '').trim()
  return text ? text.charAt(0).toUpperCase() : '?'
}

function ticketStatusBucket(status) {
  const raw = String(status || '').toLowerCase()
  if (raw.includes('progress') || raw.includes('working') || raw.includes('pending')) return 'progress'
  if (raw.includes('complete') || raw.includes('closed') || raw.includes('resolved') || raw.includes('done')) {
    return 'completed'
  }
  return 'open'
}

function collectDocumentsFromFolders(folders, out = []) {
  for (const folder of folders || []) {
    for (const doc of folder.documents || []) {
      out.push(doc)
    }
    if (folder.children?.length) {
      collectDocumentsFromFolders(folder.children, out)
    }
  }
  return out
}

function flattenFirmDocuments(payload) {
  const fromFolders = collectDocumentsFromFolders(payload?.folders || [])
  const unfiled = payload?.unfiled_documents || []
  const flat = payload?.documents || []
  const byId = new Map()
  ;[...fromFolders, ...unfiled, ...flat].forEach((doc) => {
    if (doc?.id != null) byId.set(doc.id, doc)
  })
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })
}

function formatDocDate(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString()
  } catch {
    return value
  }
}

export default function Home() {
  const { isAuthenticated } = useAuth()
  const { hub, branding, can, registrationEnabled, loading: hubLoading, pageContent } = useHub()
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [templates, setTemplates] = useState([])
  const [tickets, setTickets] = useState([])
  const [documents, setDocuments] = useState([])
  const [ticketTab, setTicketTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const brandName = branding?.application_name || hub?.name || 'Hub Finproms'
  const catalogAllowed = can('member_browse_catalog')
  const ticketsModuleOn = can('support_tickets')
  const canViewTickets = isAuthenticated && (can('st_view_own_tickets') || can('st_submit_ticket'))
  const canSubmitTicket = isAuthenticated && can('st_submit_ticket')
  const documentsModuleOn = can('firm_documents')
  const canViewDocuments = isAuthenticated && can('firm_documents_view')
  const t = (key, fallback = '') => pageText(pageContent, 'home', key, fallback)

  useEffect(() => {
    if (hubLoading) return undefined

    let cancelled = false
    setLoading(true)
    setError('')

    const loadPosts = catalogAllowed
      ? api.posts({ per_page: 50 }).then((res) => (res.data || []).filter((p) => p.cover_url))
      : Promise.resolve([])

    const loadCategories = catalogAllowed
      ? api.listCategories().then((res) => res.categories || []).catch(() =>
          api.categories().then((res) =>
            (res.categories || []).map((name) => (typeof name === 'string' ? { name } : name))
          )
        )
      : Promise.resolve([])

    const loadTemplates = api
      .homeWebsiteTemplates({ limit: 12 })
      .then((res) => res.templates || [])
      .catch(() => [])

    const loadTickets =
      ticketsModuleOn && canViewTickets
        ? api.supportTicketsMine({ per_page: 8 }).then((res) => res.data || []).catch(() => [])
        : Promise.resolve([])

    const loadDocuments =
      documentsModuleOn && canViewDocuments
        ? api
            .listFirmDocuments({ scope: 'active' })
            .then((res) => flattenFirmDocuments(res))
            .catch(() => [])
        : Promise.resolve([])

    Promise.all([loadPosts, loadCategories, loadTemplates, loadTickets, loadDocuments])
      .then(([nextPosts, nextCategories, nextTemplates, nextTickets, nextDocuments]) => {
        if (cancelled) return
        setPosts(nextPosts)
        setCategories(nextCategories)
        setTemplates(nextTemplates)
        setTickets(nextTickets)
        setDocuments(nextDocuments)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load home content')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [hubLoading, catalogAllowed, ticketsModuleOn, canViewTickets, documentsModuleOn, canViewDocuments])

  const { left, right } = useMemo(() => splitColumns(posts), [posts])

  const ticketCounts = useMemo(() => {
    const counts = { open: 0, progress: 0, completed: 0 }
    tickets.forEach((ticket) => {
      counts[ticketStatusBucket(ticket.status)] += 1
    })
    return counts
  }, [tickets])

  const assistanceCards = useMemo(() => {
    const chatUrl = t('assistance_chat_url').trim()
    const whatsappUrl = t('assistance_whatsapp_url').trim()
    const email = t('assistance_email').trim() || branding?.from_email || ''
    const cards = []
    if (chatUrl) {
      cards.push({
        key: 'chat',
        label: t('assistance_chat_label', 'Live chat'),
        text: t('assistance_chat_text', 'Chat with a specialist in real time.'),
        href: chatUrl,
        external: true,
      })
    }
    if (whatsappUrl) {
      cards.push({
        key: 'whatsapp',
        label: t('assistance_whatsapp_label', 'WhatsApp'),
        text: t('assistance_whatsapp_text', 'Message us on WhatsApp for quick help.'),
        href: whatsappUrl,
        external: true,
      })
    }
    if (email) {
      cards.push({
        key: 'email',
        label: t('assistance_email_label', 'Email'),
        text: t('assistance_email_text', 'Send us an email and we will respond soon.'),
        href: `mailto:${email}`,
        external: true,
      })
    }
    return cards
  }, [pageContent, branding])

  const primaryCta = isAuthenticated
    ? { to: '/posts?type=post', label: t('cta_browse_posts', 'Browse posts') }
    : {
        to: registrationEnabled ? '/register' : '/login',
        label: registrationEnabled
          ? t('cta_get_started', 'Get started')
          : t('cta_log_in', 'Log in'),
      }

  const secondaryCta = isAuthenticated
    ? { to: '/posts?type=reel', label: t('cta_browse_reels', 'Browse reels') }
    : registrationEnabled
      ? { to: '/login', label: t('cta_log_in', 'Log in') }
      : null

  const documentsHref = !isAuthenticated
    ? '/login'
    : canViewDocuments
      ? '/my-dashboard/firm-documents'
      : '/my-dashboard'

  if (hubLoading || (loading && posts.length === 0 && categories.length === 0 && !error)) {
    return <PageLoader />
  }

  return (
    <div className="home-page">
      <section className="home-landing">
        <div className="home-landing__grid">
          <div className="home-landing__copy">
            <p className="home-landing__eyebrow">{brandName}</p>
            <h1
              className="home-landing__title"
              dangerouslySetInnerHTML={{
                __html: formatPageHtml(
                  t('title', '*Transform* your social media in minutes with ready-made *templates*')
                ),
              }}
            />
            <p
              className="home-landing__lead"
              dangerouslySetInnerHTML={{
                __html: formatPageHtml(
                  t(
                    'lead',
                    'Discover **fully editable** posts and reels designed to simplify your creative process — compliant content, ready to publish.'
                  )
                ),
              }}
            />
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
                {t(
                  'guest_hint',
                  'Browse the home showcase freely. Sign in to open posts, bundles, and plans.'
                )}
              </p>
            )}
            {error && <p className="error">{error}</p>}
          </div>

          <div className="home-landing__showcase" aria-hidden={posts.length === 0}>
            {!catalogAllowed ? (
              <div className="home-landing__empty muted">
                {t('catalog_disabled', 'Catalog browsing is not enabled on this hub.')}
              </div>
            ) : posts.length === 0 ? (
              <div className="home-landing__empty muted">
                {t('empty_posts', 'Posts will appear here once published.')}
              </div>
            ) : (
              <div className="home-marquee">
                <MarqueeColumn posts={left.length ? left : posts} direction="down" />
                <MarqueeColumn posts={right.length ? right : posts} direction="up" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="categories" className="home-band home-categories">
        <div className="home-band__inner">
          <div className="home-band__head">
            <h2>{t('categories_title', 'Browse by Categories')}</h2>
            <p className="muted">{t('categories_lead', 'Explore content collections available on this hub.')}</p>
          </div>
          {!catalogAllowed ? (
            <p className="muted">{t('catalog_disabled', 'Catalog browsing is not enabled on this hub.')}</p>
          ) : categories.length === 0 ? (
            <p className="muted">{t('categories_empty', 'Categories will appear here once published on this hub.')}</p>
          ) : (
            <>
              <div className="home-categories__grid">
                {categories.map((category) => {
                  const name = category.name || category
                  return (
                    <Link
                      key={category.id || name}
                      to={`/posts?type=post&category=${encodeURIComponent(name)}`}
                      className="home-category-card"
                    >
                      <span className="home-category-card__icon" aria-hidden="true">
                        {categoryInitial(name)}
                      </span>
                      <span className="home-category-card__name">{name}</span>
                      {typeof category.posts_count === 'number' && (
                        <span className="home-category-card__meta muted">
                          {category.posts_count} items
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
              <div className="home-band__actions">
                <Link to="/posts?type=post" className="btn ghost">
                  {t('categories_view_all', 'View all')}
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {templates.length > 0 && (
        <section id="website-templates" className="home-band home-templates">
          <div className="home-band__inner">
            <div className="home-band__head">
              <h2>{t('templates_title', 'Website templates')}</h2>
              <p className="muted">
                {t('templates_lead', 'Showcase website templates available on this hub.')}
              </p>
            </div>
            <div className="wc-app home-templates__scope">
              <div className="home-templates__grid">
                {templates.map((template) => (
                  <article key={template.id || template.slug} className="home-template-card">
                    <TemplateScrollPreview template={template} className="home-template-card__preview" />
                    <div className="home-template-card__body">
                      <h3>{template.name}</h3>
                      {template.description && (
                        <p className="muted home-template-card__desc">{template.description}</p>
                      )}
                      {template.preview_url ? (
                        <a
                          className="btn ghost"
                          href={template.preview_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t('templates_cta', 'View template')}
                        </a>
                      ) : isAuthenticated ? (
                        <Link className="btn ghost" to="/my-dashboard/website-compliance/request-site">
                          {t('templates_cta', 'View template')}
                        </Link>
                      ) : (
                        <Link className="btn ghost" to="/login">
                          {t('templates_cta', 'View template')}
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
            {isAuthenticated && (
              <div className="home-band__actions">
                <Link to="/my-dashboard/website-compliance/request-site" className="btn ghost">
                  {t('templates_view_all', 'Browse templates')}
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      <section id="tickets" className="home-band home-tickets">
        <div className="home-band__inner">
          <div className="home-band__head">
            <h2>{t('tickets_title', 'Support tickets')}</h2>
            <p className="muted">
              {t('tickets_lead', 'Check ticket status, browse your tickets, or raise a new one.')}
            </p>
          </div>

          {!ticketsModuleOn ? (
            <p className="muted">{t('tickets_disabled', 'Support tickets are not enabled on this hub.')}</p>
          ) : (
            <>
              <div className="home-tickets__tabs" role="tablist" aria-label="Ticket sections">
                {[
                  { id: 'overview', label: t('tickets_tab_overview', 'Tickets') },
                  { id: 'mine', label: t('tickets_tab_mine', 'My tickets') },
                  { id: 'raise', label: t('tickets_tab_raise', 'Raise a ticket') },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={ticketTab === tab.id}
                    className={`home-tickets__tab${ticketTab === tab.id ? ' is-active' : ''}`}
                    onClick={() => setTicketTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="home-tickets__panel">
                {ticketTab === 'overview' && (
                  <div className="home-tickets__overview">
                    <p>{t('tickets_overview_body', 'Track open requests and get help from the support team.')}</p>
                    <div className="home-tickets__stats">
                      <div className="home-tickets__stat">
                        <strong>{canViewTickets ? ticketCounts.open : '—'}</strong>
                        <span>{t('tickets_status_open', 'Open')}</span>
                      </div>
                      <div className="home-tickets__stat">
                        <strong>{canViewTickets ? ticketCounts.progress : '—'}</strong>
                        <span>{t('tickets_status_progress', 'In progress')}</span>
                      </div>
                      <div className="home-tickets__stat">
                        <strong>{canViewTickets ? ticketCounts.completed : '—'}</strong>
                        <span>{t('tickets_status_completed', 'Completed')}</span>
                      </div>
                    </div>
                    {!isAuthenticated ? (
                      <p className="muted">
                        {t('tickets_guest_hint', 'Sign in to view your tickets and raise a new one.')}
                      </p>
                    ) : (
                      <Link className="btn ghost" to="/my-dashboard/support-tickets">
                        {t('tickets_browse', 'Browse tickets')}
                      </Link>
                    )}
                  </div>
                )}

                {ticketTab === 'mine' && (
                  <div className="home-tickets__mine">
                    {!isAuthenticated ? (
                      <p className="muted">
                        {t('tickets_guest_hint', 'Sign in to view your tickets and raise a new one.')}{' '}
                        <Link to="/login">{t('cta_log_in', 'Log in')}</Link>
                      </p>
                    ) : !canViewTickets ? (
                      <p className="muted">{t('tickets_disabled', 'Support tickets are not enabled on this hub.')}</p>
                    ) : tickets.length === 0 ? (
                      <p className="muted">{t('tickets_empty', 'You have no tickets yet.')}</p>
                    ) : (
                      <ul className="home-tickets__list">
                        {tickets.slice(0, 5).map((ticket) => (
                          <li key={ticket.id}>
                            <Link to={`/my-dashboard/support-tickets/${ticket.id}`}>
                              <span className="home-tickets__list-id">#{ticket.id}</span>
                              <span className="home-tickets__list-subject">
                                {ticket.subject || 'Ticket'}
                              </span>
                              <StStatusBadge status={ticket.status} />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    {canViewTickets && (
                      <Link className="btn ghost" to="/my-dashboard/support-tickets">
                        {t('tickets_browse', 'Browse tickets')}
                      </Link>
                    )}
                  </div>
                )}

                {ticketTab === 'raise' && (
                  <div className="home-tickets__raise">
                    <p>
                      {t(
                        'tickets_raise_body',
                        'Need help? Open a ticket and our team will get back to you.'
                      )}
                    </p>
                    {!isAuthenticated ? (
                      <Link className="btn primary" to="/login">
                        {t('cta_log_in', 'Log in')}
                      </Link>
                    ) : canSubmitTicket ? (
                      <Link className="btn primary" to="/my-dashboard/support-tickets/new">
                        {t('tickets_raise_cta', 'Create new ticket')}
                      </Link>
                    ) : (
                      <p className="muted">
                        {t('tickets_disabled', 'Support tickets are not enabled on this hub.')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <section id="documents" className="home-band home-documents">
        <div className="home-band__inner">
          <div className="home-band__head home-documents__head">
            <div>
              <h2
                dangerouslySetInnerHTML={{
                  __html: formatPageHtml(
                    t('documents_title', 'Discover our documents, guides & checklists')
                  ),
                }}
              />
              <p
                className="muted"
                dangerouslySetInnerHTML={{
                  __html: formatPageHtml(
                    t(
                      'documents_lead',
                      'Browse firm documents curated for your hub — policies, planners, and ready-to-use resources.'
                    )
                  ),
                }}
              />
            </div>
            {documentsModuleOn && (
              <Link to={documentsHref} className="btn ghost">
                {t('documents_cta', 'Read more')}
              </Link>
            )}
          </div>

          {!documentsModuleOn ? (
            <p className="muted">{t('documents_disabled', 'Documents are not enabled on this hub.')}</p>
          ) : !isAuthenticated ? (
            <p className="muted">
              {t('documents_body', 'Open the document library to read more and download what you need.')}{' '}
              <Link to="/login">{t('cta_log_in', 'Log in')}</Link>
            </p>
          ) : !canViewDocuments ? (
            <p className="muted">{t('documents_disabled', 'Documents are not enabled on this hub.')}</p>
          ) : documents.length === 0 ? (
            <p className="muted">No documents available yet.</p>
          ) : (
            <div className="home-documents__list">
              {documents.slice(0, 8).map((doc) => {
                const attachment = doc.attachments?.[0]
                const fileUrl = attachment?.file_url
                const meta = [
                  doc.category?.name,
                  formatDocDate(doc.created_at),
                ].filter(Boolean).join(' · ')
                const body = (
                  <>
                    <span className="home-document-card__icon" aria-hidden="true">
                      {categoryInitial(doc.title || 'D')}
                    </span>
                    <span className="home-document-card__body">
                      <strong>{doc.title || attachment?.original_name || 'Document'}</strong>
                      {meta && <span className="muted">{meta}</span>}
                      {doc.description && (
                        <span className="home-document-card__desc muted">{doc.description}</span>
                      )}
                    </span>
                    <span className="home-document-card__cta">{t('documents_cta', 'Read more')}</span>
                  </>
                )

                if (fileUrl) {
                  return (
                    <a
                      key={doc.id}
                      className="home-document-card"
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {body}
                    </a>
                  )
                }

                return (
                  <Link
                    key={doc.id}
                    className="home-document-card"
                    to={`/my-dashboard/firm-documents/${doc.id}`}
                  >
                    {body}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section id="assistance" className="home-band home-assistance">
        <div className="home-band__inner">
          <div className="home-band__head">
            <h2>
              {t(
                'assistance_title',
                'Need assistance? Our specialized agents will help you!'
              )}
            </h2>
            <p className="muted">
              {t(
                'assistance_lead',
                'Get in touch with experts via live chat, WhatsApp, or email.'
              )}
            </p>
          </div>
          {assistanceCards.length > 0 && (
            <div className="home-assistance__grid">
              {assistanceCards.map((card) => (
                <a
                  key={card.key}
                  className="home-assistance__card"
                  href={card.href}
                  {...(card.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  <h3>{card.label}</h3>
                  <p className="muted">{card.text}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
