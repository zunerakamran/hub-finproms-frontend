import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from './AuthContext'

const HubContext = createContext(null)

export function HubProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [hub, setHub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshHub = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    if (authLoading) return
    setLoading(true)
    refreshHub()
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
        if (String(flag).startsWith('dashboard_') || String(flag).startsWith('member_') || flag === 'advisor_excel_import' || flag === 'advisor_discontinue') {
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

  const value = useMemo(
    () => ({
      hub,
      loading: loading || authLoading,
      error,
      refreshHub,
      can,
      advisorBillingEnabled,
      registrationEnabled,
      inviteOnly,
      checklist: hub?.checklist || {},
      branding: hub?.branding || {},
    }),
    [hub, loading, authLoading, error, refreshHub, can, advisorBillingEnabled, registrationEnabled, inviteOnly]
  )

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>
}

export function useHub() {
  const ctx = useContext(HubContext)
  if (!ctx) throw new Error('useHub must be used within HubProvider')
  return ctx
}
