import { FaPlus, FaPalette, FaTrash } from 'react-icons/fa'

/**
 * Helpers + UI pieces for website-template colour schemes.
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

function SchemePreviewBar({ primary, secondary }) {
  return (
    <div className="h-2 w-full rounded-full overflow-hidden flex ring-1 ring-black/5">
      <span className="flex-[2]" style={{ backgroundColor: primary || '#0B1B3D' }} />
      <span className="flex-1" style={{ backgroundColor: secondary || '#C8102E' }} />
    </div>
  )
}

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
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3.5 bg-slate-50 border-b border-gray-100">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--brand)_12%,white)] text-[var(--brand-dark)] flex items-center justify-center shrink-0">
            <FaPalette className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[var(--brand-dark)]">Colour schemes</p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
              Primary / secondary pairs for this template. Requesters pick one, or enter a custom scheme.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={addScheme}
          disabled={list.length >= maxSchemes}
          className="wc-btn wc-btn--primary shrink-0 text-xs"
        >
          <FaPlus className="w-3 h-3" aria-hidden="true" />
          Add
        </button>
      </div>

      <div className="p-4">
        {list.length === 0 ? (
          <button
            type="button"
            onClick={addScheme}
            className="w-full rounded-xl border-2 border-dashed border-gray-200 bg-slate-50/60 hover:border-[color-mix(in_srgb,var(--brand)_35%,transparent)] transition px-4 py-8 text-center"
          >
            <FaPalette className="w-6 h-6 text-slate-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-bold text-gray-600">No colour schemes yet</p>
            <p className="text-[11px] text-gray-500 mt-1 max-w-xs mx-auto">
              Add at least one palette so requesters can choose colours that suit this template.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-[var(--brand-dark)]">
              <FaPlus className="w-3 h-3" aria-hidden="true" />
              Add first scheme
            </span>
          </button>
        ) : (
          <div className="space-y-3">
            {list.map((scheme, index) => (
              <div
                key={`scheme-${index}`}
                className="rounded-xl border border-gray-200 bg-slate-50/40 p-3.5 space-y-3"
              >
                <SchemePreviewBar primary={scheme.primary} secondary={scheme.secondary} />

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white border border-gray-200 text-[10px] font-extrabold text-gray-500 shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-gray-700 truncate">
                      {scheme.name?.trim() || `Scheme ${index + 1}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition shrink-0"
                    aria-label={`Remove scheme ${index + 1}`}
                  >
                    <FaTrash className="w-3 h-3" aria-hidden="true" />
                    Remove
                  </button>
                </div>

                <div>
                  <label className={fieldLabelClass}>Scheme name</label>
                  <input
                    type="text"
                    value={scheme.name}
                    onChange={(e) => updateAt(index, { name: e.target.value })}
                    placeholder="e.g. Classic Navy"
                    className="wc-field-input"
                    maxLength={100}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={fieldLabelClass}>Primary</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={/^#[0-9A-Fa-f]{6}$/.test(scheme.primary) ? scheme.primary : '#0B1B3D'}
                        onChange={(e) => updateAt(index, { primary: e.target.value })}
                        className="wc-field-color"
                        aria-label={`Primary colour for scheme ${index + 1}`}
                      />
                      <input
                        type="text"
                        value={scheme.primary}
                        onChange={(e) => updateAt(index, { primary: e.target.value })}
                        className="wc-field-input wc-field-input--mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Secondary</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={/^#[0-9A-Fa-f]{6}$/.test(scheme.secondary) ? scheme.secondary : '#C8102E'}
                        onChange={(e) => updateAt(index, { secondary: e.target.value })}
                        className="wc-field-color"
                        aria-label={`Secondary colour for scheme ${index + 1}`}
                      />
                      <input
                        type="text"
                        value={scheme.secondary}
                        onChange={(e) => updateAt(index, { secondary: e.target.value })}
                        className="wc-field-input wc-field-input--mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Request-form picker: choose a template scheme, or enter a custom primary/secondary.
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
                value={/^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#0B1B3D'}
                onChange={(e) => onPrimaryChange(e.target.value)}
                className="wc-field-color"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => onPrimaryChange(e.target.value)}
                className="wc-field-input wc-field-input--mono"
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
                value={/^#[0-9A-Fa-f]{6}$/.test(secondaryColor) ? secondaryColor : '#C8102E'}
                onChange={(e) => onSecondaryChange(e.target.value)}
                className="wc-field-color"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => onSecondaryChange(e.target.value)}
                className="wc-field-input wc-field-input--mono"
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
