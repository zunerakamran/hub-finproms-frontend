/**
 * Normalize list API payloads that may be a bare array or `{ data, meta }`.
 */
export function asList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

export function listMeta(payload) {
  if (payload?.meta && typeof payload.meta === 'object') return payload.meta
  if (Array.isArray(payload)) {
    return {
      current_page: 1,
      last_page: 1,
      per_page: payload.length,
      total: payload.length,
    }
  }
  return {
    current_page: 1,
    last_page: 1,
    per_page: 0,
    total: 0,
  }
}
