import { Navigate } from 'react-router-dom'
import PageLoader from './PageLoader'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import Home from '../pages/Home'
import {
  acceptHomeDocumentEntry,
  markNavigationContinuity,
} from '../security/navigationContinuity'

/**
 * Public access: home is visible before login.
 * Private access: guests are sent to login; home is shown after sign-in.
 * Defaults follow hub type (shared public, white-label private) until the
 * Functionalities checkboxes say otherwise. A shared hub can be private.
 * Central Hub: when member_view_site_pages is on, home is public; when off,
 * guests → login and users → dashboard.
 * Roles without member_view_site_pages cannot open the website.
 *
 * Uses this deploy's auth payload, not the hub switcher's acting checklist.
 *
 * NFR-SEC-NAV: `/` is always reachable (tab search / address-bar autocomplete
 * of the site URL must work). Deep protected routes remain guarded.
 */
function deployHomeBeforeLogin(hub) {
  if (typeof hub?.auth?.home_before_login === 'boolean') {
    return hub.auth.home_before_login
  }
  if (typeof hub?.auth?.public_access === 'boolean') {
    return hub.auth.public_access
  }
  if (typeof hub?.auth?.registration_enabled === 'boolean') {
    return hub.auth.registration_enabled
  }
  return hub?.type === 'shared'
}

export default function HomeRoute() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { hub, canViewSitePages, loading: hubLoading } = useHub()

  if (authLoading || hubLoading) {
    return <PageLoader />
  }

  // Tab search / address-bar autocomplete of the site URL must not be blocked.
  acceptHomeDocumentEntry(isAuthenticated)

  const isCentral = hub?.type === 'central' || hub?.is_central
  const publicLanding = isCentral ? canViewSitePages : deployHomeBeforeLogin(hub)

  if (!canViewSitePages) {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }
    markNavigationContinuity()
    return <Navigate to="/my-dashboard" replace />
  }

  if (!publicLanding && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Home />
}
