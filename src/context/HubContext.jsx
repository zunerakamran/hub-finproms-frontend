import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

const HubContext = createContext(null)

export function HubProvider({ children }) {
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
    refreshHub()
  }, [refreshHub])

  const can = useCallback(
    (flag) => Boolean(hub?.checklist?.[flag]),
    [hub]
  )

  const value = useMemo(
    () => ({
      hub,
      loading,
      error,
      refreshHub,
      can,
      checklist: hub?.checklist || {},
      branding: hub?.branding || {},
    }),
    [hub, loading, error, refreshHub, can]
  )

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>
}

export function useHub() {
  const ctx = useContext(HubContext)
  if (!ctx) throw new Error('useHub must be used within HubProvider')
  return ctx
}
