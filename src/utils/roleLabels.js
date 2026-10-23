/** Default role labels when hub.role_labels is not loaded yet. */
export const DEFAULT_ROLE_LABELS = {
  power_admin: 'Power Admin',
  finproms_admin: 'FinProms Admin',
  client_admin: 'Client Admin',
  network_admin: 'Network Admin',
  firm_admin: 'Firm Admin',
  top_management: 'Top Management',
  accounts_admin: 'Accounts Admin',
  auditor: 'Auditor',
  manager: 'Manager',
  approver: 'Approver',
  advisor: 'Advisor',
  admin_staff: 'Admin-staff',
  user: 'User',
}

/** Mutually exclusive Document Repository head roles (§3.4). */
export const FIRM_HEAD_ROLES = ['network_admin', 'firm_admin']

/**
 * When adding a head role, drop the other head role from the set.
 * @param {Iterable<string>} roles
 * @param {string} addedRole
 * @returns {string[]}
 */
export function withExclusiveFirmHeadRole(roles, addedRole) {
  const next = new Set(roles || [])
  if (addedRole === 'network_admin') {
    next.delete('firm_admin')
    next.add('network_admin')
  } else if (addedRole === 'firm_admin') {
    next.delete('network_admin')
    next.add('firm_admin')
  } else {
    next.add(String(addedRole || ''))
  }
  return Array.from(next).filter(Boolean)
}

/**
 * Resolve a display label for a role key from hub.role_labels (or defaults).
 * Custom / newly added roles come from hub.role_labels after the hub payload refresh.
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
  // Hub labels are authoritative (includes custom roles). Defaults fill gaps only.
  return { ...DEFAULT_ROLE_LABELS, ...(hub?.role_labels || {}) }
}

/**
 * Role keys held by a user (API roles[] or legacy single role).
 * All assigned roles are equal — there is no primary/secondary distinction.
 * @param {object|null|undefined} user
 * @returns {string[]}
 */
export function userRoleKeys(user) {
  if (Array.isArray(user?.roles) && user.roles.length > 0) {
    return user.roles.map((role) => String(role)).filter(Boolean)
  }
  const legacy = String(user?.role || '')
  return legacy ? [legacy] : []
}

/**
 * @param {object|null|undefined} user
 * @param {string} roleKey
 */
export function userHasRole(user, roleKey) {
  return userRoleKeys(user).includes(String(roleKey || ''))
}

/**
 * @param {object|null|undefined} user
 * @param {string[]} roleKeys
 */
export function userHasAnyRole(user, roleKeys) {
  const held = new Set(userRoleKeys(user))
  return (roleKeys || []).some((role) => held.has(String(role)))
}

/**
 * Display string for one or many roles (lists / grids).
 * Prefers API role_labels[]; falls back to hub labels / defaults.
 * All roles are shown equally (joined labels).
 * @param {object|null|undefined} user
 * @param {object|null|undefined} hub
 * @param {(key: string) => string} [labelFn]
 * @returns {string}
 */
export function formatUserRoles(user, hub, labelFn) {
  const keys = userRoleKeys(user)
  if (keys.length === 0) return '-'

  const apiLabels = Array.isArray(user?.role_labels) ? user.role_labels : null
  if (apiLabels && apiLabels.length === keys.length) {
    return apiLabels.filter(Boolean).join(', ') || '-'
  }

  const resolve = typeof labelFn === 'function'
    ? labelFn
    : (key) => roleLabel(hub, key)

  return keys.map((key) => resolve(key) || key).join(', ')
}
