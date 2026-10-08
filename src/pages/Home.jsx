import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaChevronLeft,
  FaChevronRight,
  FaFile,
  FaFileAlt,
  FaFileArchive,
  FaFileExcel,
  FaFileImage,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileWord,
  FaGlobe,
  FaPencilAlt,
  FaShieldAlt,
} from 'react-icons/fa'
import { api } from '../api/client'
import PageLoader from '../components/PageLoader'
import StStatusBadge from '../components/SupportTicketsUI'
import TemplateScrollPreview from '../websiteCompliance/components/TemplateScrollPreview'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { fileDisplayName, fileExtension, fileKind } from '../utils/fileDisplay'
import { fillPageText, formatPageHtml, pageText } from '../utils/pageContent'
import '../websiteCompliance/wc.css'

const DOC_KIND_ICONS = {
  image: FaFileImage,
  pdf: FaFilePdf,
  word: FaFileWord,
  excel: FaFileExcel,
  powerpoint: FaFilePowerpoint,
  archive: FaFileArchive,
  text: FaFileAlt,
  video: FaFileAlt,
  file: FaFile,
}

const DOC_KIND_LABELS = {
  image: 'Image',
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel',
  powerpoint: 'PowerPoint',
  archive: 'Archive',
  text: 'Text',
  video: 'Video',
  file: 'File',
}

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
  return Array.from(byId.values())
}

function docCreatedAt(doc) {
  return doc?.created_at ? new Date(doc.created_at).getTime() : 0
}

function primaryAttachment(doc) {
  const list = doc?.attachments || []
  return list.find((a) => fileKind(a.original_name, a.mime_type) === 'image') || list[0] || null
}

function describeAttachment(attachment, docTitle = '') {
  const name = attachment?.original_name || docTitle || 'Document'
  const kind = fileKind(name, attachment?.mime_type)
  const ext = fileExtension(name)
  return {
    kind,
    ext: ext ? ext.toUpperCase() : DOC_KIND_LABELS[kind] || 'FILE',
    label: fileDisplayName(name) || docTitle || 'Document',
    kindLabel: DOC_KIND_LABELS[kind] || 'File',
    isImage: kind === 'image',
    fileUrl: attachment?.file_url || null,
  }
}

/**
 * Latest uploads first, then most-used (by category usage / attachment count).
 */
function orderDocumentsLatestThenMostUsed(docs, categoryUsage = {}) {
  const latest = [...docs].sort((a, b) => docCreatedAt(b) - docCreatedAt(a))
  const usageScore = (doc) => {
    const catId = doc.category_id || doc.category?.id
    const fromCategory = catId != null ? Number(categoryUsage[catId] || 0) : 0
    const attachments = Array.isArray(doc.attachments) ? doc.attachments.length : 0
    return fromCategory * 10 + attachments
  }
  const mostUsed = [...docs].sort((a, b) => {
    const diff = usageScore(b) - usageScore(a)
    if (diff !== 0) return diff
    return docCreatedAt(b) - docCreatedAt(a)
  })

  const seen = new Set()
  const out = []
  const pushUnique = (list, limit) => {
    for (const doc of list) {
      if (out.length >= limit) break
      if (seen.has(doc.id)) continue
      seen.add(doc.id)
      out.push(doc)
    }
  }
  // Front of stack = newest; remaining slots filled by most-used.
  pushUnique(latest, 3)
  pushUnique(mostUsed, 6)
  return out
}

function buildDocumentCategoryStats(docs, categoriesFromApi = []) {
  const counts = new Map()
  docs.forEach((doc) => {
    const name = doc.category?.name || 'Uncategorized'
    const id = doc.category_id || doc.category?.id || name
    const prev = counts.get(id) || { id, name, count: 0 }
    prev.count += 1
    counts.set(id, prev)
  })

  // Prefer API categories (with usage_count) when present; merge live counts.
  const fromApi = (categoriesFromApi || []).map((cat) => ({
    id: cat.id,
    name: cat.name,
    count: Number(cat.usage_count ?? counts.get(cat.id)?.count ?? 0),
  }))

  const merged = fromApi.length
    ? fromApi.filter((cat) => cat.count > 0)
    : Array.from(counts.values())

  return merged.sort((a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name)))
}

