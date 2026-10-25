import { FaBuilding, FaCheck, FaLock, FaSitemap, FaUser } from 'react-icons/fa'
import { userHasRole } from '../../utils/roleLabels'

export const WEBSITE_SCOPE_NETWORK = 'network'
export const WEBSITE_SCOPE_FIRM = 'firm'
export const WEBSITE_SCOPE_INDEPENDENT = 'independent'

export const WEBSITE_SCOPE_OPTIONS = [
  {
    key: WEBSITE_SCOPE_NETWORK,
    label: 'Network website',
    shortLabel: 'Network',
    hint: 'Requested by Network Admin for the network',
    description: 'For the Central / Network organisation',
    Icon: FaSitemap,
  },
  {
    key: WEBSITE_SCOPE_FIRM,
    label: 'Firm website',
    shortLabel: 'Firm',
    hint: 'Requested by Firm Admin for their firm',
    description: 'For a member firm',
    Icon: FaBuilding,
  },
  {
    key: WEBSITE_SCOPE_INDEPENDENT,
    label: 'Independent website',
    shortLabel: 'Independent',
    hint: 'Requested by an advisor (or other self-serve requester)',
    description: 'Advisor or personal site',
    Icon: FaUser,
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

function normalizeScope(raw) {
  const value = String(raw || '').toLowerCase().trim()
  if (
    value === WEBSITE_SCOPE_NETWORK ||
    value === WEBSITE_SCOPE_FIRM ||
    value === WEBSITE_SCOPE_INDEPENDENT
  ) {
    return value
  }
  return null
}

/**
 * Resolve scope from a template request, change request, or nested payload.
 */
export function websiteScopeFromRequest(request) {
  if (!request) return WEBSITE_SCOPE_INDEPENDENT

  const direct =
    normalizeScope(request.website_scope) ||
    normalizeScope(request.websiteScope) ||
    normalizeScope(request.template_request?.website_scope) ||
    normalizeScope(request.templateRequest?.website_scope) ||
    normalizeScope(request.section?.template_request?.website_scope) ||
    normalizeScope(request.section?.templateRequest?.website_scope)

  if (direct) return direct

  const requester =
    request.requested_by ||
    request.requestedBy ||
    request.template_request?.requested_by ||
    request.templateRequest?.requestedBy ||
    request.template_request?.requestedBy ||
    request.section?.template_request?.requested_by ||
    request.section?.templateRequest?.requestedBy

  if (requester) return resolveWebsiteScopeFromUser(requester)

  return WEBSITE_SCOPE_INDEPENDENT
}

export function websiteScopeLabel(scope) {
  const found = WEBSITE_SCOPE_OPTIONS.find((o) => o.key === scope)
  return found?.label || 'Independent website'
}

/**
 * Read-only Network / Firm / Independent type cards.
 * Exactly one is active based on scope — never editable.
 */
export default function WebsiteScopeCheckboxes({
  scope = WEBSITE_SCOPE_INDEPENDENT,
  title = 'Website type',
  compact = false,
  className = '',
}) {
  const active = normalizeScope(scope) || WEBSITE_SCOPE_INDEPENDENT

  return (
    <fieldset
      className={`wc-website-scope ${compact ? 'wc-website-scope--compact' : ''} ${className}`.trim()}
      aria-label={title}
    >
      <legend className="wc-website-scope__legend">
        <span className="wc-website-scope__title">{title}</span>
        <span className="wc-website-scope__locked">
          <FaLock aria-hidden className="wc-website-scope__lock-icon" />
          Auto-set · read-only
        </span>
      </legend>

      <div className="wc-website-scope__options" role="group">
        {WEBSITE_SCOPE_OPTIONS.map((opt) => {
          const checked = active === opt.key
          const Icon = opt.Icon
          return (
            <div
              key={opt.key}
              className={`wc-website-scope__option wc-website-scope__option--${opt.key} ${
                checked ? 'is-checked' : 'is-idle'
              }`}
              title={opt.hint}
              aria-checked={checked}
              role="checkbox"
            >
              <span className="wc-website-scope__check" aria-hidden="true">
                {checked ? <FaCheck /> : null}
              </span>
              <span className="wc-website-scope__icon-wrap" aria-hidden="true">
                <Icon />
              </span>
              <span className="wc-website-scope__copy">
                <span className="wc-website-scope__option-label">
                  {compact ? opt.shortLabel : opt.label}
                </span>
                {!compact ? (
                  <span className="wc-website-scope__option-desc">{opt.description}</span>
                ) : null}
              </span>
              <input
                type="checkbox"
                checked={checked}
                disabled
                readOnly
                tabIndex={-1}
                aria-label={opt.label}
                className="wc-website-scope__native"
              />
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
