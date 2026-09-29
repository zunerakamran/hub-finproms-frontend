import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from './AuthContext'
import { roleLabel as resolveRoleLabel, roleLabelsMap } from '../utils/roleLabels'
import {
  complianceStatusLabel as resolveComplianceStatusLabel,
  complianceStatusLabelsMap,
} from '../utils/complianceStatusLabels'

const HubContext = createContext(null)

const HUB_ADMIN_ROLES = ['finproms_admin', 'client_admin', 'manager', 'admin']

function isDashboardCapabilityKey(key) {
  return (
    String(key).startsWith('dashboard_') ||
    String(key).startsWith('smc_') ||
    String(key).startsWith('gc_') ||
    String(key).startsWith('wc_') ||
    key === 'advisor_excel_import' ||
    key === 'advisor_discontinue'
  )
}

const GENERAL_DASHBOARD_KEYS = [
  'general_show_subscription',
  'general_show_credits',
  'general_show_invoices',
  'general_show_purchases',
]

function sameHub(a, b) {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.id === b.id &&
    a.viewer_role === b.viewer_role &&
    JSON.stringify(a.checklist) === JSON.stringify(b.checklist) &&
    JSON.stringify(a.acting_checklist) === JSON.stringify(b.acting_checklist) &&
    JSON.stringify(a.effective_capabilities) === JSON.stringify(b.effective_capabilities) &&
    JSON.stringify(a.branding) === JSON.stringify(b.branding) &&
    JSON.stringify(a.auth) === JSON.stringify(b.auth) &&
    JSON.stringify(a.hub_switcher) === JSON.stringify(b.hub_switcher) &&
    JSON.stringify(a.acting_hub) === JSON.stringify(b.acting_hub) &&
    JSON.stringify(a.acting_advisor_switcher) === JSON.stringify(b.acting_advisor_switcher) &&
    a.effective_role === b.effective_role &&
    JSON.stringify(a.role_labels) === JSON.stringify(b.role_labels) &&
    JSON.stringify(a.compliance_status_labels) === JSON.stringify(b.compliance_status_labels)
  )
}

