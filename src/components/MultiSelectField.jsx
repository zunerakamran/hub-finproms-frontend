import { useState } from 'react'

/**
 * Compact multi-select: pick from a dropdown, selected values show as chips with ×.
 * When `allowCreate` is true, users can type a new name and add it.
 *
 * @param {{
 *   options: Array<{ id?: string|number, name: string }|string>,
 *   value: string[],
 *   onChange: (next: string[]) => void,
 *   placeholder?: string,
 *   disabled?: boolean,
 *   emptyHint?: import('react').ReactNode,
 *   allowCreate?: boolean,
 *   createPlaceholder?: string,
 * }} props
 */
export default function MultiSelectField({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select to add…',
  disabled = false,
  emptyHint = null,
  allowCreate = false,
  createPlaceholder = 'Type a new name and press Enter…',
}) {
  const [draft, setDraft] = useState('')
  const selected = Array.isArray(value) ? value : []
  const normalizedOptions = options.map((opt) =>
    typeof opt === 'string' ? { id: opt, name: opt } : opt
  )
  const available = normalizedOptions.filter((opt) => !selected.includes(opt.name))

  const add = (name) => {
    const trimmed = String(name || '').trim()
    if (!trimmed || selected.includes(trimmed)) return
    onChange([...selected, trimmed])
  }

  const remove = (name) => {
    onChange(selected.filter((item) => item !== name))
  }

  const commitDraft = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    add(trimmed)
    setDraft('')
  }

  return (
    <div className="multi-select">
      {selected.length > 0 && (
        <ul className="multi-select__chips" aria-label="Selected">
          {selected.map((name) => (
            <li key={name} className="multi-select__chip">
              <span>{name}</span>
              <button
                type="button"
                className="multi-select__remove"
                aria-label={`Remove ${name}`}
                disabled={disabled}
                onClick={() => remove(name)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 ? (
        <select
          className="multi-select__dropdown"
          value=""
          disabled={disabled}
          onChange={(e) => {
            add(e.target.value)
            e.target.value = ''
          }}
          aria-label={placeholder}
        >
          <option value="">{placeholder}</option>
          {available.map((opt) => (
            <option key={opt.id ?? opt.name} value={opt.name}>
              {opt.name}
            </option>
          ))}
        </select>
      ) : null}

      {allowCreate ? (
        <div className="multi-select__create">
          <input
            type="text"
            value={draft}
            disabled={disabled}
            placeholder={createPlaceholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitDraft()
              }
            }}
          />
          <button
            type="button"
            className="btn ghost"
            disabled={disabled || !draft.trim()}
            onClick={commitDraft}
          >
            Add
          </button>
        </div>
      ) : null}

      {emptyHint && normalizedOptions.length === 0 && selected.length === 0 ? (
        <span className="field-hint">{emptyHint}</span>
      ) : null}
    </div>
  )
}
