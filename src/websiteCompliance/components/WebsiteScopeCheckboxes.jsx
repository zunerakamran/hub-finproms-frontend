import { userHasRole } from '../../utils/roleLabels'

export const WEBSITE_SCOPE_NETWORK = 'network'
export const WEBSITE_SCOPE_FIRM = 'firm'
export const WEBSITE_SCOPE_INDEPENDENT = 'independent'

export const WEBSITE_SCOPE_OPTIONS = [
  {
    key: WEBSITE_SCOPE_NETWORK,
    label: 'Network website',
    hint: 'Requested by Network Admin for the network',
  },
  {
    key: WEBSITE_SCOPE_FIRM,
    label: 'Firm website',
    hint: 'Requested by Firm Admin for their firm',
  },
  {
    key: WEBSITE_SCOPE_INDEPENDENT,
    label: 'Independent website',
    hint: 'Requested by an advisor (or other self-serve requester)',
  },
]

/**
 * Derive website scope from the current user (create-form preview).
 * Matches backend TemplateRequest::resolveScopeForRequester.
 */
export function resolveWebsiteScopeFromUser(user) {
  if (userHasRole(user, 'network_admin')) return WEBSITE_SCOPE_NETWORK
  if (userHasRole(user, 'firm_admin')) return WEBSITE_SCOPE_FIRM
  return WEBSITE_SCOPE_INDEPENDENT
}

export function websiteScopeFromRequest(request) {
  const raw = String(request?.website_scope || '').toLowerCase()
  if (raw === WEBSITE_SCOPE_NETWORK || raw === WEBSITE_SCOPE_FIRM || raw === WEBSITE_SCOPE_INDEPENDENT) {
    return raw
  }
  // Legacy fallback from requester roles when scope column missing.
  const requester = request?.requested_by || request?.requestedBy
  return resolveWebsiteScopeFromUser(requester)
}

export function websiteScopeLabel(scope) {
  const found = WEBSITE_SCOPE_OPTIONS.find((o) => o.key === scope)
  return found?.label || 'Independent website'
}

/**
 * Read-only Network / Firm / Independent checkboxes.
 * Exactly one is checked based on scope — never editable.
 */
export default function WebsiteScopeCheckboxes({
  scope = WEBSITE_SCOPE_INDEPENDENT,
  title = 'Website type',
  compact = false,
  className = '',
}) {
  const active = String(scope || WEBSITE_SCOPE_INDEPENDENT).toLowerCase()

  return (
    <fieldset
      className={`wc-website-scope ${compact ? 'wc-website-scope--compact' : ''} ${className}`.trim()}
      aria-label={title}
    >
      {!compact && (
        <legend className="wc-website-scope__legend">
          {title}
          <span className="wc-website-scope__locked">Read-only</span>
        </legend>
      )}
      {compact && (
        <div className="wc-website-scope__compact-label">
          <span>{title}</span>
          <span className="wc-website-scope__locked">Read-only</span>
        </div>
      )}
      <div className="wc-website-scope__options" role="group">
        {WEBSITE_SCOPE_OPTIONS.map((opt) => {
          const checked = active === opt.key
          return (
            <label
              key={opt.key}
              className={`wc-website-scope__option ${checked ? 'is-checked' : ''}`}
              title={opt.hint}
            >
              <input type="checkbox" checked={checked} disabled readOnly tabIndex={-1} />
              <span className="wc-website-scope__option-label">{opt.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
