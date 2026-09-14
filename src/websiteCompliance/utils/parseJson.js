export function parseJson(str) {
  if (!str) return {}
  if (typeof str === 'object') return str
  try {
    return JSON.parse(str)
  } catch {
    return { heading: str }
  }
}
