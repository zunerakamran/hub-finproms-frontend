import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setToken } from '../api/client'

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
    Boolean(a.is_discontinued) === Boolean(b.is_discontinued)
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

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.me()
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
      // Do not treat 403 (forbidden/capability) as logout — that remounts the app.
      if (err?.status === 401) {
        setToken(null)
        setUser(null)
        setPowerCapabilities({})
      }
      return null
    }
  }, [setUser, setPowerCapabilities])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const login = useCallback(async (payload) => {
    const data = await api.login(payload)
    setToken(data.token)
    setUser(data.user)
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
  }, [setUser, setPowerCapabilities])

  const register = useCallback(async (payload) => {
    const data = await api.register(payload)
    setToken(data.token)
    setUser(data.user)
    setPowerCapabilities({})
    return data.user
  }, [setUser, setPowerCapabilities])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // ignore
    }
    setToken(null)
    setUser(null)
    setPowerCapabilities({})
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
      register,
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
      isPowerAdmin: user?.role === 'power_admin',
      isAdmin: HUB_ADMIN_ROLES.includes(user?.role),
      isAuthenticated: Boolean(user),
    }),
    [user, loading, login, register, logout, refreshUser, powerCapabilities, setUser, setPowerCapabilities, canPower]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
