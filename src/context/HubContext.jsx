import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from './AuthContext'

const HubContext = createContext(null)

const HUB_ADMIN_ROLES = ['finproms_admin', 'client_admin', 'manager', 'admin']

function isDashboardCapabilityKey(key) {
  return (
    String(key).startsWith('dashboard_') ||
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
    JSON.stringify(a.effective_capabilities) === JSON.stringify(b.effective_capabilities) &&
    JSON.stringify(a.branding) === JSON.stringify(b.branding) &&
    JSON.stringify(a.auth) === JSON.stringify(b.auth)
  )
}

export function HubProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [hub, setHubState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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

  /** Advisor billing card settings — not a capabilities-matrix flag. */
  const advisorBillingEnabled = useMemo(() => {
    return Boolean(hub?.checklist?.advisor_subscriber_billing || hub?.checklist?.private_invite_only)
  }, [hub])

  // Prefer explicit auth payload from API; fall back to checklist exclusivity.
  const registrationEnabled = useMemo(() => {
    if (hub?.auth && typeof hub.auth.registration_enabled === 'boolean') {
      return hub.auth.registration_enabled
    }
    return Boolean(hub?.checklist?.public_subscribe) && !Boolean(hub?.checklist?.private_invite_only)
  }, [hub])

  const inviteOnly = useMemo(() => {
    if (hub?.auth && typeof hub.auth.invite_only === 'boolean') {
      return hub.auth.invite_only
    }
    return Boolean(hub?.checklist?.private_invite_only)
  }, [hub])

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

  const value = useMemo(
    () => ({
      hub,
      // Only block the tree on the first hub fetch — not background refreshes.
      loading: (loading && !hub) || authLoading,
      error,
      refreshHub,
      can,
      advisorBillingEnabled,
      registrationEnabled,
      inviteOnly,
      hasHubDashboardAccess,
      hasGeneralDashboardAccess,
      hasDashboardAccess,
      checklist: hub?.checklist || {},
      branding: hub?.branding || {},
    }),
    [
      hub,
      loading,
      authLoading,
      error,
      refreshHub,
      can,
      advisorBillingEnabled,
      registrationEnabled,
      inviteOnly,
      hasHubDashboardAccess,
      hasGeneralDashboardAccess,
      hasDashboardAccess,
    ]
  )

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>
}

export function useHub() {
  const ctx = useContext(HubContext)
  if (!ctx) throw new Error('useHub must be used within HubProvider')
  return ctx
}
