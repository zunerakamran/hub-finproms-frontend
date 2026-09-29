import { useMemo } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { isRichTextEmpty, plainTextFromHtml } from '../utils/richText'

const DEFAULT_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
}

const DEFAULT_FORMATS = ['bold', 'italic', 'underline', 'list', 'bullet', 'link']

/**
 * Shared rich-text editor (bold, italic, lists, hyperlink).
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
  const modules = useMemo(() => DEFAULT_MODULES, [])
  const minHeight = Math.max(80, Number(rows) * 24)

  const handleChange = (html) => {
    if (!onChange) return
    onChange(isRichTextEmpty(html) ? '' : html)
  }

  return (
    <div
      className={`rich-text-editor ${className}`.trim()}
      id={id}
      data-required={required || undefined}
      data-empty={isRichTextEmpty(value) ? 'true' : 'false'}
    >
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={handleChange}
        modules={modules}
        formats={DEFAULT_FORMATS}
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
