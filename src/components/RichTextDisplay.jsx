import { sanitizeRichText, isRichTextEmpty } from '../utils/richText'

/**
 * Renders sanitized rich-text HTML. Falls back to em-dash / empty when blank.
 */
export default function RichTextDisplay({
  html,
  className = '',
  empty = '—',
  as: Tag = 'div',
}) {
  if (isRichTextEmpty(html)) {
    return <Tag className={`rich-text-display ${className}`.trim()}>{empty}</Tag>
  }

  const safe = sanitizeRichText(html)

  return (
    <Tag
      className={`rich-text-display ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
