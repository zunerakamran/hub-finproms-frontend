/**
 * Access Control list helpers — IP/CIDR/range + country/city conflict checks.
 */

export function parseListInput(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((s) => String(s).trim()).filter(Boolean))]
  }
  return [
    ...new Set(
      String(value || '')
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ]
}

export function normalizeCountry(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
}

export function normalizeCity(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
}

function ipv4ToInt(ip) {
  const parts = String(ip).split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null
    const octet = Number(part)
    if (octet < 0 || octet > 255) return null
    n = ((n << 8) + octet) >>> 0
  }
  return n
}

function intToIpv4(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

function isIpv4(ip) {
  return ipv4ToInt(ip) !== null
}

function isIpv6(ip) {
  // Prefer browser validation when available.
  if (typeof URL !== 'undefined') {
    try {
      // eslint-disable-next-line no-new
      new URL(`http://[${ip}]`)
      return ip.includes(':')
    } catch {
      /* fall through */
    }
  }
  return /^[0-9a-f:]+$/i.test(ip) && ip.includes(':')
}

/**
 * @returns {{ kind: 'ip'|'cidr'|'range', family: 4|6, start?: number, end?: number, raw: string } | null}
 */
export function parseIpEntry(raw) {
  const value = String(raw || '').trim()
  if (!value) return null

  if (value.includes('/')) {
    const [subnet, maskRaw] = value.split('/', 2)
    const mask = Number(maskRaw)
    if (!Number.isInteger(mask)) return null
    if (isIpv4(subnet)) {
      if (mask < 0 || mask > 32) return null
      const base = ipv4ToInt(subnet)
      if (base === null) return null
      const hostBits = 32 - mask
      const size = hostBits === 32 ? 0xffffffff : (2 ** hostBits - 1) >>> 0
      const start = (base & (~size >>> 0)) >>> 0
      const end = (start + size) >>> 0
      return { kind: 'cidr', family: 4, start, end, raw: value }
    }
    if (isIpv6(subnet)) {
      if (mask < 0 || mask > 128) return null
      return { kind: 'cidr', family: 6, raw: value.toLowerCase() }
    }
    return null
  }

  if (value.includes('-')) {
    const [left, right] = value.split('-', 2).map((s) => s.trim())
    if (!left || !right) return null
    if (isIpv4(left) && isIpv4(right)) {
      const start = ipv4ToInt(left)
      const end = ipv4ToInt(right)
      if (start === null || end === null || start > end) return null
      return { kind: 'range', family: 4, start, end, raw: `${intToIpv4(start)}-${intToIpv4(end)}` }
    }
    if (isIpv6(left) && isIpv6(right)) {
      if (left.toLowerCase() > right.toLowerCase()) return null
      return { kind: 'range', family: 6, raw: `${left}-${right}` }
    }
    return null
  }

  if (isIpv4(value)) {
    const n = ipv4ToInt(value)
    return { kind: 'ip', family: 4, start: n, end: n, raw: value }
  }
  if (isIpv6(value)) {
    return { kind: 'ip', family: 6, raw: value.toLowerCase() }
  }
  return null
}

export function isValidIpEntry(value) {
  return parseIpEntry(value) !== null
}

export function isValidCountryCode(value) {
  return /^[A-Za-z]{2}$/.test(String(value || '').trim())
}

export function isValidCityName(value) {
  const v = normalizeCity(value)
  return v.length >= 2 && v.length <= 120
}

function ipv4RangesOverlap(a, b) {
  return a.start <= b.end && b.start <= a.end
}

/**
 * True when two IP entries conflict (same address, overlapping CIDR, or overlapping range).
 */
export function ipEntriesConflict(a, b) {
  const left = parseIpEntry(a)
  const right = parseIpEntry(b)
  if (!left || !right) {
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase()
  }
  if (left.family !== right.family) return false

  if (left.family === 4 && left.start != null && right.start != null) {
    return ipv4RangesOverlap(left, right)
  }

  // IPv6: exact / same CIDR string / same range string (normalized).
  return left.raw === right.raw
}

export function findIpConflicts(listA, listB) {
  const a = parseListInput(listA)
  const b = parseListInput(listB)
  const conflicts = []
  for (const left of a) {
    for (const right of b) {
      if (ipEntriesConflict(left, right)) {
        conflicts.push({ a: left, b: right })
      }
    }
  }
  return conflicts
}

export function findExactConflicts(listA, listB, { normalize = (v) => String(v).trim().toLowerCase() } = {}) {
  const a = parseListInput(listA)
  const b = parseListInput(listB)
  const bMap = new Map(b.map((item) => [normalize(item), item]))
  const conflicts = []
  for (const left of a) {
    const key = normalize(left)
    if (bMap.has(key)) {
      conflicts.push({ a: left, b: bMap.get(key) })
    }
  }
  return conflicts
}

/**
 * Collect opposing-list conflicts for a full access-settings payload/state.
 * @returns {string[]} human-readable alert lines
 */
export function collectOpposingConflicts(settings) {
  const messages = []
  const restrictedIps = parseListInput(settings?.restricted_ips)
  const allowedIps = parseListInput(settings?.allowed_ips)
  const ipConflicts = findIpConflicts(restrictedIps, allowedIps)
  if (ipConflicts.length) {
    const sample = ipConflicts
      .slice(0, 3)
      .map((c) => `${c.a} ↔ ${c.b}`)
      .join('; ')
    messages.push(
      `IP conflict: the same address/range cannot be in both Restricted IPs and Allowed IPs (${sample}${ipConflicts.length > 3 ? '…' : ''}).`
    )
  }

  const restrictedCountries = parseListInput(settings?.restricted_countries).map(normalizeCountry)
  const allowedCountries = parseListInput(settings?.allowed_countries).map(normalizeCountry)
  const countryConflicts = findExactConflicts(restrictedCountries, allowedCountries, {
    normalize: normalizeCountry,
  })
  if (countryConflicts.length) {
    const sample = countryConflicts.map((c) => c.a).join(', ')
    messages.push(
      `Country conflict: ${sample} cannot be in both Restricted countries and Allowed countries.`
    )
  }

  // UK cities are an allowlist; opposing signal is restricting GB while cities are enabled.
  const ukCities = parseListInput(settings?.uk_cities).map(normalizeCity).filter(Boolean)
  if (settings?.uk_cities_enabled && ukCities.length && restrictedCountries.includes('GB')) {
    messages.push(
      'City / country conflict: Specific UK cities is on, but GB is in Restricted countries. Remove GB from Restricted countries, or turn off UK cities.'
    )
  }

  // Soft opposing pair: UK-only vs restricting GB
  if (settings?.uk_only && restrictedCountries.includes('GB')) {
    messages.push(
      'Country conflict: UK only is on, but GB is in Restricted countries. Remove GB from Restricted countries, or turn off UK only.'
    )
  }

  return messages
}

export function formatConflictAlert(messages) {
  if (!messages.length) return ''
  return `Cannot save — opposing rules overlap:\n\n• ${messages.join('\n• ')}\n\nRemove the overlapping entries from one side, then try again.`
}
