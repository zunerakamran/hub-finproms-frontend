import { brandLogoUrl } from '../utils/brandLogo'

/**
 * Shown when Access Control / firewall blocks the session (403).
 * Hub logo + loader — no detailed deny reason for the blocked visitor.
 */
export default function AccessBlockedSplash({ branding = null }) {
  const logoUrl = brandLogoUrl(branding, { onDark: false })
  const name = branding?.application_name || ''

  return (
    <div
      className="page-loader access-blocked-splash"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={name ? `${name} loading` : 'Loading'}
    >
      <div className="access-blocked-splash__inner">
        {logoUrl ? (
          <img
            className="access-blocked-splash__logo"
            src={logoUrl}
            alt={name || 'Hub'}
          />
        ) : name ? (
          <p className="access-blocked-splash__name">{name}</p>
        ) : null}
        <div className="page-loader__spinner" aria-hidden="true" />
      </div>
    </div>
  )
}
