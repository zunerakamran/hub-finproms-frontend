import { useEffect, useState } from 'react'
import { useHub } from '../context/HubContext'

const STORAGE_KEY = 'hub_cookie_notice_v'

/**
 * PECR-style notice for essential cookies only (no preference centre until
 * non-essential/marketing cookies exist).
 */
export default function CookieBanner() {
  const { hub } = useHub()
  const cookies = hub?.auth?.cookies
  const version = cookies?.version || 1
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY)
      if (String(seen) !== String(version)) {
        setVisible(true)
      }
    } catch {
      setVisible(true)
    }
  }, [version])

  if (!visible || !cookies) {
    return null
  }

  const onAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(version))
    } catch {
      //
    }
    setVisible(false)
  }

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie notice">
      <div className="cookie-banner__inner">
        <div
          className="cookie-banner__text"
          dangerouslySetInnerHTML={{ __html: cookies.content || '' }}
        />
        <button type="button" className="btn primary" onClick={onAccept}>
          OK
        </button>
      </div>
    </div>
  )
}
