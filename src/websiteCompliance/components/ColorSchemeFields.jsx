/**
 * Helpers + UI pieces for website-template colour schemes.
 *
 * Power Admin can attach named primary/secondary schemes to a showcase template.
 * Request forms let users pick one of those schemes, or enter a custom pair.
 */

export function emptyColorScheme(index = 0) {
  return {
    name: `Scheme ${index + 1}`,
    primary: '#0B1B3D',
    secondary: '#C8102E',
  }
}

export function normalizeColorSchemes(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((row) => row && typeof row === 'object')
    .map((row, index) => ({
      name: String(row.name || `Scheme ${index + 1}`).trim() || `Scheme ${index + 1}`,
      primary: String(row.primary || '#0B1B3D').trim() || '#0B1B3D',
      secondary: String(row.secondary || '#C8102E').trim() || '#C8102E',
    }))
}

export function templateColorSchemes(template) {
  return normalizeColorSchemes(template?.color_schemes)
}

const fieldLabelClass = 'block text-xs font-bold text-gray-700 mb-1.5'
const fieldInputClass =
  'w-full text-sm p-2.5 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] focus:border-[var(--brand)] transition'

/**
 * Power Admin editor: add / edit / remove colour schemes on a template.
 */
export function ColorSchemesEditor({ schemes, onChange, maxSchemes = 12 }) {
  const list = Array.isArray(schemes) ? schemes : []

  const updateAt = (index, patch) => {
    onChange(list.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const removeAt = (index) => {
    onChange(list.filter((_, i) => i !== index))
  }

  const addScheme = () => {
    if (list.length >= maxSchemes) return
    onChange([...list, emptyColorScheme(list.length)])
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-100 bg-slate-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Colour schemes</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Offer primary / secondary pairs that suit this template. Requesters can pick one, or enter a custom scheme.
          </p>
        </div>
        <button
          type="button"
          onClick={addScheme}
          disabled={list.length >= maxSchemes}
          className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[var(--brand-dark)] hover:bg-gray-50 disabled:opacity-50"
        >
          Add scheme
        </button>
      </div>

      {list.length === 0 ? (
        <p className="text-xs text-gray-500">No schemes yet. Add at least one so requesters can choose a palette.</p>
      ) : (
        <div className="space-y-3">
          {list.map((scheme, index) => (
            <div
              key={`scheme-${index}`}
              className="rounded-xl border border-gray-200 bg-white p-3 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-4 h-4 rounded-full border border-white shadow-sm ring-1 ring-gray-200 shrink-0"
                    style={{ backgroundColor: scheme.primary }}
                    title="Primary"
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-white shadow-sm ring-1 ring-gray-200 shrink-0"
                    style={{ backgroundColor: scheme.secondary }}
                    title="Secondary"
                  />
                  <span className="text-xs font-bold text-gray-600 truncate">
                    Scheme {index + 1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="text-[11px] font-semibold text-rose-600 hover:underline shrink-0"
                >
                  Remove
                </button>
              </div>

              <div>
                <label className={fieldLabelClass}>Name</label>
                <input
                  type="text"
                  value={scheme.name}
                  onChange={(e) => updateAt(index, { name: e.target.value })}
                  placeholder={`Scheme ${index + 1}`}
                  className={fieldInputClass}
                  maxLength={100}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={fieldLabelClass}>Primary</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={scheme.primary}
                      onChange={(e) => updateAt(index, { primary: e.target.value })}
                      className="w-10 h-10 p-0 border border-gray-200 rounded-xl cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={scheme.primary}
                      onChange={(e) => updateAt(index, { primary: e.target.value })}
                      className="min-w-0 flex-1 w-auto text-xs p-2.5 border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className={fieldLabelClass}>Secondary</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={scheme.secondary}
                      onChange={(e) => updateAt(index, { secondary: e.target.value })}
                      className="w-10 h-10 p-0 border border-gray-200 rounded-xl cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={scheme.secondary}
                      onChange={(e) => updateAt(index, { secondary: e.target.value })}
                      className="min-w-0 flex-1 w-auto text-xs p-2.5 border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Request-form picker: choose a template scheme, or enter a custom primary/secondary.
 *
 * selectionKey: "0" | "1" | ... for scheme index, or "custom"
 */
export function ColorSchemePicker({
  schemes,
  selectionKey,
  onSelectionChange,
  primaryColor,
  secondaryColor,
  onPrimaryChange,
  onSecondaryChange,
  labelClass = fieldLabelClass,
}) {
  const list = normalizeColorSchemes(schemes)
  const isCustom = selectionKey === 'custom' || list.length === 0

  return (
    <div className="space-y-3">
      {list.length > 0 && (
        <div>
          <label className={labelClass}>Colour scheme</label>
          <div className="space-y-2">
            {list.map((scheme, index) => {
              const key = String(index)
              const selected = selectionKey === key
              return (
                <label
                  key={`pick-${index}`}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition ${
                    selected
                      ? 'border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_8%,white)]'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="wc-color-scheme"
                    checked={selected}
                    onChange={() => {
                      onSelectionChange(key)
                      onPrimaryChange(scheme.primary)
                      onSecondaryChange(scheme.secondary)
                    }}
                    className="shrink-0"
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-white shadow-sm ring-1 ring-gray-200 shrink-0"
                    style={{ backgroundColor: scheme.primary }}
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-white shadow-sm ring-1 ring-gray-200 shrink-0"
                    style={{ backgroundColor: scheme.secondary }}
                  />
                  <span className="text-sm font-semibold text-[var(--brand-dark)] min-w-0 truncate">
                    {scheme.name}
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-gray-400 shrink-0 hidden sm:inline">
                    {scheme.primary} / {scheme.secondary}
                  </span>
                </label>
              )
            })}

            <label
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition ${
                isCustom
                  ? 'border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_8%,white)]'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="wc-color-scheme"
                checked={isCustom}
                onChange={() => onSelectionChange('custom')}
                className="shrink-0"
              />
              <span className="text-sm font-semibold text-[var(--brand-dark)]">
                Custom colour scheme
              </span>
              <span className="ml-auto text-[10px] text-gray-400 hidden sm:inline">
                Optional if none of the above fit
              </span>
            </label>
          </div>
        </div>
      )}

      {(isCustom || list.length === 0) && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Primary colour{list.length === 0 ? '' : ' (custom)'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => onPrimaryChange(e.target.value)}
                className="w-10 h-10 p-0 border border-gray-200 rounded-xl cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => onPrimaryChange(e.target.value)}
                className="min-w-0 flex-1 w-auto text-xs p-2.5 border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] outline-none"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>
              Secondary colour{list.length === 0 ? '' : ' (custom)'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => onSecondaryChange(e.target.value)}
                className="w-10 h-10 p-0 border border-gray-200 rounded-xl cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => onSecondaryChange(e.target.value)}
                className="min-w-0 flex-1 w-auto text-xs p-2.5 border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_30%,transparent)] outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {!isCustom && list.length > 0 && (
        <p className="text-[11px] text-gray-500">
          Using <span className="font-semibold text-gray-700">{list[Number(selectionKey)]?.name}</span>
          {' '}({primaryColor} / {secondaryColor}). Choose &ldquo;Custom colour scheme&rdquo; to enter your own.
        </p>
      )}
    </div>
  )
}
