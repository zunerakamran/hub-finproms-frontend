/**
 * Compact multi-select: pick from a dropdown, selected values show as chips with ×.
 *
 * @param {{
 *   options: Array<{ id?: string|number, name: string }|string>,
 *   value: string[],
 *   onChange: (next: string[]) => void,
 *   placeholder?: string,
 *   disabled?: boolean,
 *   emptyHint?: import('react').ReactNode,
 * }} props
 */
export default function MultiSelectField({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select to add…',
  disabled = false,
  emptyHint = null,
}) {
  const selected = Array.isArray(value) ? value : []
  const normalizedOptions = options.map((opt) =>
    typeof opt === 'string' ? { id: opt, name: opt } : opt
  )
  const available = normalizedOptions.filter((opt) => !selected.includes(opt.name))

  const add = (name) => {
    if (!name || selected.includes(name)) return
    onChange([...selected, name])
  }

  const remove = (name) => {
    onChange(selected.filter((item) => item !== name))
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

      <select
        className="multi-select__dropdown"
        value=""
        disabled={disabled || available.length === 0}
        onChange={(e) => {
          add(e.target.value)
          e.target.value = ''
        }}
        aria-label={placeholder}
      >
        <option value="">
          {available.length === 0
            ? selected.length > 0
              ? 'All options selected'
              : placeholder
            : placeholder}
        </option>
        {available.map((opt) => (
          <option key={opt.id ?? opt.name} value={opt.name}>
            {opt.name}
          </option>
        ))}
      </select>

      {emptyHint && normalizedOptions.length === 0 ? (
        <span className="field-hint">{emptyHint}</span>
      ) : null}
    </div>
  )
}
