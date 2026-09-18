import { NavLink } from 'react-router-dom'
import { useHub } from '../context/HubContext'

/**
 * Dashboard "Website" / "Back to website" link.
 * While controlling a white-label hub, open that hub's live site (frontend_url)
 * instead of the shared control-plane catalog.
 */
export default function WebsiteNavLink({ children, className }) {
  const { isActingOnWhiteLabel, actingHub } = useHub()
  const href = String(actingHub?.frontend_url || '').trim().replace(/\/$/, '')

  if (isActingOnWhiteLabel && href) {
    return (
      <a href={href} className={className} rel="noreferrer">
        {children}
      </a>
    )
  }

  return (
    <NavLink to="/" className={className}>
      {children}
    </NavLink>
  )
}
