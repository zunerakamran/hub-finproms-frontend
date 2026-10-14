import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  isAllowlistedExternalPath,
  noteAllowlistedDocumentEntry,
} from '../security/navigationContinuity'

/**
 * Marks allowlisted document entry as soon as the router lands on an allowlisted
 * path (home, login, verify-email, Stripe return, etc.).
 */
export default function NavigationSecurityBootstrap() {
  const location = useLocation()

  useEffect(() => {
    if (isAllowlistedExternalPath(location.pathname)) {
      noteAllowlistedDocumentEntry()
    }
  }, [location.pathname])

  return null
}
