import { useEffect, useState } from 'react'
import { api } from '../api/client'
import FileDropzone from '../components/FileDropzone'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, setUser, refreshUser } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!user) return
    setName(user.name || '')
    setEmail(user.email || '')
    setTwoFactorEnabled(Boolean(user.two_factor_enabled))
    setRemoveAvatar(false)
    setAvatarFile(null)
    setCurrentPassword('')
  }, [user])

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview('')
      return undefined
    }
    const url = URL.createObjectURL(avatarFile)
    setAvatarPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])

  const displayedAvatar = removeAvatar
    ? ''
    : avatarPreview || user?.avatar_url || ''

  const emailChanged =
    email.trim().toLowerCase() !== String(user?.email || '').toLowerCase()
  const twoFactorChanged = twoFactorEnabled !== Boolean(user?.two_factor_enabled)
  const needsPassword = emailChanged || twoFactorChanged

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setFieldErrors({})
    setSaving(true)

    try {
      const form = new FormData()
      form.append('name', name.trim())
      form.append('email', email.trim())
      form.append('two_factor_enabled', twoFactorEnabled ? '1' : '0')
      if (needsPassword) {
        form.append('current_password', currentPassword)
      }
      if (avatarFile) {
        form.append('avatar', avatarFile)
      }
      if (removeAvatar) {
        form.append('remove_avatar', '1')
      }

      const data = await api.updateProfile(form)
      if (data.user) setUser(data.user)
      else await refreshUser()

      setAvatarFile(null)
      setRemoveAvatar(false)
      setCurrentPassword('')
      setMessage(data.message || 'Profile updated successfully.')
    } catch (err) {
      setError(err.message || 'Could not update profile.')
      setFieldErrors(err.data?.errors || {})
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="dash-panel dash-panel--loading" role="status" aria-live="polite">
        <div className="page-loader__spinner" />
      </div>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Update profile</h1>
          <p className="muted">
            Change your name, email, profile picture, and optional two-factor authentication
            (email one-time code on sign-in).
          </p>
        </div>
      </div>

      <form className="admin-form settings-form" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        <div className="settings-block">
          <h2>Profile picture</h2>
          <FileDropzone
            id="profile-avatar"
            label="Avatar"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hint="PNG, JPG, GIF, or WebP (max 2MB)."
            files={avatarFile ? [avatarFile] : []}
            onChange={(next) => {
              setAvatarFile(next[0] || null)
              setRemoveAvatar(false)
            }}
            disabled={saving}
          />
          {displayedAvatar ? (
            <div className="settings-logo-preview">
              <img
                src={displayedAvatar}
                alt="Avatar preview"
                style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: '50%' }}
              />
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setAvatarFile(null)
                  setRemoveAvatar(true)
                }}
              >
                Remove picture
              </button>
            </div>
          ) : (
            <p className="muted">No profile picture set.</p>
          )}
          {fieldErrors.avatar?.[0] && <p className="alert">{fieldErrors.avatar[0]}</p>}
        </div>

        <div className="settings-block">
          <h2>Details</h2>
          <label>
            Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
              disabled={saving}
            />
          </label>
          {fieldErrors.name?.[0] && <p className="alert">{fieldErrors.name[0]}</p>}

          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              disabled={saving}
            />
          </label>
          <p className="muted form-hint">
            Changing your email sends a verification link to the new address. You must verify it
            before the next sign-in.
          </p>
          {fieldErrors.email?.[0] && <p className="alert">{fieldErrors.email[0]}</p>}
        </div>

        <div className="settings-block">
          <h2>Two-factor authentication</h2>
          <label className="checkbox-row" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={twoFactorEnabled}
              onChange={(e) => setTwoFactorEnabled(e.target.checked)}
              disabled={saving}
              style={{ marginTop: '0.25rem' }}
            />
            <span>
              <strong>Require email code on sign-in</strong>
              <br />
              <span className="muted">
                When enabled, only your account will receive a 6-digit code by email after entering
                your password. Other users on this hub are unaffected.
              </span>
            </span>
          </label>
        </div>

        {needsPassword && (
          <div className="settings-block">
            <h2>Confirm password</h2>
            <label>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={saving}
              />
            </label>
            <p className="muted form-hint">
              Required when changing email or two-factor authentication.
            </p>
            {fieldErrors.current_password?.[0] && (
              <p className="alert">{fieldErrors.current_password[0]}</p>
            )}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </section>
  )
}
