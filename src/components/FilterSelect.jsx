import { useEffect, useId, useRef, useState } from 'react'

/**
 * Single-select filter dropdown with accent-coloured list hover/selected states.
 * Native <select> option panels cannot be recolored in most browsers.
 *
 * @param {{
 *   label: string,
 *   value: string,
 *   onChange: (next: string) => void,
 *   options: Array<{ value: string, label: string }>,
 *   'aria-label'?: string,
 * }} props
 */
export default function FilterSelect({
  label,
  value,
  onChange,
  options = [],
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listId = useId()
  const selected = options.find((opt) => opt.value === value) || options[0]
  const displayLabel = selected?.label || ''

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={`filter-select filter-select--custom${open ? ' is-open' : ''}`} ref={rootRef}>
      <span className="filter-select__label">{label}</span>
      <button
        type="button"
        className="filter-select__trigger"
        aria-label={ariaLabel || label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="filter-select__value">{displayLabel}</span>
        <span className="filter-select__chevron" aria-hidden="true" />
      </button>

      {open ? (
        <ul id={listId} className="filter-select__menu" role="listbox" aria-label={ariaLabel || label}>
          {options.map((opt) => {
            const isActive = opt.value === value
            return (
              <li key={`${opt.value || '__all'}::${opt.label}`} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`filter-select__option${isActive ? ' is-active' : ''}`}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  {opt.label}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