export function HubProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [hub, setHubState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actingHubSwitching, setActingHubSwitching] = useState(false)
  const hubRef = useRef(null)
  const lastIdentityRef = useRef(null)

  const setHub = useCallback((next) => {
    setHubState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      const stable = sameHub(prev, resolved) ? prev : resolved
      hubRef.current = stable
      return stable
    })
  }, [])

  const refreshHub = useCallback(async ({ silent = false } = {}) => {
    // Keep existing UI mounted during background refreshes.
    if (!silent && !hubRef.current) {
      setLoading(true)
    }
    try {
      const data = await api.currentHub()
      setHub(data.hub)
      setError('')
      return data.hub
    } catch (err) {
      setError(err.message || 'Failed to load hub')
      return null
    } finally {
      setLoading(false)
    }
  }, [setHub])

  useEffect(() => {
    if (authLoading) return

    const identity = `${user?.id ?? 'guest'}:${user?.role ?? ''}`
    // Skip duplicate fetches for the same signed-in identity (avoids remount flashes).
    if (lastIdentityRef.current === identity && hubRef.current) {
      return
    }
    lastIdentityRef.current = identity

    refreshHub({ silent: Boolean(hubRef.current) })
  }, [refreshHub, authLoading, user?.id, user?.role])

  // Apply hub branding (colour scheme from Settings) across the whole app.
  useEffect(() => {
    const root = document.documentElement
    const primary = hub?.branding?.primary_color || hub?.branding?.color_scheme?.primary
    const secondary = hub?.branding?.secondary_color || hub?.branding?.color_scheme?.secondary

    if (primary) {
      root.style.setProperty('--brand', primary)
      root.style.setProperty('--brand-soft', `color-mix(in srgb, ${primary} 14%, white)`)
      root.style.setProperty('--brand-softer', `color-mix(in srgb, ${primary} 7%, white)`)
      root.style.setProperty('--brand-tint', `color-mix(in srgb, ${primary} 18%, transparent)`)
      root.style.setProperty('--brand-glow', `color-mix(in srgb, ${primary} 22%, transparent)`)
    } else {
      root.style.removeProperty('--brand')
      root.style.removeProperty('--brand-soft')
      root.style.removeProperty('--brand-softer')
      root.style.removeProperty('--brand-tint')
      root.style.removeProperty('--brand-glow')
    }

    if (secondary) {
      root.style.setProperty('--brand-dark', secondary)
      root.style.setProperty('--sidebar-bg', `color-mix(in srgb, ${secondary} 82%, #0b1220)`)
      root.style.setProperty('--sidebar-bg-alt', `color-mix(in srgb, ${secondary} 70%, #111827)`)
    } else if (primary) {
      root.style.setProperty('--brand-dark', `color-mix(in srgb, ${primary} 72%, #0a0f0d)`)
      root.style.setProperty('--sidebar-bg', `color-mix(in srgb, ${primary} 55%, #0b1220)`)
      root.style.setProperty('--sidebar-bg-alt', `color-mix(in srgb, ${primary} 45%, #111827)`)
    } else {
      root.style.removeProperty('--brand-dark')
      root.style.removeProperty('--sidebar-bg')
      root.style.removeProperty('--sidebar-bg-alt')
    }

    const brandName = hub?.branding?.application_name || hub?.name
    if (brandName) {
      document.title = brandName
    }

    // Always apply a favicon (hub custom or default) so login/register tabs
    // never stay on a blank/missing icon.
    const faviconHref = hub?.branding?.favicon_url || '/vite.svg'
    const lower = String(faviconHref).split('?')[0].toLowerCase()
    let faviconType = 'image/png'
    if (lower.endsWith('.svg')) faviconType = 'image/svg+xml'
    else if (lower.endsWith('.ico')) faviconType = 'image/x-icon'
    else if (lower.endsWith('.gif')) faviconType = 'image/gif'
    else if (lower.endsWith('.webp')) faviconType = 'image/webp'
    else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) faviconType = 'image/jpeg'

    document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']").forEach((el) => el.remove())
    const link = document.createElement('link')
    link.setAttribute('rel', 'icon')
    link.setAttribute('type', faviconType)
    link.setAttribute('href', faviconHref)
    document.head.appendChild(link)
  }, [hub?.branding, hub?.name])

  const can = useCallback(
    (flag) => {
      // Authenticated viewers must use role-resolved caps — never the hub-wide
      // OR checklist (that would show tools unchecked for this role).
      if (hub?.effective_capabilities) {
        if (Object.prototype.hasOwnProperty.call(hub.effective_capabilities, flag)) {
          return Boolean(hub.effective_capabilities[flag])
        }
        // Unknown capability key while logged in → deny dashboard/member tools.
        if (
          String(flag).startsWith('dashboard_') ||
          String(flag).startsWith('member_') ||
          String(flag).startsWith('general_') ||
          String(flag).startsWith('smc_') ||
          String(flag).startsWith('gc_') ||
          String(flag).startsWith('wc_') ||
          String(flag).startsWith('module_') ||
          flag === 'advisor_excel_import' ||
          flag === 'advisor_discontinue'
        ) {
          return false
        }
      }
      return Boolean(hub?.checklist?.[flag])
    },
    [hub]
  )

  // Prefer explicit auth payload from API; fall back to checklist exclusivity.
  // While acting on a white-labelled hub, use that hub's checklist for mode flags.
  const actingChecklist = useMemo(() => {
    if (
      hub?.acting_checklist &&
      (hub?.hub_switcher?.is_acting_on_white_label || hub?.acting_hub?.is_white_label)
    ) {
      return hub.acting_checklist
    }
    return hub?.checklist || {}
  }, [hub])

  const registrationEnabled = useMemo(() => {
    if (
      !(hub?.hub_switcher?.is_acting_on_white_label || hub?.acting_hub?.is_white_label) &&
      hub?.auth &&
      typeof hub.auth.registration_enabled === 'boolean'
    ) {
      return hub.auth.registration_enabled
    }
    return Boolean(actingChecklist.public_subscribe) && !Boolean(actingChecklist.private_invite_only)
  }, [hub, actingChecklist])

  const inviteOnly = useMemo(() => {
    if (
      !(hub?.hub_switcher?.is_acting_on_white_label || hub?.acting_hub?.is_white_label) &&
      hub?.auth &&
      typeof hub.auth.invite_only === 'boolean'
    ) {
      return hub.auth.invite_only
    }
    return Boolean(actingChecklist.private_invite_only)
  }, [hub, actingChecklist])

  /** Advisor billing is on for this hub — not a capabilities-matrix flag. */
  const advisorBillingEnabled = useMemo(() => {
    return Boolean(
      actingChecklist.advisor_subscriber_billing || actingChecklist.private_invite_only
    )
  }, [actingChecklist])

  /**
   * Payment-card is the client-admin payer tool only on white-labelled hubs
   * (matches backend AdvisorPaymentCardController). Power / FinProms staff
   * complete import checkout against the client admin card — they do not
   * manage Payment card settings.
   */
  const canManagePaymentCard = useMemo(() => {
    if (!user || !advisorBillingEnabled) return false
    return user.role === 'client_admin' || user.role === 'admin'
  }, [user, advisorBillingEnabled])

  /** Staff always; remaining roles only when a dashboard capability is on. */
  const hasHubDashboardAccess = useMemo(() => {
    if (!user) return false
    if (HUB_ADMIN_ROLES.includes(user.role)) return true
    const caps = hub?.effective_capabilities
    if (!caps) return false
    return Object.entries(caps).some(
      ([key, enabled]) => Boolean(enabled) && isDashboardCapabilityKey(key)
    )
  }, [user, hub])

  /** Member personal dashboard (General options). */
  const hasGeneralDashboardAccess = useMemo(() => {
    if (!user) return false
    return GENERAL_DASHBOARD_KEYS.some((key) => can(key))
  }, [user, can])

  /** Any tool that belongs in the universal /my-dashboard shell. */
  const hasDashboardAccess = useMemo(() => {
    if (!user) return false
    if (user.role === 'power_admin') return true
    if (hasHubDashboardAccess || hasGeneralDashboardAccess) return true
    return false
  }, [user, hasHubDashboardAccess, hasGeneralDashboardAccess])

  const setActingHub = useCallback(
    async (hubId, { asPowerAdmin = false } = {}) => {
      setActingHubSwitching(true)
      try {
        const data = await api.setActingHub(hubId, { asPowerAdmin })
        await refreshHub({ silent: true })
        return data
      } finally {
        setActingHubSwitching(false)
      }
    },
    [refreshHub]
  )

  const value = useMemo(
    () => {
      const switcher = hub?.hub_switcher || null
      const actingHub = hub?.acting_hub || switcher?.acting_hub || null
      const isActingOnWhiteLabel = Boolean(
        switcher?.is_acting_on_white_label ?? actingHub?.is_white_label
      )
      const actingAdvisorSwitcher = hub?.acting_advisor_switcher || null
      const actingAdvisor = actingAdvisorSwitcher?.acting_advisor || null
      const isAdvisorUser = user?.role === 'advisor' || Boolean(user?.is_advisor)
      const effectiveAdvisorId = actingAdvisor?.id
        ? Number(actingAdvisor.id)
        : isAdvisorUser && user?.id
          ? Number(user.id)
          : null

      return {
        hub,
        // Only block the tree on the first hub fetch — not background refreshes.
        loading: (loading && !hub) || authLoading,
        error,
        refreshHub,
        can,
        roleLabels: roleLabelsMap(hub),
        roleLabel: (key) => resolveRoleLabel(hub, key),
        complianceStatusLabels: complianceStatusLabelsMap(hub),
        complianceStatusLabel: (status) => resolveComplianceStatusLabel(hub, status),
        advisorBillingEnabled,
        canManagePaymentCard,
        registrationEnabled,
        inviteOnly,
        hasHubDashboardAccess,
        hasGeneralDashboardAccess,
        hasDashboardAccess,
        checklist: hub?.checklist || {},
        branding: hub?.branding || {},
        hubSwitcher: switcher,
        actingHub,
        actingHubId: actingHub?.id ?? null,
        isActingOnWhiteLabel,
        actingHubSwitching,
        canControlWhiteLabelHubs: Boolean(
          switcher?.enabled || can('dashboard_control_white_label_hubs')
        ),
        setActingHub,
        actingAdvisorSwitcher,
        actingAdvisor,
        effectiveAdvisorId,
        isActingAsAdvisor: Boolean(actingAdvisor),
        effectiveRole:
          hub?.effective_role || actingAdvisorSwitcher?.effective_role || user?.role || null,
        setActingAdvisor: async (advisorId) => {
          const data = await api.setActingAdvisor(advisorId)
          await refreshHub({ silent: true })
          return data
        },
      }
    },
    [
      hub,
      loading,
      authLoading,
      error,
      refreshHub,
      can,
      advisorBillingEnabled,
      canManagePaymentCard,
      registrationEnabled,
      inviteOnly,
      hasHubDashboardAccess,
      hasGeneralDashboardAccess,
      hasDashboardAccess,
      user,
      actingHubSwitching,
      setActingHub,
    ]
  )

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>
}

export function useHub() {
  const ctx = useContext(HubContext)
  if (!ctx) throw new Error('useHub must be used within HubProvider')
  return ctx
}
