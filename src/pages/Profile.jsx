import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../api/client'
import FileDropzone from '../components/FileDropzone'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, setUser, refreshUser } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const [mfaSetup, setMfaSetup] = useState(null)
  const [mfaQrDataUrl, setMfaQrDataUrl] = useState('')
  const [mfaConfirmCode, setMfaConfirmCode] = useState('')
  const [mfaConfirmPassword, setMfaConfirmPassword] = useState('')
  const [confirmingMfa, setConfirmingMfa] = useState(false)
  const [mfaSetupError, setMfaSetupError] = useState('')
  const [mfaSetupFieldErrors, setMfaSetupFieldErrors] = useState({})

  useEffect(() => {
    if (!user) return
    setName(user.name || '')
    setEmail(user.email || '')
    setTwoFactorEnabled(Boolean(user.two_factor_enabled))
    setMfaEnabled(Boolean(user.mfa_enabled) || Boolean(user.mfa_pending))
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

  useEffect(() => {
    let cancelled = false
    const uri = mfaSetup?.otpauth_uri
    if (!uri) {
      setMfaQrDataUrl('')
      return undefined
    }
    QRCode.toDataURL(uri, { width: 220, margin: 2 })
      .then((url) => {
        if (!cancelled) setMfaQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setMfaQrDataUrl('')
      })
    return () => {
      cancelled = true
    }
  }, [mfaSetup?.otpauth_uri])

  const displayedAvatar = removeAvatar
    ? ''
    : avatarPreview || user?.avatar_url || ''

  const emailChanged =
    email.trim().toLowerCase() !== String(user?.email || '').toLowerCase()
  const twoFactorChanged = twoFactorEnabled !== Boolean(user?.two_factor_enabled)
  const mfaWasOn = Boolean(user?.mfa_enabled) || Boolean(user?.mfa_pending)
  const mfaChanged = mfaEnabled !== mfaWasOn
  const needsPassword = emailChanged || twoFactorChanged || mfaChanged

  const applyMfaSetupPayload = (data) => {
    if (data?.mfa_setup) {
      setMfaSetup(data.mfa_setup)
      setMfaConfirmCode('')
      setMfaConfirmPassword(currentPassword || '')
      setMfaSetupError('')
      setMfaSetupFieldErrors({})
    }
  }

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
      form.append('mfa_enabled', mfaEnabled ? '1' : '0')
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

      if (data.mfa_confirmation_required && data.mfa_setup) {
        applyMfaSetupPayload(data)
      } else if (!mfaEnabled) {
        setMfaSetup(null)
      }
    } catch (err) {
      setError(err.message || 'Could not update profile.')
      setFieldErrors(err.data?.errors || {})
    } finally {
      setSaving(false)
    }
  }

  const onResumeMfaSetup = async () => {
    setMfaSetupError('')
    setMfaSetupFieldErrors({})
    if (!currentPassword && !mfaConfirmPassword) {
      setMfaSetupError('Enter your current password to show the authenticator setup.')
      return
    }
    setConfirmingMfa(true)
    try {
      const data = await api.mfaSetup({
        current_password: mfaConfirmPassword || currentPassword,
        regenerate: false,
      })
      if (data.user) setUser(data.user)
      applyMfaSetupPayload(data)
      setMessage(data.message || 'Scan the QR code, then confirm with a code from the app.')
    } catch (err) {
      setMfaSetupError(err.message || 'Could not load MFA setup.')
      setMfaSetupFieldErrors(err.data?.errors || {})
    } finally {
      setConfirmingMfa(false)
    }
  }

  const onConfirmMfa = async (e) => {
    e.preventDefault()
    setMfaSetupError('')
    setMfaSetupFieldErrors({})
    setConfirmingMfa(true)
    try {
      const data = await api.confirmMfa({
        code: mfaConfirmCode.trim(),
        current_password: mfaConfirmPassword || currentPassword,
      })
      if (data.user) setUser(data.user)
      else await refreshUser()
      setMfaSetup(null)
      setMfaConfirmCode('')
      setMfaConfirmPassword('')
      setMfaEnabled(true)
      setTwoFactorEnabled(false)
      setMessage(data.message || 'Authenticator MFA is now enabled.')
    } catch (err) {
      setMfaSetupError(err.message || 'Could not confirm MFA.')
      setMfaSetupFieldErrors(err.data?.errors || {})
    } finally {
      setConfirmingMfa(false)
    }
  }

  if (!user) {
    return (
      <div className="dash-panel dash-panel--loading" role="status" aria-live="polite">
        <div className="page-loader__spinner" />
      </div>
    )
  }

  const showPendingResume = Boolean(user.mfa_pending) && !mfaSetup

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Update profile</h1>
          <p className="muted">
            Change your name, email, profile picture, and optional two-factor authentication —
            email one-time code or Microsoft Authenticator (choose one).
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
          <p className="muted form-hint" style={{ marginBottom: '1rem' }}>
            Choose email OTP or Microsoft Authenticator. Only one method can be active.
          </p>

          <label className="checkbox-row" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={twoFactorEnabled}
              onChange={(e) => {
                const on = e.target.checked
                setTwoFactorEnabled(on)
                if (on) setMfaEnabled(false)
              }}
              disabled={saving || confirmingMfa}
              style={{ marginTop: '0.25rem' }}
            />
            <span>
              <strong>Require email code on sign-in (OTP)</strong>
              <br />
              <span className="muted">
                When enabled, you receive a 6-digit code by email after your password, before
                finishing login.
              </span>
            </span>
          </label>
          {fieldErrors.two_factor_enabled?.[0] && (
            <p className="alert">{fieldErrors.two_factor_enabled[0]}</p>
          )}

          <label
            className="checkbox-row"
            style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginTop: '1rem' }}
          >
            <input
              type="checkbox"
              checked={mfaEnabled}
              onChange={(e) => {
                const on = e.target.checked
                setMfaEnabled(on)
                if (on) setTwoFactorEnabled(false)
              }}
              disabled={saving || confirmingMfa}
              style={{ marginTop: '0.25rem' }}
            />
            <span>
              <strong>Require Microsoft Authenticator (MFA)</strong>
              <br />
              <span className="muted">
                When enabled, you enter a code from Microsoft Authenticator (or any TOTP app) at
                sign-in. Saving with this checked starts setup — scan the QR, then confirm.
              </span>
              {user.mfa_enabled && (
                <>
                  <br />
                  <span className="muted">Status: authenticator MFA is active.</span>
                </>
              )}
              {user.mfa_pending && !user.mfa_enabled && (
                <>
                  <br />
                  <span className="muted">Status: setup started — confirm a code to finish.</span>
                </>
              )}
            </span>
          </label>
          {fieldErrors.mfa_enabled?.[0] && <p className="alert">{fieldErrors.mfa_enabled[0]}</p>}
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
              Required when changing email, OTP, or MFA settings.
            </p>
            {fieldErrors.current_password?.[0] && (
              <p className="alert">{fieldErrors.current_password[0]}</p>
            )}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={saving || confirmingMfa}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      {showPendingResume && (
        <div className="settings-block" style={{ marginTop: '1.5rem' }}>
          <h2>Finish authenticator MFA setup</h2>
          <p className="muted">
            MFA setup was started but not confirmed. Enter your password to show the QR code again.
          </p>
          <label>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={mfaConfirmPassword}
              onChange={(e) => setMfaConfirmPassword(e.target.value)}
              disabled={confirmingMfa}
            />
          </label>
          {mfaSetupError && <div className="alert">{mfaSetupError}</div>}
          <div className="form-actions">
            <button
              type="button"
              className="btn primary"
              disabled={confirmingMfa || !mfaConfirmPassword}
              onClick={onResumeMfaSetup}
            >
              {confirmingMfa ? 'Loading…' : 'Show MFA setup'}
            </button>
          </div>
        </div>
      )}

      {mfaSetup && (
        <div className="settings-block" style={{ marginTop: '1.5rem' }}>
          <h2>Set up Microsoft Authenticator</h2>
          <p className="muted">
            Scan this QR code in Microsoft Authenticator (or Google Authenticator / any TOTP app),
            then enter the 6-digit code below to finish enabling MFA.
          </p>
          {mfaQrDataUrl ? (
            <div style={{ margin: '1rem 0' }}>
              <img src={mfaQrDataUrl} alt="MFA QR code" width={220} height={220} />
            </div>
          ) : (
            <p className="muted">Could not render QR — enter the secret manually in your app.</p>
          )}
          <p className="muted form-hint">
            Account: <strong>{mfaSetup.account || user.email}</strong>
            <br />
            Secret (manual entry): <code style={{ wordBreak: 'break-all' }}>{mfaSetup.secret}</code>
          </p>

          <form className="admin-form" onSubmit={onConfirmMfa}>
            {mfaSetupError && <div className="alert">{mfaSetupError}</div>}
            <label>
              Authenticator code
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={mfaConfirmCode}
                onChange={(e) => setMfaConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={confirmingMfa}
              />
            </label>
            {mfaSetupFieldErrors.code?.[0] && (
              <p className="alert">{mfaSetupFieldErrors.code[0]}</p>
            )}
            <label>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={mfaConfirmPassword}
                onChange={(e) => setMfaConfirmPassword(e.target.value)}
                disabled={confirmingMfa}
              />
            </label>
            {mfaSetupFieldErrors.current_password?.[0] && (
              <p className="alert">{mfaSetupFieldErrors.current_password[0]}</p>
            )}
            <div className="form-actions">
              <button
                type="submit"
                className="btn primary"
                disabled={confirmingMfa || mfaConfirmCode.length !== 6 || !mfaConfirmPassword}
              >
                {confirmingMfa ? 'Confirming…' : 'Confirm and enable MFA'}
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={confirmingMfa}
                onClick={() => {
                  setMfaSetup(null)
                  setMfaConfirmCode('')
                }}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
