/** Mutually exclusive checklist flags (mirrors backend Hub::CHECKLIST_OPPOSITES). */
export const CHECKLIST_OPPOSITES = {
  public_subscribe: 'private_invite_only',
  private_invite_only: 'public_subscribe',
  paid_credits: 'unlimited_credits',
  unlimited_credits: 'paid_credits',
}

/** Public / private access: exactly one stays checked. */
const ACCESS_MODE_KEYS = new Set(['public_subscribe', 'private_invite_only'])

/**
 * Toggle a checklist flag; enabling one turns its opposite off.
 * Public and Private access always leave the other one checked.
 * @param {Record<string, boolean>} prev
 * @param {string} key
 * @param {boolean} enabled
 * @param {string|null} [exclusiveWith]
 * @param {boolean} [keepOneEnabled]
 */
export function toggleChecklistFlag(prev, key, enabled, exclusiveWith = null, keepOneEnabled = false) {
  const opposite = exclusiveWith || CHECKLIST_OPPOSITES[key] || null
  const next = { ...prev, [key]: enabled }
  if (opposite && (keepOneEnabled || ACCESS_MODE_KEYS.has(key))) {
    next[opposite] = !enabled
    return next
  }
  if (enabled && opposite) {
    next[opposite] = false
  }
  return next
}

export function checklistToMap(checklist) {
  const map = {}
  for (const item of checklist || []) {
    map[item.key] = Boolean(item.enabled)
  }
  return map
}
