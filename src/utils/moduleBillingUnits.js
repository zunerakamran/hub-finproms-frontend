/**
 * Catalogue billing units for modules + packages (one-time and ongoing).
 * Prefer API `billing_units` / `recurring_billing_units` when present.
 */

export const DEFAULT_BILLING_UNITS = [
  {
    value: 'per_network',
    label: 'Per network',
    description:
      'Invoice per the network / central firm (usually there is only one). Flat charge × 1.',
    requires_tier_slot: false,
  },
  {
    value: 'per_firm',
    label: 'Per firm',
    description: 'Invoice generated per firm on the hub (amount × firm count).',
    requires_tier_slot: false,
  },
  {
    value: 'per_user',
    label: 'Per user',
    description:
      'Invoice generated per user at a fixed catalogue rate (amount × active users with the module / package).',
    requires_tier_slot: false,
  },
  {
    value: 'per_user_slots',
    label: 'Per user (slots)',
    description:
      'User-count slots define the rate from the recurring tier table (create any slot number). Invoice uses that slot’s rate × billed users.',
    requires_tier_slot: true,
  },
  {
    value: 'per_website',
    label: 'Per website',
    description:
      'Per website template request (deployed wc_template_requests) — not the template showcase catalogue.',
    requires_tier_slot: false,
  },
]

export const DEFAULT_RECURRING_BILLING_UNITS = [
  {
    value: 'none',
    label: 'None',
    description: 'No ongoing / recurring charge for this module or package.',
    requires_tier_slot: false,
  },
  ...DEFAULT_BILLING_UNITS,
]

/** Map legacy API values onto the current dropdown options. */
export function normalizeBillingUnit(unit, { forRecurring = false } = {}) {
  const raw = String(unit || '')
  if (raw === 'one_time') return 'per_network'
  if (raw === 'per_adviser') return 'per_user_slots'
  if (!raw) return forRecurring ? 'none' : 'per_network'
  return raw
}

export function unitRequiresTierSlot(unit, options = DEFAULT_BILLING_UNITS) {
  const normalized = normalizeBillingUnit(unit)
  const match = (options || []).find((o) => o.value === normalized)
  if (match) return Boolean(match.requires_tier_slot)
  return normalized === 'per_user_slots' || normalized === 'per_adviser'
}

export function unitLabel(unit, options = DEFAULT_RECURRING_BILLING_UNITS) {
  const normalized = normalizeBillingUnit(unit, { forRecurring: true })
  const match = (options || []).find((o) => o.value === normalized)
  return match?.label || normalized || '—'
}

export function unitDescription(unit, options = DEFAULT_BILLING_UNITS) {
  const normalized = normalizeBillingUnit(unit)
  const match = (options || []).find((o) => o.value === normalized)
  return match?.description || ''
}
