import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setToken } from '../api/client'
import { authQueryKey, hubBootQueryKey, queryClient } from '../queryClient'

const AuthContext = createContext(null)

const HUB_ADMIN_ROLES = ['finproms_admin', 'client_admin', 'manager', 'admin']

function sameUser(a, b) {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.id === b.id &&
    a.role === b.role &&
    a.name === b.name &&
    a.email === b.email &&
    a.credits === b.credits &&
    Boolean(a.is_advisor) === Boolean(b.is_advisor) &&
    Boolean(a.has_unlimited_credits) === Boolean(b.has_unlimited_credits) &&
    Boolean(a.is_suspended) === Boolean(b.is_suspended) &&
    Boolean(a.is_discontinued) === Boolean(b.is_discontinued) &&
    Boolean(a.terms_accepted) === Boolean(b.terms_accepted) &&
    a.terms_accepted_version === b.terms_accepted_version &&
    Boolean(a.privacy_accepted) === Boolean(b.privacy_accepted) &&
    a.privacy_accepted_version === b.privacy_accepted_version &&
    a.billing_subject_id === b.billing_subject_id &&
    Boolean(a.two_factor_enabled) === Boolean(b.two_factor_enabled) &&
    a.avatar_url === b.avatar_url
  )
}

function sameCapabilities(a, b) {
  if (a === b) return true
  if (!a || !b) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every((key) => Boolean(a[key]) === Boolean(b[key]))
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null)
  const [powerCapabilities, setPowerCapabilitiesState] = useState({})
  const [loading, setLoading] = useState(true)

  const setUser = useCallback((next) => {
    setUserState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      return sameUser(prev, resolved) ? prev : resolved
    })
  }, [])

  const setPowerCapabilities = useCallback((next) => {
    setPowerCapabilitiesState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      return sameCapabilities(prev, resolved) ? prev : resolved || {}
    })
  }, [])

  const refreshUser = useCallback(async ({ force = false } = {}) => {
    try {
      if (force) {
        await queryClient.invalidateQueries({ queryKey: authQueryKey })
      }
      const data = await queryClient.fetchQuery({
        queryKey: authQueryKey,
        queryFn: () => api.me(),
        staleTime: 60_000,
      })
      setUser(data.user)
      if (data.power_admin_capabilities) {
        setPowerCapabilities(data.power_admin_capabilities)
      } else if (data.user?.role === 'power_admin') {
        try {
          const caps = await api.powerAdminCapabilitiesMe()
          setPowerCapabilities(caps.resolved || {})
        } catch {
          // Keep existing caps if the secondary call fails.
        }
      } else {
        setPowerCapabilities({})
      }
      return data.user
    } catch (err) {
      // Only clear the session when the token is actually invalid.
      // Do not treat 403 (forbidden/capability) as logout â€” that remounts the app.
      if (err?.status === 401) {
        setToken(null)
        setUser(null)
        setPowerCapabilities({})
        queryClient.removeQueries({ queryKey: authQueryKey })
      }
      return null
    }
  }, [setUser, setPowerCapabilities])

  useEffect(() => {
    // Cookie session may still be valid even without the soft sessionStorage flag.
    queryClient.prefetchQuery({
      queryKey: hubBootQueryKey,
      queryFn: () => api.currentHub(),
      staleTime: 60_000,
    })
    refreshUser()
      .then((user) => {
        if (user) setToken('1')
      })
      .finally(() => setLoading(false))
  }, [refreshUser])

  const clearHubCaches = useCallback(() => {
    // Drop guest / pre-login hub payloads so nav gets effective_capabilities after auth.
    queryClient.removeQueries({ queryKey: hubBootQueryKey })
    queryClient.removeQueries({ queryKey: ['hub', 'current'] })
  }, [])

  const login = useCallback(async (payload) => {
    const data = await api.login(payload)
    if (data?.otp_required) {
      return data
    }
    setToken('1')
    clearHubCaches()
    setUser(data.user)
    queryClient.setQueryData(authQueryKey, data)
    if (data.user?.role === 'power_admin') {
      try {
        const caps = await api.powerAdminCapabilitiesMe()
        setPowerCapabilities(caps.resolved || {})
      } catch {
        setPowerCapabilities({})
      }
    } else {
      setPowerCapabilities({})
    }
    return data
  }, [setUser, setPowerCapabilities, clearHubCaches])

  const verifyLoginOtp = useCallback(async (payload) => {
    const data = await api.verifyLoginOtp(payload)
    setToken('1')
    clearHubCaches()
    setUser(data.user)
    queryClient.setQueryData(authQueryKey, data)
    if (data.user?.role === 'power_admin') {
      try {
        const caps = await api.powerAdminCapabilitiesMe()
        setPowerCapabilities(caps.resolved || {})
      } catch {
        setPowerCapabilities({})
      }
    } else {
      setPowerCapabilities({})
    }
    return data.user
  }, [setUser, setPowerCapabilities, clearHubCaches])

  const register = useCallback(async (payload) => {
    const data = await api.register(payload)
    // Self-registration requires email verification â€” no session token yet.
    if (data?.user || data?.token || data?.auth_mode === 'cookie') {
      setToken('1')
      clearHubCaches()
      setUser(data.user)
      queryClient.setQueryData(authQueryKey, data)
      setPowerCapabilities({})
    }
    return data
  }, [setUser, setPowerCapabilities, clearHubCaches])

  const completeEmailVerification = useCallback(async (payload) => {
    const data = await api.verifyEmail(payload)
    setToken('1')
    clearHubCaches()
    setUser(data.user)
    queryClient.setQueryData(authQueryKey, data)
    setPowerCapabilities({})
    return data.user
  }, [setUser, setPowerCapabilities, clearHubCaches])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // ignore
    }
    setToken(null)
    setUser(null)
    setPowerCapabilities({})
    queryClient.clear()
  }, [setUser, setPowerCapabilities])

  const canPower = useCallback(
    (flag) => Boolean(powerCapabilities?.[flag]),
    [powerCapabilities]
  )

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      login,
      verifyLoginOtp,
      register,
      completeEmailVerification,
      logout,
      refreshUser,
      powerCapabilities,
      setPowerCapabilities,
      canPower,
      isFinpromsAdmin: user?.role === 'finproms_admin',
      isClientAdmin: HUB_ADMIN_ROLES.includes(user?.role),
      isWhiteLabelClientAdmin: user?.role === 'client_admin' || user?.role === 'admin',
      isManager: user?.role === 'manager',
      isApprover: user?.role === 'approver',
      isAdvisor: user?.role === 'advisor' || Boolean(user?.is_advisor),
      isAdminStaff: user?.role === 'admin_staff',
      isPowerAdmin: user?.role === 'power_admin',
      isAdmin: HUB_ADMIN_ROLES.includes(user?.role),
      isAuthenticated: Boolean(user),
    }),
    [user, loading, login, verifyLoginOtp, register, completeEmailVerification, logout, refreshUser, powerCapabilities, setUser, setPowerCapabilities, canPower]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
