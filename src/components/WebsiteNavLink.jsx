import { NavLink } from 'react-router-dom'
import { useHub } from '../context/HubContext'

/**
 * Dashboard "Website" / "Back to website" link.
 * Always opens THIS deploy's public site (`/`). Never opens a selected Shared /
 * White-label frontend_url from the hub switcher — that cross-origin hop
 * broke login (flicker → blank screen). Hidden unless the user has
 * member_view_site_pages on this hub.
 */
export default function WebsiteNavLink({ children, className }) {
  const { canViewSitePages } = useHub()

  if (!canViewSitePages) {
    return null
  }

  return (
    <NavLink to="/" className={className}>
      {children}
    </NavLink>
  )
}
