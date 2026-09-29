/** Mutually exclusive checklist flags (mirrors backend Hub::CHECKLIST_OPPOSITES). */
export const CHECKLIST_OPPOSITES = {
  public_subscribe: 'private_invite_only',
  private_invite_only: 'public_subscribe',
  paid_credits: 'unlimited_credits',
  unlimited_credits: 'paid_credits',
}

/**
 * Toggle a checklist flag; enabling one turns its opposite off.
 * @param {Record<string, boolean>} prev
 * @param {string} key
 * @param {boolean} enabled
 * @param {string|null} [exclusiveWith]
 */
export function toggleChecklistFlag(prev, key, enabled, exclusiveWith = null) {
  const opposite = exclusiveWith || CHECKLIST_OPPOSITES[key] || null
  const next = { ...prev, [key]: enabled }
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
