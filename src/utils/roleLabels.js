/** Default role labels when hub.role_labels is not loaded yet. */
export const DEFAULT_ROLE_LABELS = {
  power_admin: 'Power Admin',
  finproms_admin: 'FinProms Admin',
  client_admin: 'Client Admin',
  manager: 'Manager',
  approver: 'Approver',
  advisor: 'Advisor',
  admin_staff: 'Admin-staff',
  user: 'User',
}

/**
 * Resolve a display label for a role key from hub.role_labels (or defaults).
 * @param {object|null|undefined} hub
 * @param {string} roleKey
 * @returns {string}
 */
export function roleLabel(hub, roleKey) {
  const key = String(roleKey || '')
  const fromHub = hub?.role_labels?.[key]
  if (fromHub) return String(fromHub)
  return DEFAULT_ROLE_LABELS[key] || key
}

/**
 * @param {object|null|undefined} hub
 * @returns {Record<string, string>}
 */
export function roleLabelsMap(hub) {
  return { ...DEFAULT_ROLE_LABELS, ...(hub?.role_labels || {}) }
}