export default function Home() {
  const { isAuthenticated } = useAuth()
  const { hub, branding, can, registrationEnabled, loading: hubLoading, pageContent } = useHub()
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [templates, setTemplates] = useState([])
  const [tickets, setTickets] = useState([])
  const [documents, setDocuments] = useState([])
  const [documentCategories, setDocumentCategories] = useState([])
  const [ticketTab, setTicketTab] = useState('overview')
  const [docSlide, setDocSlide] = useState(0)
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
            .then((res) => ({
              documents: flattenFirmDocuments(res),
              categories: res.categories || [],
            }))
            .catch(() => ({ documents: [], categories: [] }))
        : Promise.resolve({ documents: [], categories: [] })

    Promise.all([loadPosts, loadCategories, loadTemplates, loadTickets, loadDocuments])
      .then(([nextPosts, nextCategories, nextTemplates, nextTickets, nextDocs]) => {
        if (cancelled) return
        setPosts(nextPosts)
        setCategories(nextCategories)
        setTemplates(nextTemplates)
        setTickets(nextTickets)
        setDocuments(nextDocs.documents || [])
        setDocumentCategories(nextDocs.categories || [])
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

  const documentCategoryStats = useMemo(
    () => buildDocumentCategoryStats(documents, documentCategories),
    [documents, documentCategories]
  )

  const categoryUsageMap = useMemo(() => {
    const map = {}
    documentCategories.forEach((cat) => {
      if (cat?.id != null) map[cat.id] = Number(cat.usage_count || 0)
    })
    documentCategoryStats.forEach((cat) => {
      if (cat?.id != null && map[cat.id] == null) map[cat.id] = Number(cat.count || 0)
    })
    return map
  }, [documentCategories, documentCategoryStats])

  const featuredDocuments = useMemo(
    () => orderDocumentsLatestThenMostUsed(documents, categoryUsageMap),
    [documents, categoryUsageMap]
  )

  const documentStackItems = useMemo(() => {
    const fallbackImages = [
      t('documents_image_1'),
      t('documents_image_2'),
      t('documents_image_3'),
    ].filter(Boolean)

    if (featuredDocuments.length) {
      return featuredDocuments.slice(0, 8).map((doc, index) => {
        const attachment = primaryAttachment(doc)
        const meta = describeAttachment(attachment, doc.title)
        return {
          key: doc.id,
          title: doc.title || meta.label,
          category: doc.category?.name || '',
          imageUrl: meta.isImage ? meta.fileUrl : null,
          kind: meta.kind,
          ext: meta.ext,
          kindLabel: meta.kindLabel,
          badge: index < 3 ? 'Latest' : 'Most used',
          doc,
          fileUrl: meta.fileUrl,
        }
      })
    }

    return fallbackImages.slice(0, 4).map((url, index) => ({
      key: `fallback-${index}`,
      title: t('documents_panel_title', 'Firm documents'),
      category: '',
      imageUrl: url,
      kind: 'image',
      ext: 'IMG',
      kindLabel: 'Image',
      badge: '',
      doc: null,
      fileUrl: null,
    }))
  }, [featuredDocuments, pageContent])

  useEffect(() => {
    setDocSlide(0)
  }, [documentStackItems.length])

  useEffect(() => {
    if (documentStackItems.length < 2) return undefined
    const timer = window.setInterval(() => {
      setDocSlide((prev) => (prev + 1) % documentStackItems.length)
    }, 4200)
    return () => window.clearInterval(timer)
  }, [documentStackItems.length])

  const docCarouselItems = documentStackItems.length
    ? documentStackItems
    : [
        {
          key: 'empty',
          title: 'Documents',
          category: '',
          imageUrl: null,
          kind: 'file',
          ext: 'FILE',
          kindLabel: 'File',
          badge: '',
          doc: null,
          fileUrl: null,
        },
      ]

  const docSlideSafe = docCarouselItems.length
    ? ((docSlide % docCarouselItems.length) + docCarouselItems.length) % docCarouselItems.length
    : 0

  function docSlideOffset(index) {
    const total = docCarouselItems.length
    if (total <= 1) return 0
    let diff = index - docSlideSafe
    if (diff > total / 2) diff -= total
    if (diff < -total / 2) diff += total
    return diff
  }

  function renderDocPaper(item) {
    const Icon = DOC_KIND_ICONS[item.kind] || FaFile
    if (item.kind === 'image' && item.imageUrl) {
      return (
        <div className="home-doc-paper__media">
          <img src={item.imageUrl} alt="" loading="lazy" />
          <div className="home-doc-paper__media-caption">
            <strong>{item.title}</strong>
          </div>
        </div>
      )
    }
    if (item.kind === 'excel') {
      return (
        <div className="home-doc-paper__sheet home-doc-paper__sheet--excel">
          <div className="home-doc-paper__sheet-head">
            <Icon />
            <span>{item.ext || 'XLSX'}</span>
          </div>
          <div className="home-doc-paper__grid" aria-hidden="true">
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} />
            ))}
          </div>
          <strong>{item.title}</strong>
        </div>
      )
    }
    if (item.kind === 'word') {
      return (
        <div className="home-doc-paper__sheet home-doc-paper__sheet--word">
          <div className="home-doc-paper__sheet-head">
            <Icon />
            <span>{item.ext || 'DOCX'}</span>
          </div>
          <div className="home-doc-paper__ruled" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <strong>{item.title}</strong>
        </div>
      )
    }
    if (item.kind === 'pdf') {
      return (
        <div className="home-doc-paper__sheet home-doc-paper__sheet--pdf">
          <div className="home-doc-paper__sheet-head">
            <Icon />
            <span>{item.ext || 'PDF'}</span>
          </div>
          <div className="home-doc-paper__blocks" aria-hidden="true">
            <em />
            <i />
            <i />
            <i />
          </div>
          <strong>{item.title}</strong>
        </div>
      )
    }
    return (
      <div className={`home-doc-paper__sheet home-doc-paper__sheet--${item.kind || 'file'}`}>
        <div className="home-doc-paper__sheet-head">
          <Icon />
          <span>{item.ext || 'FILE'}</span>
        </div>
        <span className="home-doc-paper__icon-lg" aria-hidden="true">
          <Icon />
        </span>
        <strong>{item.title}</strong>
        <span className="home-doc-paper__meta">
          {[item.kindLabel, item.category].filter(Boolean).join(' · ')}
        </span>
      </div>
    )
  }

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

  const documentsPanelBadge = fillPageText(
    t('documents_panel_badge', '{count}+ Documents'),
    { count: documents.length || documentCategoryStats.reduce((sum, c) => sum + c.count, 0) }
  )

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
        <div className="home-band__inner home-documents__layout">
          <div className="home-documents__copy">
            <h2
              dangerouslySetInnerHTML={{
                __html: formatPageHtml(
                  t('documents_title', 'Discover our documents, guides & checklists')
                ),
              }}
            />
            <p
              className="home-documents__lead"
              dangerouslySetInnerHTML={{
                __html: formatPageHtml(
                  t('documents_lead', 'Stay organized and achieve your goals with:')
                ),
              }}
            />

            {!documentsModuleOn ? (
              <p className="muted">{t('documents_disabled', 'Documents are not enabled on this hub.')}</p>
            ) : !isAuthenticated ? (
              <p className="muted">
                {t(
                  'documents_body',
                  'Open the document library to read more and download what you need.'
                )}
              </p>
            ) : !canViewDocuments ? (
              <p className="muted">{t('documents_disabled', 'Documents are not enabled on this hub.')}</p>
            ) : documentCategoryStats.length > 0 ? (
              <ul className="home-documents__stats">
                {documentCategoryStats.slice(0, 6).map((cat) => (
                  <li key={cat.id || cat.name}>
                    <strong>{cat.count}+</strong>
                    <span>{cat.name}</span>
                  </li>
                ))}
              </ul>
            ) : documents.length === 0 ? (
              <p className="muted">No documents available yet.</p>
            ) : (
              <ul className="home-documents__stats">
                <li>
                  <strong>{documents.length}+</strong>
                  <span>Documents</span>
                </li>
              </ul>
            )}

            {documentsModuleOn && (
              <Link to={documentsHref} className="btn primary home-documents__cta">
                {t('documents_cta', 'Read more')}
              </Link>
            )}
          </div>

          <div className="home-documents__panel">
            <p className="home-documents__panel-badge">{documentsPanelBadge}</p>
            <h3 className="home-documents__panel-title">
              {t('documents_panel_title', 'Firm documents')}
            </h3>
            <p className="home-documents__panel-sub">
              {t('documents_panel_subtitle', 'Latest uploads | Most used')}
            </p>

            <div className="home-documents__carousel" aria-roledescription="carousel">
              {docCarouselItems.length > 1 && (
                <button
                  type="button"
                  className="home-documents__nav home-documents__nav--prev"
                  aria-label="Previous document"
                  onClick={() =>
                    setDocSlide(
                      (prev) => (prev - 1 + docCarouselItems.length) % docCarouselItems.length
                    )
                  }
                >
                  <FaChevronLeft />
                </button>
              )}

              <div className="home-documents__stage">
                {docCarouselItems.map((item, index) => {
                  const offset = docSlideOffset(index)
                  if (Math.abs(offset) > 2) return null
                  const layer = `home-doc-paper home-doc-paper--${item.kind || 'file'} home-doc-paper--offset-${offset}`
                  const paper = (
                    <>
                      {item.badge ? (
                        <span className="home-doc-paper__badge">{item.badge}</span>
                      ) : null}
                      {renderDocPaper(item)}
                    </>
                  )

                  if (offset === 0 && item.fileUrl) {
                    return (
                      <a
                        key={item.key}
                        className={layer}
                        href={item.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={item.title}
                      >
                        {paper}
                      </a>
                    )
                  }
                  if (offset === 0 && item.doc) {
                    return (
                      <Link
                        key={item.key}
                        className={layer}
                        to={`/my-dashboard/firm-documents/${item.doc.id}`}
                        title={item.title}
                      >
                        {paper}
                      </Link>
                    )
                  }

                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={layer}
                      title={item.title}
                      onClick={() => setDocSlide(index)}
                    >
                      {paper}
                    </button>
                  )
                })}
              </div>

              {docCarouselItems.length > 1 && (
                <button
                  type="button"
                  className="home-documents__nav home-documents__nav--next"
                  aria-label="Next document"
                  onClick={() => setDocSlide((prev) => (prev + 1) % docCarouselItems.length)}
                >
                  <FaChevronRight />
                </button>
              )}
            </div>

            {docCarouselItems.length > 1 && (
              <div className="home-documents__dots" role="tablist" aria-label="Document slides">
                {docCarouselItems.map((item, index) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={index === docSlideSafe}
                    className={`home-documents__dot${index === docSlideSafe ? ' is-active' : ''}`}
                    onClick={() => setDocSlide(index)}
                    aria-label={`Show ${item.title}`}
                  />
                ))}
              </div>
            )}

            <div className="home-documents__panel-ticker">
              <span>{t('documents_panel_subtitle', 'Latest uploads | Most used')}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="home-band home-features">
        <div className="home-band__inner">
          <div className="home-features__head">
            <h2>
              {t('features_title', 'Why choose compliant content?')}
            </h2>
            <p className="muted">
              {t(
                'features_lead',
                'Everything you need to publish with confidence — templates, editing, and compliance in one hub.'
              )}
            </p>
          </div>
          <div className="home-features__grid">
            {[
              {
                key: 'sm',
                icon: FaShieldAlt,
                title: t('features_card1_title', 'SM Templates and compliance'),
                text: t(
                  'features_card1_text',
                  'Browse ready-made social media templates that stay aligned with your hub compliance workflow.'
                ),
                to: t('features_card1_url', '/my-dashboard/social-media-compliance'),
              },
              {
                key: 'canva',
                icon: FaPencilAlt,
                title: t('features_card2_title', 'Editing SM Templates with Canva'),
                text: t(
                  'features_card2_text',
                  'Open templates in Canva, personalise the creative, and keep branding consistent across posts and reels.'
                ),
                to: t('features_card2_url', '/posts?type=post'),
              },
              {
                key: 'website',
                icon: FaGlobe,
                title: t('features_card3_title', 'Website and Compliance'),
                text: t(
                  'features_card3_text',
                  'Manage website templates and content changes with review, approval, and live publishing controls.'
                ),
                to: t('features_card3_url', '/my-dashboard/website-compliance/request-site'),
              },
              {
                key: 'generic',
                icon: FaFileAlt,
                title: t('features_card4_title', 'Generic Compliance'),
                text: t(
                  'features_card4_text',
                  'Submit generic compliance items, track status, and keep a clear audit trail for every request.'
                ),
                to: t('features_card4_url', '/my-dashboard/general-compliance'),
              },
            ].map((card) => {
              const Icon = card.icon
              const rawTo = String(card.to || '').trim()
              const needsAuth = rawTo.startsWith('/my-dashboard')
              const href =
                !rawTo
                  ? '/'
                  : !isAuthenticated && needsAuth
                    ? '/login'
                    : rawTo
              const isExternal = /^https?:\/\//i.test(href)

              const body = (
                <>
                  <span className="home-feature-card__icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </>
              )

              if (isExternal) {
                return (
                  <a
                    key={card.key}
                    className="home-feature-card"
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {body}
                  </a>
                )
              }

              return (
                <Link key={card.key} className="home-feature-card" to={href}>
                  {body}
                </Link>
              )
            })}
          </div>
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
