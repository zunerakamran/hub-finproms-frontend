import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'a',
  'span',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class']

/**
 * Sanitize rich-text HTML for safe rendering.
 * Plain legacy text (no tags) is escaped and wrapped in a paragraph.
 */
export function sanitizeRichText(html) {
  if (html == null || html === '') return ''
  const raw = String(html)
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(raw)
  const source = looksLikeHtml
    ? raw
    : `<p>${raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')}</p>`

  return DOMPurify.sanitize(source, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })
}

/** True when Quill/HTML content has no visible text. */
export function isRichTextEmpty(html) {
  if (html == null || html === '') return true
  const text = plainTextFromHtml(html).replace(/\u00a0/g, ' ').trim()
  return text.length === 0
}

/** Strip tags for previews, search snippets, and length checks. */
export function plainTextFromHtml(html) {
  if (html == null || html === '') return ''
  const raw = String(html)
  if (!/<\/?[a-z][\s\S]*>/i.test(raw)) return raw
  if (typeof document !== 'undefined') {
    const el = document.createElement('div')
    el.innerHTML = DOMPurify.sanitize(raw, { ALLOWED_TAGS, ALLOWED_ATTR })
    return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim()
  }
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Truncate plain text extracted from rich HTML. */
export function truncateRichText(html, maxLen = 110) {
  const text = plainTextFromHtml(html)
  if (!text) return ''
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen)}…`
}
