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
      if (hub?.effective_capabilities && Object.prototype.hasOwnProperty.call(hub.effective_capabilities, flag)) {
        return Boolean(hub.effective_capabilities[flag])
      }
      return Boolean(hub?.checklist?.[flag])
    },
    [hub]
  )

  const value = useMemo(
    () => ({
      hub,
      loading: loading || authLoading,
      error,
      refreshHub,
      can,
      checklist: hub?.checklist || {},
      branding: hub?.branding || {},
    }),
    [hub, loading, authLoading, error, refreshHub, can]
  )

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>
}

export function useHub() {
  const ctx = useContext(HubContext)
  if (!ctx) throw new Error('useHub must be used within HubProvider')
  return ctx
}
