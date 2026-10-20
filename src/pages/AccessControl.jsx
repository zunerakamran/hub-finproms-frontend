/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const ACCESS_DEFAULT = {
  uk_only: false,
  uk_cities_enabled: false,
  uk_cities: [],
  restrict_countries_enabled: false,
  restricted_countries: [],
  allow_countries_enabled: false,
  allowed_countries: [],
  restrict_ips_enabled: false,
  restricted_ips: [],
  allow_ips_enabled: false,
  allowed_ips: [],
  restrict_vpn_enabled: false,
  allow_vpn_enabled: false,
}

function parseListInput(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((s) => String(s).trim()).filter(Boolean))]
  }
  return [
    ...new Set(
      String(value || '')
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ]
}

function listToInput(value) {
  if (Array.isArray(value)) return value.join('\n')
  return String(value || '')
}

function AccessRulesForm({
  settings,
  setFlag,
  toggleSuggestedCity,
  suggestedCities,
  onSubmit,
  saving,
  submitLabel,
}) {
  if (!settings) return null

  return (
    <form className="secmon-card" onSubmit={onSubmit}>
      <div className="secmon-vpn-toggle">
        <div className="secmon-vpn-toggle__copy">
          <strong>Block VPN</strong>
          <span className="muted">
            {settings.restrict_vpn_enabled
              ? 'On — detected VPN, proxy, and hosting/datacenter exits are blocked (Allow IPs can still override).'
              : 'Off — VPN traffic is allowed and follows the IP / country / UK rules below.'}{' '}
            Detection is best-effort.
          </span>
        </div>
        <div className="secmon-vpn-toggle__control">
          <span
            className={`secmon-vpn-toggle__state ${
              settings.restrict_vpn_enabled ? 'is-blocked' : 'is-allowed'
            }`}
          >
            {settings.restrict_vpn_enabled ? 'Blocked' : 'Allowed'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={!!settings.restrict_vpn_enabled}
            aria-label="Block VPN"
            className={`secmon-switch ${settings.restrict_vpn_enabled ? 'is-on' : ''}`}
            onClick={() => setFlag('restrict_vpn_enabled', !settings.restrict_vpn_enabled)}
          >
            <span className="secmon-switch__knob" />
          </button>
        </div>
      </div>

      <p className="muted">
        Other rules are checked in this order (top wins first): Restrict IPs → Allow IPs → Restrict
        countries → Allow countries → Specific UK cities → UK only. When Block VPN is on, VPN is
        checked after Allow IPs.
      </p>

      <div className="secmon-access-rules">
        <div className="secmon-access-rule">
          <label className="checkbox-row secmon-access-check">
            <input
              type="checkbox"
              checked={!!settings.restrict_ips_enabled}
              onChange={(e) => setFlag('restrict_ips_enabled', e.target.checked)}
            />
            <span>
              <strong>Restrict IPs</strong>
              <span className="muted"> — always block these IPs, even inside an allowed country/UK</span>
            </span>
          </label>
          {settings.restrict_ips_enabled ? (
            <div className="secmon-access-rule__body">
              <textarea
                rows={3}
                value={listToInput(settings.restricted_ips)}
                onChange={(e) => setFlag('restricted_ips', e.target.value)}
                placeholder={'203.0.113.10\n198.51.100.0/24'}
              />
            </div>
          ) : null}
        </div>

        <div className="secmon-access-rule">
          <label className="checkbox-row secmon-access-check">
            <input
              type="checkbox"
              checked={!!settings.allow_ips_enabled}
              onChange={(e) => setFlag('allow_ips_enabled', e.target.checked)}
            />
            <span>
              <strong>Allow IPs</strong>
              <span className="muted">
                {' '}
                — these IPs always allowed; override VPN / country / UK / city blocks
              </span>
            </span>
          </label>
          {settings.allow_ips_enabled ? (
            <div className="secmon-access-rule__body">
              <textarea
                rows={3}
                value={listToInput(settings.allowed_ips)}
                onChange={(e) => setFlag('allowed_ips', e.target.value)}
                placeholder={'203.0.113.80\n198.51.100.0/24'}
              />
            </div>
          ) : null}
        </div>

        <div className="secmon-access-rule">
          <label className="checkbox-row secmon-access-check">
            <input
              type="checkbox"
              checked={!!settings.restrict_countries_enabled}
              onChange={(e) => setFlag('restrict_countries_enabled', e.target.checked)}
            />
            <span>
              <strong>Restrict countries</strong>
              <span className="muted"> — block selected countries (Allow IPs can override)</span>
            </span>
          </label>
          {settings.restrict_countries_enabled ? (
            <div className="secmon-access-rule__body">
              <textarea
                rows={3}
                value={listToInput(settings.restricted_countries)}
                onChange={(e) => setFlag('restricted_countries', e.target.value)}
                placeholder="RU, CN, KP"
              />
              <span className="muted">ISO 2-letter codes, comma or newline separated.</span>
            </div>
          ) : null}
        </div>

        <div className="secmon-access-rule">
          <label className="checkbox-row secmon-access-check">
            <input
              type="checkbox"
              checked={!!settings.allow_countries_enabled}
              onChange={(e) => setFlag('allow_countries_enabled', e.target.checked)}
            />
            <span>
              <strong>Allow countries</strong>
              <span className="muted">
                {' '}
                — allow these countries; also overrides Restrict countries / UK rules for them
              </span>
            </span>
          </label>
          {settings.allow_countries_enabled ? (
            <div className="secmon-access-rule__body">
              <textarea
                rows={3}
                value={listToInput(settings.allowed_countries)}
                onChange={(e) => setFlag('allowed_countries', e.target.value)}
                placeholder="GB, IE"
              />
              <span className="muted">ISO 2-letter codes, comma or newline separated.</span>
            </div>
          ) : null}
        </div>

        <div className="secmon-access-rule">
          <label className="checkbox-row secmon-access-check">
            <input
              type="checkbox"
              checked={!!settings.uk_cities_enabled}
              onChange={(e) => setFlag('uk_cities_enabled', e.target.checked)}
            />
            <span>
              <strong>Specific UK cities</strong>
              <span className="muted"> — allow only selected UK cities (must resolve as GB)</span>
            </span>
          </label>
          {settings.uk_cities_enabled ? (
            <div className="secmon-access-rule__body">
              <div className="secmon-chip-row">
                {(suggestedCities || []).map((city) => {
                  const selected = parseListInput(settings.uk_cities).includes(city)
                  return (
                    <button
                      key={city}
                      type="button"
                      className={`btn ghost ${selected ? 'active' : ''}`}
                      onClick={() => toggleSuggestedCity(city)}
                    >
                      {city}
                    </button>
                  )
                })}
              </div>
              <textarea
                rows={3}
                value={listToInput(settings.uk_cities)}
                onChange={(e) => setFlag('uk_cities', e.target.value)}
                placeholder="London, Manchester, Birmingham"
              />
            </div>
          ) : null}
        </div>

        <div className="secmon-access-rule">
          <label className="checkbox-row secmon-access-check">
            <input
              type="checkbox"
              checked={!!settings.uk_only}
              onChange={(e) => setFlag('uk_only', e.target.checked)}
            />
            <span>
              <strong>UK only</strong>
              <span className="muted"> — allow requests only from the United Kingdom</span>
            </span>
          </label>
        </div>
      </div>

      <div className="filters-row__actions" style={{ marginTop: '1rem' }}>
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function buildPayload(settings) {
  return {
    uk_only: !!settings.uk_only,
    uk_cities_enabled: !!settings.uk_cities_enabled,
    uk_cities: parseListInput(settings.uk_cities),
    restrict_countries_enabled: !!settings.restrict_countries_enabled,
    restricted_countries: parseListInput(settings.restricted_countries).map((c) => c.toUpperCase()),
    allow_countries_enabled: !!settings.allow_countries_enabled,
    allowed_countries: parseListInput(settings.allowed_countries).map((c) => c.toUpperCase()),
    restrict_ips_enabled: !!settings.restrict_ips_enabled,
    restricted_ips: parseListInput(settings.restricted_ips),
    allow_ips_enabled: !!settings.allow_ips_enabled,
    allowed_ips: parseListInput(settings.allowed_ips),
    restrict_vpn_enabled: !!settings.restrict_vpn_enabled,
    allow_vpn_enabled: false,
  }
}

export default function AccessControl() {
  const { isPowerAdmin } = useAuth()
  const { can, loading: hubLoading, actingHubId } = useHub()
  const asPowerAdmin = isPowerAdmin
  const moduleOn = can('security_monitoring')
  const canManageAccess = can('secmon_manage_access')
  const enabled = moduleOn && canManageAccess

  const [hubSettings, setHubSettings] = useState(null)
  const [userSettings, setUserSettings] = useState(null)
  const [suggestedCities, setSuggestedCities] = useState([])
  const [users, setUsers] = useState([])
  const [userQuery, setUserQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [section, setSection] = useState('hub')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadHub = useCallback(async () => {
    const data = await api.accessControlHubSettings({ asPowerAdmin })
    setHubSettings({ ...ACCESS_DEFAULT, ...(data.data || {}) })
    setSuggestedCities(data.options?.suggested_uk_cities || [])
  }, [asPowerAdmin])

  const loadUsers = useCallback(
    async (q = '') => {
      const data = await api.accessControlUsers({ q: q || undefined, per_page: 50 }, { asPowerAdmin })
      setUsers(data.users || [])
    },
    [asPowerAdmin]
  )

  const loadUserSettings = useCallback(
    async (userId) => {
      const data = await api.accessControlUserSettings(userId, { asPowerAdmin })
      setSelectedUser(data.user || null)
      setUserSettings({ ...ACCESS_DEFAULT, ...(data.data || {}) })
      if (data.options?.suggested_uk_cities?.length) {
        setSuggestedCities(data.options.suggested_uk_cities)
      }
    },
    [asPowerAdmin]
  )

  useEffect(() => {
    if (hubLoading || !enabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        await loadHub()
        await loadUsers()
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load access control.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hubLoading, enabled, actingHubId, loadHub, loadUsers])

  const setHubFlag = (key, value) => setHubSettings((s) => (s ? { ...s, [key]: value } : s))
  const setUserFlag = (key, value) => setUserSettings((s) => (s ? { ...s, [key]: value } : s))

  const toggleHubCity = (city) => {
    setHubSettings((s) => {
      if (!s) return s
      const current = parseListInput(s.uk_cities)
      const next = current.includes(city) ? current.filter((c) => c !== city) : [...current, city]
      return { ...s, uk_cities: next, uk_cities_enabled: true }
    })
  }

  const toggleUserCity = (city) => {
    setUserSettings((s) => {
      if (!s) return s
      const current = parseListInput(s.uk_cities)
      const next = current.includes(city) ? current.filter((c) => c !== city) : [...current, city]
      return { ...s, uk_cities: next, uk_cities_enabled: true }
    })
  }

  const saveHub = async (e) => {
    e.preventDefault()
    if (!hubSettings) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.accessControlUpdateHubSettings(buildPayload(hubSettings), {
        asPowerAdmin,
      })
      setHubSettings({ ...ACCESS_DEFAULT, ...(data.data || {}) })
      setMessage('Hub access rules saved.')
    } catch (err) {
      setError(err.message || 'Failed to save hub access rules.')
    } finally {
      setSaving(false)
    }
  }

  const saveUser = async (e) => {
    e.preventDefault()
    if (!userSettings || !selectedUser?.id) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api.accessControlUpdateUserSettings(
        selectedUser.id,
        buildPayload(userSettings),
        { asPowerAdmin }
      )
      setUserSettings({ ...ACCESS_DEFAULT, ...(data.data || {}) })
      setMessage(`Access rules saved for ${selectedUser.email}.`)
    } catch (err) {
      setError(err.message || 'Failed to save user access rules.')
    } finally {
      setSaving(false)
    }
  }

  if (hubLoading || loading) {
    return <p className="muted">Loading access control…</p>
  }

  if (!enabled) {
    return (
      <div className="secmon-card">
        <h1>Access control</h1>
        <p className="muted">
          You need the Access control capability (and Security Monitoring enabled for this hub) to
          manage these settings.
        </p>
      </div>
    )
  }

  return (
    <div className="secmon-settings">
      <div className="secmon-card" style={{ marginBottom: '1rem' }}>
        <h1>Access control</h1>
        <p className="muted">
          Configure hub-wide rules for everyone, plus optional extra rules for individual users
          (applied after login). Checked on every API request using the current IP / location / VPN
          signal.
        </p>
        <div className="secmon-chip-row" style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className={`btn ghost ${section === 'hub' ? 'active' : ''}`}
            onClick={() => setSection('hub')}
          >
            Hub rules
          </button>
          <button
            type="button"
            className={`btn ghost ${section === 'user' ? 'active' : ''}`}
            onClick={() => setSection('user')}
          >
            User rules
          </button>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success">{message}</p> : null}

      {section === 'hub' ? (
        <>
          <h2 style={{ marginBottom: '0.75rem' }}>Hub access rules</h2>
          <AccessRulesForm
            settings={hubSettings}
            setFlag={setHubFlag}
            toggleSuggestedCity={toggleHubCity}
            suggestedCities={suggestedCities}
            onSubmit={saveHub}
            saving={saving}
            submitLabel="Save hub access rules"
          />
        </>
      ) : (
        <>
          <div className="secmon-card" style={{ marginBottom: '1rem' }}>
            <h2>User access rules</h2>
            <p className="muted">
              Extra rules for one person, merged with hub rules after they log in. Restrict lists and
              Block VPN combine (union). UK cities intersect when both hub and user enable cities.
            </p>
            <div className="filters-row" style={{ marginTop: '0.75rem' }}>
              <input
                type="search"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search users by name or email"
              />
              <button
                type="button"
                className="btn ghost"
                onClick={() => loadUsers(userQuery).catch((err) => setError(err.message))}
              >
                Search
              </button>
            </div>
            <div className="secmon-access-rule__body" style={{ marginTop: '0.75rem' }}>
              {users.length === 0 ? (
                <p className="muted">No users found.</p>
              ) : (
                <div className="secmon-chip-row">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className={`btn ghost ${selectedUser?.id === u.id ? 'active' : ''}`}
                      onClick={() => {
                        setMessage('')
                        loadUserSettings(u.id).catch((err) => setError(err.message))
                      }}
                    >
                      {u.name || u.email}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedUser ? (
              <p className="muted" style={{ marginTop: '0.75rem' }}>
                Editing: <strong>{selectedUser.name}</strong> ({selectedUser.email})
              </p>
            ) : (
              <p className="muted" style={{ marginTop: '0.75rem' }}>
                Select a user to edit their access rules.
              </p>
            )}
          </div>

          {selectedUser && userSettings ? (
            <AccessRulesForm
              settings={userSettings}
              setFlag={setUserFlag}
              toggleSuggestedCity={toggleUserCity}
              suggestedCities={suggestedCities}
              onSubmit={saveUser}
              saving={saving}
              submitLabel="Save user access rules"
            />
          ) : null}
        </>
      )}
    </div>
  )
}
