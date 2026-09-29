import { useHub } from '../context/HubContext'

/**
 * Full-viewport auth shell. When hub branding includes auth_bg_image_url,
 * layers that image under a brand gradient with the form panel on top.
 */
export default function AuthScreen({ children, className = '' }) {
  const { branding } = useHub()
  const bgUrl = branding?.auth_bg_image_url || ''
  const hasBg = Boolean(bgUrl)

  return (
    <div
      className={`auth-screen${hasBg ? ' auth-screen--has-bg' : ''}${className ? ` ${className}` : ''}`}
      style={hasBg ? { '--auth-bg-image': `url("${bgUrl}")` } : undefined}
    >
      {children}
    </div>
  )
}
