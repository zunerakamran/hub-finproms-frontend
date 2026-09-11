import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'

export default function AdminSettings() {
  const { refreshHub } = useHub()
  const [newBannerDays, setNewBannerDays] = useState(7)
  const [applicationName, setApplicationName] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [removeLogo, setRemoveLogo] = useState(false)
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
    setPrimaryColor(settings?.color_scheme?.primary ?? '')
    setSecondaryColor(settings?.color_scheme?.secondary ?? '')
  }

  const load = async () => {
    setLoading(true)
    setError('')
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
  }, [])

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview('')
      return undefined
    }
    const url = URL.createObjectURL(logoFile)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

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

  const displayedLogo = logoPreview || (!removeLogo ? logoUrl : '')

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
          <p className="eyebrow">Client Admin</p>
          <h1>Settings</h1>
          <p className="muted">
            Hub branding and options stored in the database (not hard-coded).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="state">Loading...</div>
      ) : (
        <form className="admin-form" onSubmit={onSubmit}>
          {error && <div className="alert">{error}</div>}
          {message && <div className="alert success">{message}</div>}

          <h2>Branding</h2>
          <label>
            Application name
            <input
              required
              value={applicationName}
              onChange={(e) => setApplicationName(e.target.value)}
              placeholder="Hub display name"
            />
          </label>
          <p className="muted">Shown in the header and dashboard as this hub’s product name.</p>

          <label>
            From email
            <input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="orders@yoursite.com"
            />
          </label>
          <p className="muted">
            Sender and support address used on transactional emails (order confirmations, etc.).
          </p>

          <label>
            Logo attachment
            <input
              type="file"
              accept="image/*"
              onChange={onLogoChange}
            />
          </label>
          <p className="muted">Upload a PNG, JPG, GIF, or WebP (max 5MB). Replaces the current logo.</p>

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
          <p className="muted">Colour scheme is applied across the hub UI (buttons, links, accents).</p>

          <h2>Content</h2>
          <label>
            NEW banner duration (days)
            <input
              type="number"
              min="0"
              max="365"
              required
              value={newBannerDays}
              onChange={(e) => setNewBannerDays(e.target.value)}
            />
          </label>
          <p className="muted">
            Posts and reels newer than this many days show a NEW banner on the listing. Set to 0 to
            disable.
          </p>

          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
