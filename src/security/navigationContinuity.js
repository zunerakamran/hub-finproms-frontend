/**
 * NFR-SEC-NAV — in-app navigation continuity vs external entry (email / chat /
 * paste / redirect from another app).
 *
 * Continuity lives in sessionStorage (survives F5 in the same tab; cleared when
 * the tab closes). In-memory flags track what happened during this document so
 * address-bar paste cannot reuse a prior tab's sessionStorage continuity, while
 * login / allowlisted landing still lets the user continue inside the SPA.
 */

const CONTINUITY_KEY = 'hub_nav_continuity'

/** Set only in the current JS lifetime (reset on full page load / paste). */
let continuityGrantedThisDocument = false

/** User first landed on an allowlisted path this document (home / login / etc.). */
let allowlistedEntryThisDocument = false

/**
 * Paths that MUST remain reachable from email / payment providers / auth.
 * Home (`/`) is handled separately (always allowed — browser tab search /
 * address-bar autocomplete of the site URL must work while logged in).
 */
const ALLOWLIST_EXACT = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/client-admin/login',
  '/power-admin/login',
])

const ALLOWLIST_PREFIXES = [
  '/subscriptions/success',
  '/subscriptions/bank-transfer',
  '/purchases/success',
  '/my-dashboard/payment-card/success',
  '/my-dashboard/advisor-billing/success',
]

export function normalizePathname(pathname) {
  if (!pathname || typeof pathname !== 'string') return '/'
  const bare = pathname.split('?')[0].split('#')[0] || '/'
  if (bare.length > 1 && bare.endsWith('/')) return bare.slice(0, -1)
  return bare
}

export function isAllowlistedExternalPath(pathname) {
  const path = normalizePathname(pathname)
  if (ALLOWLIST_EXACT.has(path)) return true
  return ALLOWLIST_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function hasNavigationContinuity() {
  try {
    return sessionStorage.getItem(CONTINUITY_KEY) === '1'
  } catch {
    return false
  }
}

export function markNavigationContinuity() {
  continuityGrantedThisDocument = true
  try {
    sessionStorage.setItem(CONTINUITY_KEY, '1')
  } catch {
    //
  }
}

/** Call when the SPA boots on (or navigates onto) an allowlisted path. */
export function noteAllowlistedDocumentEntry() {
  allowlistedEntryThisDocument = true
}

export function clearNavigationContinuity() {
  continuityGrantedThisDocument = false
  allowlistedEntryThisDocument = false
  try {
    sessionStorage.removeItem(CONTINUITY_KEY)
  } catch {
    //
  }
}

/**
 * True when this document was opened via a top-level navigation that did not
 * come from our own origin (email, chat, other app, paste, typed URL, external redirect).
 * Reload / back-forward in the same tab are treated as trusted document types.
 */
export function isUntrustedExternalDocumentEntry() {
  if (typeof window === 'undefined') return false

  let type = 'navigate'
  try {
    const nav = performance.getEntriesByType?.('navigation')?.[0]
    if (nav?.type) type = nav.type
  } catch {
    //
  }

  if (type === 'reload' || type === 'back_forward') {
    return false
  }

  const referrer = typeof document !== 'undefined' ? document.referrer || '' : ''
  if (!referrer) {
    // Paste, typed URL, tab/address-bar autocomplete, many email/chat clients.
    return true
  }

  try {
    return new URL(referrer).origin !== window.location.origin
  } catch {
    return true
  }
}

/**
 * True when the document referrer is present and from another origin
 * (webmail, chat web UI, third-party site). Empty referrer is NOT cross-origin —
 * that covers address-bar / tab search autocomplete as well as paste.
 */
export function hasCrossOriginReferrer() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  const referrer = document.referrer || ''
  if (!referrer) return false
  try {
    return new URL(referrer).origin !== window.location.origin
  } catch {
    return true
  }
}

/**
 * Whether a protected route should show the external-navigation error instead
 * of the target page. Callers must only apply this for authenticated users —
 * guests should be redirected to `/login` (see ProtectedRoute).
 */
export function shouldBlockExternalNavigation(pathname) {
  if (isAllowlistedExternalPath(pathname)) {
    noteAllowlistedDocumentEntry()
    return false
  }

  if (continuityGrantedThisDocument) {
    return false
  }

  if (isUntrustedExternalDocumentEntry()) {
    // First landed on login/home(guest)/etc. this document → further SPA clicks
    // are OK. Direct paste/email of a protected URL never sets allowlistedEntry.
    return !allowlistedEntryThisDocument
  }

  // Reload / back-forward: require sessionStorage continuity (set at login).
  return !hasNavigationContinuity()
}

/**
 * Home (`/`) is always allowed from outside (tab search autocomplete, address
 * bar, paste, email). Guests get the public landing; authenticated users enter
 * the app and establish continuity so further in-app navigation works.
 * Deep protected routes still use shouldBlockExternalNavigation.
 *
 * @returns {false} Always — kept for call-site clarity / backwards compat.
 */
export function shouldBlockExternalHomeEntry(isAuthenticated) {
  acceptHomeDocumentEntry(isAuthenticated)
  return false
}

/** Mark `/` as a trusted entry point for this document. */
export function acceptHomeDocumentEntry(isAuthenticated) {
  noteAllowlistedDocumentEntry()
  if (isAuthenticated) {
    markNavigationContinuity()
  }
}
