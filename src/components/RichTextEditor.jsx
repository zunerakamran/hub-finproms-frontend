import { lazy, Suspense } from 'react'
import { isRichTextEmpty, plainTextFromHtml } from '../utils/richText'

const RichTextEditorInner = lazy(() => import('./RichTextEditorInner'))

/**
 * Shared rich-text editor used across the product (posts, compliance, terms, etc.).
 * Quill is code-split and only downloaded when an editor mounts.
 */
export default function RichTextEditor(props) {
  const minHeight = Math.max(120, Number(props.rows || 4) * 24)

  return (
    <Suspense
      fallback={
        <textarea
          className={`rich-text-editor rich-text-editor--fallback ${props.className || ''}`.trim()}
          id={props.id}
          value={props.value || ''}
          placeholder={props.placeholder || 'Loading editor…'}
          disabled
          readOnly
          rows={props.rows || 4}
          style={{ minHeight, width: '100%' }}
        />
      }
    >
      <RichTextEditorInner {...props} />
    </Suspense>
  )
}

export { isRichTextEmpty, plainTextFromHtml }
