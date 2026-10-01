import { useMemo, useRef } from 'react'
import ReactQuill, { Quill } from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { isRichTextEmpty, plainTextFromHtml } from '../utils/richText'

// Wider default size options (closer to Word / Google Docs style editors).
const Size = Quill.import('formats/size')
Size.whitelist = ['small', false, 'large', 'huge']
Quill.register(Size, true)

const FULL_TOOLBAR = [
  [{ header: [1, 2, 3, 4, false] }],
  [{ size: ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ align: [] }],
  ['blockquote', 'code-block'],
  ['link', 'image'],
  ['clean'],
]

const FULL_FORMATS = [
  'header',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'script',
  'list',
  'bullet',
  'indent',
  'align',
  'blockquote',
  'code-block',
  'link',
  'image',
]

/**
 * Shared rich-text editor used across the product (posts, compliance, terms, etc.).
 * Full Quill toolbar: headings, sizes, colors, lists, alignment, links, images.
 * Value is HTML string; empty Quill docs normalize to ''.
 */
export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = '',
  rows = 4,
  required = false,
  className = '',
  id,
  disabled = false,
}) {
  const quillRef = useRef(null)
  const minHeight = Math.max(120, Number(rows) * 24)

  const modules = useMemo(
    () => ({
      toolbar: {
        container: FULL_TOOLBAR,
        handlers: {
          image() {
            const url = window.prompt('Paste image URL')
            if (!url) return
            const editor = quillRef.current?.getEditor?.()
            if (!editor) return
            const range = editor.getSelection(true)
            editor.insertEmbed(range?.index ?? 0, 'image', url.trim(), 'user')
            editor.setSelection((range?.index ?? 0) + 1)
          },
        },
      },
      clipboard: {
        matchVisual: false,
      },
    }),
    []
  )

  const handleChange = (html) => {
    if (!onChange) return
    onChange(isRichTextEmpty(html) ? '' : html)
  }

  // Quill pickers (heading/size/color/align) open then instantly close when the
  // editor sits inside a <label>: label activation steals focus on mousedown.
  // preventDefault stops that without blocking Quill's own click handlers.
  const stopLabelActivation = (event) => {
    if (event.target?.closest?.('.ql-toolbar')) {
      event.preventDefault()
    }
  }

  return (
    <div
      className={`rich-text-editor rich-text-editor--full ${className}`.trim()}
      id={id}
      data-required={required || undefined}
      data-empty={isRichTextEmpty(value) ? 'true' : 'false'}
      onMouseDown={stopLabelActivation}
    >
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ''}
        onChange={handleChange}
        modules={modules}
        formats={FULL_FORMATS}
        placeholder={placeholder}
        readOnly={disabled}
        style={{ minHeight }}
      />
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden="true"
          className="rich-text-editor__required-proxy"
          value={isRichTextEmpty(value) ? '' : '1'}
          onChange={() => {}}
          required
        />
      ) : null}
    </div>
  )
}

export { isRichTextEmpty, plainTextFromHtml }
