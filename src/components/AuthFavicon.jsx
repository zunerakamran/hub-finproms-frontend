import { useHub } from '../context/HubContext'

/** Default app icon when the hub has no custom favicon. */
export const DEFAULT_FAVICON = '/vite.svg'

/**
 * Always renders a favicon on auth screens (shared + white-label).
 * Uses the hub favicon when set; otherwise the default icon.
 */
export default function AuthFavicon({ className = 'auth-favicon' }) {
  const { branding, hub } = useHub()
  const src = branding?.favicon_url || DEFAULT_FAVICON
  const alt = branding?.application_name || hub?.name || 'Hub Finproms'

  return <img src={src} alt={alt} className={className} width={48} height={48} />
}
