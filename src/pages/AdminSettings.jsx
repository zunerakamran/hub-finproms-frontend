import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'

export default function AdminSettings() {
  const { refreshHub, actingHubId } = useHub()
  const [newBannerDays, setNewBannerDays] = useState(7)
  const [applicationName, setApplicationName] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [removeLogo, setRemoveLogo] = useState(false)
  const [whiteLogoUrl, setWhiteLogoUrl] = useState('')
  const [whiteLogoFile, setWhiteLogoFile] = useState(null)
  const [whiteLogoPreview, setWhiteLogoPreview] = useState('')
  const [removeWhiteLogo, setRemoveWhiteLogo] = useState(false)
  const [faviconUrl, setFaviconUrl] = useState('')
  const [faviconFile, setFaviconFile] = useState(null)
  const [faviconPreview, setFaviconPreview] = useState('')
  const [removeFavicon, setRemoveFavicon] = useState(false)
  const [authBgUrl, setAuthBgUrl] = useState('')
  const [authBgFile, setAuthBgFile] = useState(null)
  const [authBgPreview, setAuthBgPreview] = useState('')
  const [removeAuthBg, setRemoveAuthBg] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('')
  const [secondaryColor, setSecondaryColor] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const applySettings = (settings) => {
    setNewBannerDays(settings?.new_banner_days ?? 7)
    setApplicationName(settings?.application_name ?? '')
    setFromEmail(settings?.from_email ?? '')
    setLogoUrl(settings?.logo_url ?? '')
    setLogoFile(null)
    setLogoPreview('')
    setRemoveLogo(false)
    setWhiteLogoUrl(settings?.white_logo_url ?? '')
    setWhiteLogoFile(null)
    setWhiteLogoPreview('')
    setRemoveWhiteLogo(false)
    setFaviconUrl(settings?.favicon_url ?? '')
    setFaviconFile(null)
    setFaviconPreview('')
    setRemoveFavicon(false)
    setAuthBgUrl(settings?.auth_bg_image_url ?? '')
    setAuthBgFile(null)
    setAuthBgPreview('')
    setRemoveAuthBg(false)
    setPrimaryColor(settings?.color_scheme?.primary ?? '')
    setSecondaryColor(settings?.color_scheme?.secondary ?? '')
  }

  const load = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const data = await api.adminSettings()
      applySettings(data.settings)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [actingHubId])

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview('')
      return undefined
    }
    const url = URL.createObjectURL(logoFile)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  useEffect(() => {
    if (!whiteLogoFile) {
      setWhiteLogoPreview('')
      return undefined
    }
    const url = URL.createObjectURL(whiteLogoFile)
    setWhiteLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [whiteLogoFile])

  useEffect(() => {
    if (!faviconFile) {
      setFaviconPreview('')
      return undefined
    }
    const url = URL.createObjectURL(faviconFile)
    setFaviconPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [faviconFile])

  useEffect(() => {
    if (!authBgFile) {
      setAuthBgPreview('')
      return undefined
    }
    const url = URL.createObjectURL(authBgFile)
    setAuthBgPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [authBgFile])

  const onLogoChange = (e) => {
    const file = e.target.files?.[0] || null
    setLogoFile(file)
    setRemoveLogo(false)
  }

  const onRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview('')
    setRemoveLogo(true)
  }

  const onWhiteLogoChange = (e) => {
    const file = e.target.files?.[0] || null
    setWhiteLogoFile(file)
    setRemoveWhiteLogo(false)
  }

  const onRemoveWhiteLogo = () => {
    setWhiteLogoFile(null)
    setWhiteLogoPreview('')
    setRemoveWhiteLogo(true)
  }

  const onFaviconChange = (e) => {
    const file = e.target.files?.[0] || null
    setFaviconFile(file)
    setRemoveFavicon(false)
  }

  const onRemoveFavicon = () => {
    setFaviconFile(null)
    setFaviconPreview('')
    setRemoveFavicon(true)
  }

  const onAuthBgChange = (e) => {
    const file = e.target.files?.[0] || null
    setAuthBgFile(file)
    setRemoveAuthBg(false)
  }

  const onRemoveAuthBg = () => {
    setAuthBgFile(null)
    setAuthBgPreview('')
    setRemoveAuthBg(true)
  }

  const displayedLogo = logoPreview || (!removeLogo ? logoUrl : '')
  const displayedWhiteLogo = whiteLogoPreview || (!removeWhiteLogo ? whiteLogoUrl : '')
  const displayedFavicon = faviconPreview || (!removeFavicon ? faviconUrl : '')
  const displayedAuthBg = authBgPreview || (!removeAuthBg ? authBgUrl : '')

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('new_banner_days', String(Number(newBannerDays)))
      fd.append('application_name', applicationName.trim())
      fd.append('from_email', fromEmail.trim())
      fd.append('color_scheme[primary]', primaryColor.trim())
      fd.append('color_scheme[secondary]', secondaryColor.trim())
      if (logoFile) {
        fd.append('logo', logoFile)
      }
      if (removeLogo && !logoFile) {
        fd.append('remove_logo', '1')
      }
      if (whiteLogoFile) {
        fd.append('white_logo', whiteLogoFile)
      }
      if (removeWhiteLogo && !whiteLogoFile) {
        fd.append('remove_white_logo', '1')
      }
      if (faviconFile) {
        fd.append('favicon', faviconFile)
      }
      if (removeFavicon && !faviconFile) {
        fd.append('remove_favicon', '1')
      }
      if (authBgFile) {
        fd.append('auth_bg_image', authBgFile)
      }
      if (removeAuthBg && !authBgFile) {
        fd.append('remove_auth_bg_image', '1')
      }

      const data = await api.updateSettings(fd)
      applySettings(data.settings)
      await refreshHub({ silent: true })
      setMessage(data.message || 'Settings saved.')
    } catch (err) {
      const errors = err.data?.errors || {}
      setError(
        errors.application_name?.[0] ||
          errors.from_email?.[0] ||
          errors.logo?.[0] ||
          errors.white_logo?.[0] ||
          errors.favicon?.[0] ||
          errors.auth_bg_image?.[0] ||
          errors['color_scheme.primary']?.[0] ||
          errors['color_scheme.secondary']?.[0] ||
          errors.new_banner_days?.[0] ||
          err.message
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Settings</h1>
          <p className="muted">
            Branding for this hub — logo, white logo, favicon, auth background, name, and primary /
            secondary colours apply across the whole product UI.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="dash-panel dash-panel--loading" role="status" aria-live="polite" aria-label="Loading settings">
          <div className="page-loader__spinner" />
        </div>
      ) : (
        <form className="admin-form settings-form" onSubmit={onSubmit}>
          {error && <div className="alert">{error}</div>}
          {message && <div className="alert success">{message}</div>}

          <div className="settings-block">
            <h2>Identity</h2>
            <label>
              Application name
              <input
                required
                value={applicationName}
                onChange={(e) => setApplicationName(e.target.value)}
                placeholder="Hub display name"
              />
            </label>
            <p className="muted form-hint">Shown in the header and dashboard as this hub’s product name.</p>

            <label>
              From email
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="info@yoursite.com"
              />
            </label>
            <p className="muted form-hint">
              Sender and support address used on transactional emails (order confirmations, etc.).
            </p>
          </div>

          <div className="settings-block">
            <h2>Logo</h2>
            <label>
              Logo attachment
              <input
                type="file"
                accept="image/*"
                onChange={onLogoChange}
              />
            </label>
            <p className="muted form-hint">Upload a PNG, JPG, GIF, or WebP (max 5MB). Replaces the current logo.</p>

            {displayedLogo ? (
              <div className="settings-logo-preview">
                <img src={displayedLogo} alt="Logo preview" />
                <button type="button" className="btn ghost" onClick={onRemoveLogo}>
                  Remove logo
                </button>
              </div>
            ) : (
              <p className="muted">No logo set.</p>
            )}

            <ul className="settings-logo-usage" aria-label="When the normal logo is used">
              <li>
                <span className="settings-logo-usage__check" aria-hidden="true">✓</span>
                Light backgrounds (website header, emails)
              </li>
            </ul>
          </div>

          <div className="settings-block">
            <h2>White logo</h2>
            <label>
              White logo attachment
              <input
                type="file"
                accept="image/*"
                onChange={onWhiteLogoChange}
              />
            </label>
            <p className="muted form-hint">
              Light / white version of the logo for dark UI surfaces (max 5MB). If unset, the normal
              logo is used everywhere.
            </p>

            {displayedWhiteLogo ? (
              <div className="settings-logo-preview settings-logo-preview--dark">
                <img src={displayedWhiteLogo} alt="White logo preview" />
                <button type="button" className="btn ghost" onClick={onRemoveWhiteLogo}>
                  Remove white logo
                </button>
              </div>
            ) : (
              <p className="muted">No white logo set.</p>
            )}

            <ul className="settings-logo-usage" aria-label="When the white logo is used">
              <li>
                <span className="settings-logo-usage__check" aria-hidden="true">✓</span>
                Dark backgrounds (dashboard sidebar)
              </li>
            </ul>
          </div>

          <div className="settings-block">
            <h2>Favicon</h2>
            <label>
              Favicon attachment
              <input
                type="file"
                accept=".ico,image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                onChange={onFaviconChange}
              />
            </label>
            <p className="muted form-hint">
              Browser tab icon. Upload an ICO, PNG, JPG, GIF, WebP, or SVG (max 1MB).
            </p>

            {displayedFavicon ? (
              <div className="settings-logo-preview settings-favicon-preview">
                <img src={displayedFavicon} alt="Favicon preview" />
                <button type="button" className="btn ghost" onClick={onRemoveFavicon}>
                  Remove favicon
                </button>
              </div>
            ) : (
              <p className="muted">No favicon set.</p>
            )}
          </div>

          <div className="settings-block">
            <h2>Login / register background</h2>
            <label>
              Background image
              <input type="file" accept="image/*" onChange={onAuthBgChange} />
            </label>
            <p className="muted form-hint">
              Full-screen image behind the sign-in and sign-up forms, shown with a brand colour
              gradient overlay (PNG, JPG, GIF, or WebP, max 8MB).
            </p>

            {displayedAuthBg ? (
              <div className="settings-logo-preview settings-auth-bg-preview">
                <img src={displayedAuthBg} alt="Auth background preview" />
                <button type="button" className="btn ghost" onClick={onRemoveAuthBg}>
                  Remove background
                </button>
              </div>
            ) : (
              <p className="muted">No background image set — auth pages use the default gradient.</p>
            )}

            <ul className="settings-logo-usage" aria-label="Where the auth background is used">
              <li>
                <span className="settings-logo-usage__check" aria-hidden="true">
                  ✓
                </span>
                Login, register, forgot password, and reset password screens
              </li>
            </ul>
          </div>

          <div className="settings-block">
            <h2>Colour scheme</h2>
            <p className="muted form-hint">
              Primary drives buttons, links, and accents. Secondary deepens sidebars and hover
              states. Changes apply immediately after save.
            </p>
            <div className="form-row two">
              <label>
                Primary colour
                <div className="color-field">
                  <input
                    type="color"
                    aria-label="Primary colour picker"
                    value={/^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#0f5c45'}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                  <input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#0f5c45"
                  />
                </div>
              </label>
              <label>
                Secondary colour
                <div className="color-field">
                  <input
                    type="color"
                    aria-label="Secondary colour picker"
                    value={/^#[0-9A-Fa-f]{6}$/.test(secondaryColor) ? secondaryColor : '#0a3f30'}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                  />
                  <input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#0a3f30"
                  />
                </div>
              </label>
            </div>
            <div
              className="brand-swatch-preview"
              style={{
                '--preview-primary': /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#0f5c45',
                '--preview-secondary': /^#[0-9A-Fa-f]{6}$/.test(secondaryColor)
                  ? secondaryColor
                  : '#0a3f30',
              }}
            >
              <span className="brand-swatch brand-swatch--primary">Primary</span>
              <span className="brand-swatch brand-swatch--secondary">Secondary</span>
              <span className="brand-swatch brand-swatch--btn">Button</span>
            </div>
          </div>

          <div className="settings-block">
            <h2>Content</h2>
            <label>
              NEW label duration (days)
              <input
                type="number"
                min="0"
                max="365"
                required
                value={newBannerDays}
                onChange={(e) => setNewBannerDays(e.target.value)}
              />
            </label>
            <p className="muted form-hint">
              Posts and reels newer than this many days show a NEW label on the listing. Set to 0 to
              disable.
            </p>
          </div>

          <div className="actions sticky-actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
