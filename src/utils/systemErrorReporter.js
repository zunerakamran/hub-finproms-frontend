/**
 * Best-effort client error beacon → POST /system-errors.
 * Dedupes locally so the same crash does not flood the API.
 */

const recent = new Map()
const RECENT_TTL_MS = 15000
const MAX_STACK = 7500
let listenersAttached = false

function fingerprint(payload) {
  const msg = String(payload.message || '')
    .replace(/\d+/g, 'N')
    .slice(0, 200)
  const page = String(payload.page_url || '')
    .replace(/https?:\/\/[^/]+/i, '')
    .replace(/\/\d+/g, '/N')
    .slice(0, 120)
  return `${payload.name || ''}|${msg}|${page}`
}

function shouldSkip(key) {
  const now = Date.now()
  for (const [k, at] of recent.entries()) {
    if (now - at > RECENT_TTL_MS) recent.delete(k)
  }
  if (recent.has(key)) return true
  recent.set(key, now)
  return false
}

function serializeError(err) {
  if (!err) return { message: 'Unknown error' }
  if (typeof err === 'string') return { message: err }
  return {
    message: err.message || String(err),
    name: err.name || undefined,
    stack: typeof err.stack === 'string' ? err.stack.slice(0, MAX_STACK) : undefined,
  }
}

/**
 * Report a client-side error. Safe to call from anywhere; never throws.
 */
export async function reportSystemError(input = {}) {
  try {
    const base =
      typeof input === 'string' || input instanceof Error
        ? serializeError(input)
        : {
            message: input.message || 'Unknown error',
            name: input.name || input.exception_class,
            stack: input.stack || input.stack_trace,
            level: input.level,
            properties: input.properties,
          }

    const payload = {
      source: 'frontend',
      level: base.level || 'error',
      message: String(base.message || 'Unknown error').slice(0, 1000),
      exception_class: base.name ? String(base.name).slice(0, 255) : undefined,
      stack_trace: base.stack ? String(base.stack).slice(0, MAX_STACK) : undefined,
      page_url:
        typeof window !== 'undefined' ? String(window.location.href).slice(0, 500) : undefined,
      browser_info:
        typeof navigator !== 'undefined' ? String(navigator.userAgent || '').slice(0, 500) : undefined,
      properties: base.properties && typeof base.properties === 'object' ? base.properties : undefined,
    }

    const key = fingerprint(payload)
    if (shouldSkip(key)) return

    // Dynamic import avoids circular deps with api/client during bootstrap.
    const { api, hasAuthSession } = await import('../api/client')
    if (!hasAuthSession()) return
    await api.systemErrorsReport(payload)
  } catch {
    // Swallow — reporting must never break the app.
  }
}

/**
 * Install window.onerror + unhandledrejection listeners once.
 */
export function installSystemErrorListeners() {
  if (typeof window === 'undefined' || listenersAttached) return
  listenersAttached = true

  window.addEventListener('error', (event) => {
    const err = event.error || event.message
    reportSystemError({
      ...(typeof err === 'object' && err ? serializeError(err) : { message: String(err || 'Script error') }),
      properties: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'window.error',
      },
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    reportSystemError({
      ...serializeError(reason),
      properties: { type: 'unhandledrejection' },
    })
  })
}
