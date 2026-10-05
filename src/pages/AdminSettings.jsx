import { useEffect, useState } from 'react'
import { api } from '../api/client'
import FileDropzone from '../components/FileDropzone'
import { useHub } from '../context/HubContext'
import {
  DASHBOARD_NAV_DEFAULTS,
  DASHBOARD_NAV_SECTION_FIELDS,
  fillDashboardNavFromSettings,
} from '../utils/dashboardNav'
import { PAGE_CONTENT_FIELDS } from '../utils/pageContent'

function emptyPageContent() {
  const next = {}
  for (const section of Object.keys(PAGE_CONTENT_FIELDS)) {
    next[section] = {}
    for (const field of PAGE_CONTENT_FIELDS[section].fields) {
      next[section][field.key] = ''
    }
  }
  return next
}

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
  const [accentColor, setAccentColor] = useState('')
  const [pageContent, setPageContent] = useState(emptyPageContent)
  const [pageSection, setPageSection] = useState('home')
  const [dashboardNav, setDashboardNav] = useState(fillDashboardNavFromSettings)
  const [dashNavTab, setDashNavTab] = useState('sections')
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
    setAccentColor(settings?.color_scheme?.accent ?? '')
    const next = emptyPageContent()
    const incoming = settings?.page_content || {}
    for (const section of Object.keys(next)) {
      for (const key of Object.keys(next[section])) {
        next[section][key] = incoming?.[section]?.[key] ?? ''
      }
    }
    setPageContent(next)
    setDashboardNav(fillDashboardNavFromSettings(settings?.dashboard_nav))
  }

  const setPageField = (section, key, value) => {
    setPageContent((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: value,
      },
    }))
  }

  const setDashNavField = (bucket, key, value) => {
    setDashboardNav((prev) => ({
      ...prev,
      [bucket]: {
        ...(prev[bucket] || {}),
        [key]: value,
      },
    }))
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

  const onRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview('')
    setRemoveLogo(true)
  }

  const onRemoveWhiteLogo = () => {
    setWhiteLogoFile(null)
    setWhiteLogoPreview('')
    setRemoveWhiteLogo(true)
  }

  const onRemoveFavicon = () => {
    setFaviconFile(null)
    setFaviconPreview('')
    setRemoveFavicon(true)
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
      fd.append('color_scheme[accent]', accentColor.trim())
      fd.append('page_content', JSON.stringify(pageContent))
      fd.append('dashboard_nav', JSON.stringify(dashboardNav))
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
          errors['color_scheme.accent']?.[0] ||
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
            Branding for this hub — logo, colours, and editable Home / Posts / detail page copy
            apply across the public site.
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
            <FileDropzone
              id="settings-logo"
              label="Logo attachment"
              accept="image/*"
              hint="Upload a PNG, JPG, GIF, or WebP (max 5MB). Replaces the current logo."
              files={logoFile ? [logoFile] : []}
              onChange={(next) => {
                setLogoFile(next[0] || null)
                setRemoveLogo(false)
              }}
              disabled={saving}
            />

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
            <FileDropzone
              id="settings-white-logo"
              label="White logo attachment"
              accept="image/*"
              hint="Light / white version of the logo for dark UI surfaces (max 5MB). If unset, the normal logo is used everywhere."
              files={whiteLogoFile ? [whiteLogoFile] : []}
              onChange={(next) => {
                setWhiteLogoFile(next[0] || null)
                setRemoveWhiteLogo(false)
              }}
              disabled={saving}
            />

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
            <FileDropzone
              id="settings-favicon"
              label="Favicon attachment"
              accept=".ico,image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
              hint="Browser tab icon. Upload an ICO, PNG, JPG, GIF, WebP, or SVG (max 1MB)."
              files={faviconFile ? [faviconFile] : []}
              onChange={(next) => {
                setFaviconFile(next[0] || null)
                setRemoveFavicon(false)
              }}
              disabled={saving}
            />

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
            <FileDropzone
              id="settings-auth-bg"
              label="Background image"
              accept="image/*"
              hint="Full-screen image behind the sign-in and sign-up forms, shown with a brand colour gradient overlay (PNG, JPG, GIF, or WebP, max 8MB)."
              files={authBgFile ? [authBgFile] : []}
              onChange={(next) => {
                setAuthBgFile(next[0] || null)
                setRemoveAuthBg(false)
              }}
              disabled={saving}
            />

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
                Login, register, verify email, forgot password, and reset password screens
              </li>
            </ul>
          </div>

          <div className="settings-block">
            <h2>Colour scheme</h2>
            <p className="muted form-hint">
              Primary drives buttons and links. Secondary deepens sidebars and hover states. Accent
              (orange by default) colours website filters, text selection, and dashboard section
              labels. Changes apply immediately after save.
            </p>
            <div className="form-row three">
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
              <label>
                Accent colour
                <div className="color-field">
                  <input
                    type="color"
                    aria-label="Accent colour picker"
                    value={/^#[0-9A-Fa-f]{6}$/.test(accentColor) ? accentColor : '#c2410c'}
                    onChange={(e) => setAccentColor(e.target.value)}
                  />
                  <input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#c2410c"
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
                '--preview-accent': /^#[0-9A-Fa-f]{6}$/.test(accentColor) ? accentColor : '#c2410c',
              }}
            >
              <span className="brand-swatch brand-swatch--primary">Primary</span>
              <span className="brand-swatch brand-swatch--secondary">Secondary</span>
              <span className="brand-swatch brand-swatch--accent">Accent</span>
              <span className="brand-swatch brand-swatch--btn">Button</span>
            </div>
          </div>

          <div className="settings-block">
            <h2>NEW label</h2>
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

          <div className="settings-block">
            <h2>Page content</h2>
            <p className="muted form-hint">
              Edit headings, paragraphs, and button labels for the public Home page, Posts/Reels
              catalog (same page, different URL type), and post detail. Use *italic* and **bold**
              in headings/leads. Placeholders like {'{credits}'}, {'{date}'}, and {'{count}'} are
              filled automatically.
            </p>

            <div className="page-content-tabs" role="tablist" aria-label="Page content sections">
              {Object.entries(PAGE_CONTENT_FIELDS).map(([key, section]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={pageSection === key}
                  className={`page-content-tabs__btn${pageSection === key ? ' is-active' : ''}`}
                  onClick={() => setPageSection(key)}
                >
                  {section.label}
                </button>
              ))}
            </div>

            {PAGE_CONTENT_FIELDS[pageSection]?.hint ? (
              <p className="muted form-hint">{PAGE_CONTENT_FIELDS[pageSection].hint}</p>
            ) : null}

            <div className="page-content-fields">
              {(PAGE_CONTENT_FIELDS[pageSection]?.fields || []).map((field) => (
                <label key={`${pageSection}-${field.key}`}>
                  {field.label}
                  {field.multiline ? (
                    <textarea
                      rows={3}
                      value={pageContent?.[pageSection]?.[field.key] ?? ''}
                      onChange={(e) => setPageField(pageSection, field.key, e.target.value)}
                    />
                  ) : (
                    <input
                      value={pageContent?.[pageSection]?.[field.key] ?? ''}
                      onChange={(e) => setPageField(pageSection, field.key, e.target.value)}
                    />
                  )}
                  {field.hint ? <span className="muted form-hint">{field.hint}</span> : null}
                </label>
              ))}
            </div>
          </div>

          <div className="settings-block">
            <h2>Dashboard menu</h2>
            <p className="muted form-hint">
              Rename sidebar separators and menu items for this hub. Hub separator has separate
              labels for Central / Shared / White-labelled context.
            </p>

            <div className="page-content-tabs" role="tablist" aria-label="Dashboard menu sections">
              <button
                type="button"
                role="tab"
                aria-selected={dashNavTab === 'sections'}
                className={`page-content-tabs__btn${dashNavTab === 'sections' ? ' is-active' : ''}`}
                onClick={() => setDashNavTab('sections')}
              >
                Separators
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={dashNavTab === 'items'}
                className={`page-content-tabs__btn${dashNavTab === 'items' ? ' is-active' : ''}`}
                onClick={() => setDashNavTab('items')}
              >
                Menu items
              </button>
            </div>

            <div className="page-content-fields">
              {dashNavTab === 'sections'
                ? DASHBOARD_NAV_SECTION_FIELDS.map((field) => (
                    <label key={`section-${field.key}`}>
                      {field.label}
                      <input
                        value={dashboardNav?.sections?.[field.key] ?? ''}
                        onChange={(e) => setDashNavField('sections', field.key, e.target.value)}
                        placeholder={DASHBOARD_NAV_DEFAULTS.sections[field.key] || ''}
                      />
                    </label>
                  ))
                : Object.entries(DASHBOARD_NAV_DEFAULTS.items).map(([path, defaultLabel]) => (
                    <label key={`item-${path}`}>
                      {defaultLabel}
                      <span className="muted form-hint">{path}</span>
                      <input
                        value={dashboardNav?.items?.[path] ?? ''}
                        onChange={(e) => setDashNavField('items', path, e.target.value)}
                        placeholder={defaultLabel}
                      />
                    </label>
                  ))}
            </div>
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
