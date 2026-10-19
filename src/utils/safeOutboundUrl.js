/**
 * Lightweight browser-side SSRF hints (no DNS). Matches backend SafeOutboundUrl
 * host blocks for loopback / private / link-local literals.
 */
export function isBlockedOutboundHost(hostname) {
  const host = String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')

  if (!host) return true
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true
  if (host === 'metadata.google.internal' || host === 'metadata') return true

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split('.').map((n) => Number(n))
    if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true
    const [a, b] = parts
    if (a === 10) return true
    if (a === 127) return true
    if (a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    return false
  }

  // IPv6 loopback / ULA / link-local
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
    return true
  }

  return false
}

/**
 * @returns {string|null} Error message if URL should not be used for server-side fetch.
 */
export function unsafePreviewUrlMessage(url) {
  const raw = String(url || '').trim()
  if (!raw) return null
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    return 'Preview URL must be a valid http(s) address.'
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return 'Preview URL must use http or https.'
  }
  if (isBlockedOutboundHost(parsed.hostname)) {
    return 'Preview URL cannot point at localhost or private network addresses.'
  }
  return null
}
