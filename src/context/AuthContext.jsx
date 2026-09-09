import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setToken } from '../api/client'

const AuthContext = createContext(null)

const HUB_ADMIN_ROLES = ['finproms_admin', 'client_admin', 'manager', 'admin']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [powerCapabilities, setPowerCapabilities] = useState({})
  const [loading, setLoading] = useState(true)

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
          setPowerCapabilities({})
        }
      } else {
        setPowerCapabilities({})
      }
      return data.user
    } catch {
      setToken(null)
      setUser(null)
      setPowerCapabilities({})
      return null
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const login = async (payload) => {
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
  }

  const register = async (payload) => {
    const data = await api.register(payload)
    setToken(data.token)
    setUser(data.user)
    setPowerCapabilities({})
    return data.user
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch {
      // ignore
    }
    setToken(null)
    setUser(null)
    setPowerCapabilities({})
  }

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
    [user, loading, refreshUser, powerCapabilities, canPower]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
