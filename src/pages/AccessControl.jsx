/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import { formatUserRoles } from '../utils/roleLabels'
import {
  collectOpposingConflicts,
  formatConflictAlert,
  ipEntriesConflict,
  isValidCityName,
  isValidCountryCode,
  isValidIpEntry,
  normalizeCity,
  normalizeCountry,
  parseIpEntry,
  parseListInput,
} from '../utils/accessControlEntries'

const ACCESS_DEFAULT = {
  uk_only: false,
  uk_cities_enabled: false,
  uk_cities: [],
  restrict_countries_enabled: false,
  restricted_countries: [],
  restricted_cities: [],
  allow_countries_enabled: false,
  allowed_countries: [],
  allowed_cities: [],
  restrict_ips_enabled: false,
  restricted_ips: [],
  allow_ips_enabled: false,
  allowed_ips: [],
  restrict_vpn_enabled: false,
  allow_vpn_enabled: false,
  enforcement_mode: 'enforce',
}

function EntryListEditor({
  items,
  onChange,
  opposingItems = [],
  opposingLabel = 'the opposing list',
  validate,
  normalize = (v) => String(v || '').trim(),
  conflictsWith,
  placeholder,
  hint,
  addLabel = 'Add',
  inputMode,
  ariaLabel,
}) {
  const [draft, setDraft] = useState('')
  const [localError, setLocalError] = useState('')
  const list = parseListInput(items)

  const tryAdd = () => {
    const raw = draft.trim()
    if (!raw) return

    // Allow pasting several values at once (newline / comma / semicolon).
    const candidates = parseListInput(raw)
    const next = [...list]
    const added = []
    const errors = []

    for (const candidate of candidates) {
      const normalized = normalize(candidate)
      if (!normalized) continue

      if (validate && !validate(normalized)) {
        errors.push(`Invalid entry: ${candidate}`)
        continue
      }

      if (next.some((existing) => normalize(existing) === normalized)) {
        errors.push(`Already added: ${normalized}`)
        continue
      }

      const opposing = parseListInput(opposingItems)
      const conflict = opposing.find((other) =>
        conflictsWith ? conflictsWith(normalized, other) : normalize(other) === normalized
      )
      if (conflict) {
        errors.push(
          `"${normalized}" is already in ${opposingLabel} (${conflict}). Remove it there first, or keep it only on one side.`
        )
        continue
      }

      next.push(normalized)
      added.push(normalized)
    }

    if (errors.length) {
      setLocalError(errors[0])
      window.alert(errors[0])
    } else {
      setLocalError('')
    }

    if (added.length) {
      onChange(next)
      setDraft('')
    }
  }

  const removeItem = (item) => {
    const key = normalize(item)
    onChange(list.filter((existing) => normalize(existing) !== key))
    setLocalError('')
  }

  return (
    <div className="access-control-entry-editor">
      <div className="access-control-entry-editor__add">
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (localError) setLocalError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              tryAdd()
            }
          }}
          placeholder={placeholder}
          inputMode={inputMode}
          aria-label={ariaLabel || placeholder}
        />
        <button type="button" className="btn primary" onClick={tryAdd}>
          {addLabel}
        </button>
      </div>
      {hint ? <p className="access-control-entry-editor__hint muted">{hint}</p> : null}
      {localError ? <p className="access-control-entry-editor__error">{localError}</p> : null}
      {list.length ? (
        <ul className="access-control-entry-chips" aria-label={ariaLabel || 'Entries'}>
          {list.map((item) => (
            <li key={item} className="access-control-entry-chip">
              <code>{item}</code>
              <button
                type="button"
                className="access-control-entry-chip__remove"
                aria-label={`Remove ${item}`}
                onClick={() => removeItem(item)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="access-control-entry-editor__empty muted">No entries yet — add one above.</p>
      )}
    </div>
  )
}

function normalizeIpForStore(value) {
  const parsed = parseIpEntry(value)
  return parsed?.raw || String(value || '').trim()
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
    <form className="access-control-card access-control-rules-card" onSubmit={onSubmit}>
      <div className="access-control-mode">
        <div className="access-control-mode__copy">
          <strong>Enforcement mode</strong>
          <span className="muted">
            {settings.enforcement_mode === 'monitor'
              ? 'Monitor — rules are evaluated and logged, but matching requests are still allowed.'
              : 'Enforce — matching requests are blocked with HTTP 403.'}
          </span>
        </div>
        <div className="tab-row access-control-mode__tabs" role="tablist" aria-label="Enforcement mode">
          <button
            type="button"
            role="tab"
            aria-selected={settings.enforcement_mode !== 'monitor'}
            className={`btn ghost ${settings.enforcement_mode !== 'monitor' ? 'active' : ''}`}
            onClick={() => setFlag('enforcement_mode', 'enforce')}
          >
            Enforce
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={settings.enforcement_mode === 'monitor'}
            className={`btn ghost ${settings.enforcement_mode === 'monitor' ? 'active' : ''}`}
            onClick={() => setFlag('enforcement_mode', 'monitor')}
          >
            Monitor
          </button>
        </div>
      </div>

      <div className="access-control-vpn">
        <div className="access-control-vpn__copy">
          <strong>Block VPN</strong>
          <span className="muted">
            {settings.restrict_vpn_enabled
              ? 'On — detected VPN, proxy, and hosting/datacenter exits are blocked (Allow IPs can still override).'
              : 'Off — VPN traffic is allowed and follows the IP / country / UK rules below.'}{' '}
            Detection is best-effort.
          </span>
        </div>
        <div className="access-control-vpn__control">
          <span
            className={`access-control-vpn__state ${
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
            className={`access-control-switch ${settings.restrict_vpn_enabled ? 'is-on' : ''}`}
            onClick={() => setFlag('restrict_vpn_enabled', !settings.restrict_vpn_enabled)}
          >
            <span className="access-control-switch__knob" />
          </button>
        </div>
      </div>

      <p className="access-control-hint muted">
        Rules order: Restrict IPs → Allow IPs → Block VPN → Restricted countries/cities → Allowed
        countries/cities → Specific UK cities → UK only.
      </p>

      <div className="access-control-rules">
        <div className="access-control-rule">
          <label className="access-control-check">
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
            <div className="access-control-rule__body">
              <EntryListEditor
                items={settings.restricted_ips}
                onChange={(next) => setFlag('restricted_ips', next)}
                opposingItems={settings.allowed_ips}
                opposingLabel="Allowed IPs"
                validate={isValidIpEntry}
                normalize={normalizeIpForStore}
                conflictsWith={ipEntriesConflict}
                placeholder="203.0.113.10 or 198.51.100.0/24 or 203.0.113.10-203.0.113.50"
                hint="Add a single IP, CIDR (e.g. 198.51.100.0/24), or inclusive range (start-end). Press Enter or Add. Cannot overlap Allowed IPs."
                ariaLabel="Restricted IPs"
              />
            </div>
          ) : null}
        </div>

        <div className="access-control-rule">
          <label className="access-control-check">
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
            <div className="access-control-rule__body">
              <EntryListEditor
                items={settings.allowed_ips}
                onChange={(next) => setFlag('allowed_ips', next)}
                opposingItems={settings.restricted_ips}
                opposingLabel="Restricted IPs"
                validate={isValidIpEntry}
                normalize={normalizeIpForStore}
                conflictsWith={ipEntriesConflict}
                placeholder="203.0.113.80 or 10.0.0.1-10.0.0.20"
                hint="Same formats as Restrict IPs. Entries must not overlap Restricted IPs."
                ariaLabel="Allowed IPs"
              />
            </div>
          ) : null}
        </div>

        <div className="access-control-rule">
          <label className="access-control-check">
            <input
              type="checkbox"
              checked={!!settings.restrict_countries_enabled}
              onChange={(e) => setFlag('restrict_countries_enabled', e.target.checked)}
            />
            <span>
              <strong>Restricted countries / cities</strong>
              <span className="muted"> — block selected countries or cities (Allow IPs can override)</span>
            </span>
          </label>
          {settings.restrict_countries_enabled ? (
            <div className="access-control-rule__body">
              <p className="access-control-entry-editor__hint muted">Countries</p>
              <EntryListEditor
                items={settings.restricted_countries}
                onChange={(next) => {
                  const codes = next.map(normalizeCountry)
                  if (codes.includes('GB') && settings.uk_cities_enabled && parseListInput(settings.uk_cities).length) {
                    window.alert(
                      'Cannot restrict GB while Specific UK cities has entries. Clear UK cities or turn that rule off first.'
                    )
                    return
                  }
                  if (codes.includes('GB') && settings.uk_only) {
                    window.alert(
                      'Cannot restrict GB while UK only is on. Turn off UK only first, or do not restrict GB.'
                    )
                    return
                  }
                  setFlag('restricted_countries', next)
                }}
                opposingItems={settings.allowed_countries}
                opposingLabel="Allowed countries"
                validate={isValidCountryCode}
                normalize={normalizeCountry}
                placeholder="e.g. GB"
                hint="ISO 2-letter codes (United Kingdom = GB). Cannot also appear in Allowed countries."
                ariaLabel="Restricted countries"
              />
              <p className="access-control-entry-editor__hint muted">Cities</p>
              <EntryListEditor
                items={settings.restricted_cities}
                onChange={(next) => setFlag('restricted_cities', next)}
                opposingItems={settings.allowed_cities}
                opposingLabel="Allowed cities"
                validate={isValidCityName}
                normalize={normalizeCity}
                conflictsWith={(a, b) => normalizeCity(a).toLowerCase() === normalizeCity(b).toLowerCase()}
                placeholder="e.g. London, Manchester, Birmingham"
                hint="City names as resolved by geo (e.g. UK cities). Cannot also appear in Allowed cities."
                ariaLabel="Restricted cities"
              />
            </div>
          ) : null}
        </div>

        <div className="access-control-rule">
          <label className="access-control-check">
            <input
              type="checkbox"
              checked={!!settings.allow_countries_enabled}
              onChange={(e) => setFlag('allow_countries_enabled', e.target.checked)}
            />
            <span>
              <strong>Allowed countries / cities</strong>
              <span className="muted">
                {' '}
                — always allow these; overrides Specific UK cities / UK only
              </span>
            </span>
          </label>
          {settings.allow_countries_enabled ? (
            <div className="access-control-rule__body">
              <p className="access-control-entry-editor__hint muted">Countries</p>
              <EntryListEditor
                items={settings.allowed_countries}
                onChange={(next) => setFlag('allowed_countries', next)}
                opposingItems={settings.restricted_countries}
                opposingLabel="Restricted countries"
                validate={isValidCountryCode}
                normalize={normalizeCountry}
                placeholder="e.g. GB"
                hint="ISO 2-letter codes (United Kingdom = GB). Cannot also appear in Restricted countries."
                ariaLabel="Allowed countries"
              />
              <p className="access-control-entry-editor__hint muted">Cities</p>
              <EntryListEditor
                items={settings.allowed_cities}
                onChange={(next) => setFlag('allowed_cities', next)}
                opposingItems={settings.restricted_cities}
                opposingLabel="Restricted cities"
                validate={isValidCityName}
                normalize={normalizeCity}
                conflictsWith={(a, b) => normalizeCity(a).toLowerCase() === normalizeCity(b).toLowerCase()}
                placeholder="e.g. London, Manchester, Birmingham"
                hint="City names as resolved by geo (e.g. UK cities). Cannot also appear in Restricted cities."
                ariaLabel="Allowed cities"
              />
            </div>
          ) : null}
        </div>

        <div className="access-control-rule">
          <label className="access-control-check">
            <input
              type="checkbox"
              checked={!!settings.uk_cities_enabled}
              onChange={(e) => {
                const enabled = e.target.checked
                if (enabled) {
                  const restricted = parseListInput(settings.restricted_countries).map(normalizeCountry)
                  if (restricted.includes('GB')) {
                    window.alert(
                      'GB is in Restricted countries. UK cities only apply to GB traffic — remove GB from Restricted countries first, or leave UK cities off.'
                    )
                    return
                  }
                }
                setFlag('uk_cities_enabled', enabled)
              }}
            />
            <span>
              <strong>Specific UK cities</strong>
              <span className="muted"> — allow only selected UK cities (must resolve as GB)</span>
            </span>
          </label>
          {settings.uk_cities_enabled ? (
            <div className="access-control-rule__body">
              <div className="access-control-chip-row">
                {(suggestedCities || []).map((city) => {
                  const selected = parseListInput(settings.uk_cities)
                    .map(normalizeCity)
                    .includes(normalizeCity(city))
                  return (
                    <button
                      key={city}
                      type="button"
                      className={`access-control-chip ${selected ? 'is-active' : ''}`}
                      onClick={() => {
                        const restricted = parseListInput(settings.restricted_countries).map(
                          normalizeCountry
                        )
                        if (!selected && restricted.includes('GB')) {
                          window.alert(
                            'GB is in Restricted countries. Remove GB from Restricted countries before selecting UK cities.'
                          )
                          return
                        }
                        toggleSuggestedCity(city)
                      }}
                    >
                      {city}
                    </button>
                  )
                })}
              </div>
              <EntryListEditor
                items={settings.uk_cities}
                onChange={(next) => {
                  const restricted = parseListInput(settings.restricted_countries).map(normalizeCountry)
                  if (next.length && restricted.includes('GB')) {
                    window.alert(
                      'GB is in Restricted countries. Remove GB from Restricted countries before adding UK cities.'
                    )
                    return
                  }
                  setFlag('uk_cities', next)
                }}
                validate={isValidCityName}
                normalize={normalizeCity}
                placeholder="e.g. London, Manchester, Birmingham, Edinburgh"
                hint="UK only — pick a suggested city or type a UK city name. Country must resolve as GB."
                ariaLabel="UK cities"
              />
            </div>
          ) : null}
        </div>

        <div className="access-control-rule">
          <label className="access-control-check">
            <input
              type="checkbox"
              checked={!!settings.uk_only}
              onChange={(e) => {
                const enabled = e.target.checked
                if (enabled) {
                  const restricted = parseListInput(settings.restricted_countries).map(normalizeCountry)
                  if (restricted.includes('GB')) {
                    window.alert(
                      'GB is in Restricted countries. Remove GB from Restricted countries before enabling UK only.'
                    )
                    return
                  }
                }
                setFlag('uk_only', enabled)
              }}
            />
            <span>
              <strong>UK only</strong>
              <span className="muted"> — allow requests only from the United Kingdom</span>
            </span>
          </label>
        </div>
      </div>

      <div className="access-control-actions">
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
    restricted_cities: parseListInput(settings.restricted_cities),
    allow_countries_enabled: !!settings.allow_countries_enabled,
    allowed_countries: parseListInput(settings.allowed_countries).map((c) => c.toUpperCase()),
    allowed_cities: parseListInput(settings.allowed_cities),
    restrict_ips_enabled: !!settings.restrict_ips_enabled,
    restricted_ips: parseListInput(settings.restricted_ips),
    allow_ips_enabled: !!settings.allow_ips_enabled,
    allowed_ips: parseListInput(settings.allowed_ips),
    restrict_vpn_enabled: !!settings.restrict_vpn_enabled,
    allow_vpn_enabled: false,
    enforcement_mode: settings.enforcement_mode === 'monitor' ? 'monitor' : 'enforce',
  }
}

function formatChangeValue(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '[]'
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function formatChangeTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

const CHANGE_FIELD_LABELS = {
  uk_only: 'UK only',
  uk_cities_enabled: 'Specific UK cities enabled',
  uk_cities: 'UK cities',
  restrict_countries_enabled: 'Restricted countries / cities enabled',
  restricted_countries: 'Restricted countries',
  restricted_cities: 'Restricted cities',
  allow_countries_enabled: 'Allowed countries / cities enabled',
  allowed_countries: 'Allowed countries',
  allowed_cities: 'Allowed cities',
  restrict_ips_enabled: 'Restrict IPs enabled',
  restricted_ips: 'Restricted IPs',
  allow_ips_enabled: 'Allow IPs enabled',
  allowed_ips: 'Allowed IPs',
  restrict_vpn_enabled: 'Block VPN',
  allow_vpn_enabled: 'Allow VPN',
  enforcement_mode: 'Enforcement mode',
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
  const [simIp, setSimIp] = useState('')
  const [simUserId, setSimUserId] = useState('')
  const [simCountry, setSimCountry] = useState('')
  const [simCity, setSimCity] = useState('')
  const [simVpn, setSimVpn] = useState('')
  const [simulating, setSimulating] = useState(false)
  const [simResult, setSimResult] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyScope, setHistoryScope] = useState('')
  const [expandedHistoryId, setExpandedHistoryId] = useState(null)
  const [restoringId, setRestoringId] = useState(null)
  const [unlocking, setUnlocking] = useState(false)
  const [blockedAttempts, setBlockedAttempts] = useState([])
  const [blockedLoading, setBlockedLoading] = useState(false)
  const [blockedQuery, setBlockedQuery] = useState('')
  const [blockedType, setBlockedType] = useState('')

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

  const loadHistory = useCallback(
    async (scope = historyScope) => {
      setHistoryLoading(true)
      try {
        const data = await api.accessControlChanges(
          { per_page: 50, scope: scope || undefined },
          { asPowerAdmin }
        )
        setHistory(data.data || [])
      } finally {
        setHistoryLoading(false)
      }
    },
    [asPowerAdmin, historyScope]
  )

  const loadBlockedAttempts = useCallback(
    async ({ q = blockedQuery, event_type = blockedType } = {}) => {
      setBlockedLoading(true)
      try {
        const data = await api.accessControlBlockedAttempts(
          {
            per_page: 50,
            q: q || undefined,
            event_type: event_type || undefined,
          },
          { asPowerAdmin }
        )
        setBlockedAttempts(data.data || [])
      } finally {
        setBlockedLoading(false)
      }
    },
    [asPowerAdmin, blockedQuery, blockedType]
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

  const confirmSelfLockout = (preview) => {
    const ip = preview?.ip || 'your IP'
    const rule = preview?.reason_label || preview?.reason || 'access rules'
    return window.confirm(
      `These rules would BLOCK ${ip} (rule: ${rule}).\n\nSave anyway? Prefer Monitor mode or Simulate first if you are unsure.`
    )
  }

  const saveHub = async (e) => {
    e.preventDefault()
    if (!hubSettings) return
    const conflicts = collectOpposingConflicts(hubSettings)
    if (conflicts.length) {
      const alertText = formatConflictAlert(conflicts)
      window.alert(alertText)
      setError(conflicts[0])
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = buildPayload(hubSettings)
      let data
      try {
        data = await api.accessControlUpdateHubSettings(payload, { asPowerAdmin })
      } catch (err) {
        if (err.status === 409 && err.data?.code === 'self_lockout_risk') {
          if (!confirmSelfLockout(err.data.preview)) {
            setError('Save cancelled — rules would block your current IP.')
            return
          }
          data = await api.accessControlUpdateHubSettings(
            { ...payload, acknowledge_self_lockout: true },
            { asPowerAdmin }
          )
        } else {
          throw err
        }
      }
      setHubSettings({ ...ACCESS_DEFAULT, ...(data.data || {}) })
      const preview = data.self_lockout_preview
      if (preview?.result === 'would_block') {
        setMessage(
          `Hub access rules saved (Monitor). Your IP ${preview.ip || ''} would be blocked if you switch to Enforce (${preview.reason_label || preview.reason}).`
        )
      } else {
        setMessage('Hub access rules saved.')
      }
      if (section === 'history') {
        loadHistory().catch(() => {})
      }
    } catch (err) {
      setError(err.message || 'Failed to save hub access rules.')
    } finally {
      setSaving(false)
    }
  }

  const saveUser = async (e) => {
    e.preventDefault()
    if (!userSettings || !selectedUser?.id) return
    const conflicts = collectOpposingConflicts(userSettings)
    if (conflicts.length) {
      const alertText = formatConflictAlert(conflicts)
      window.alert(alertText)
      setError(conflicts[0])
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = buildPayload(userSettings)
      let data
      try {
        data = await api.accessControlUpdateUserSettings(selectedUser.id, payload, {
          asPowerAdmin,
        })
      } catch (err) {
        if (err.status === 409 && err.data?.code === 'self_lockout_risk') {
          if (!confirmSelfLockout(err.data.preview)) {
            setError('Save cancelled — rules would block your current IP.')
            return
          }
          data = await api.accessControlUpdateUserSettings(
            selectedUser.id,
            { ...payload, acknowledge_self_lockout: true },
            { asPowerAdmin }
          )
        } else {
          throw err
        }
      }
      setUserSettings({ ...ACCESS_DEFAULT, ...(data.data || {}) })
      setMessage(`Access rules saved for ${selectedUser.email}.`)
      if (section === 'history') {
        loadHistory().catch(() => {})
      }
    } catch (err) {
      setError(err.message || 'Failed to save user access rules.')
    } finally {
      setSaving(false)
    }
  }

  const restoreHistoryRow = async (row, snapshot = 'before') => {
    if (!row?.id) return
    const label = snapshot === 'after' ? 'the new values from' : 'the previous values before'
    if (
      !window.confirm(
        `Restore ${label} this change?\n\n${row.change_summary || row.title || ''}`
      )
    ) {
      return
    }
    setRestoringId(row.id)
    setError('')
    setMessage('')
    try {
      const data = await api.accessControlRestoreChange(
        row.id,
        { snapshot },
        { asPowerAdmin }
      )
      if (data.scope === 'hub' && data.data) {
        setHubSettings({ ...ACCESS_DEFAULT, ...data.data })
      }
      if (data.scope === 'user' && data.data && data.user) {
        setSelectedUser(data.user)
        setUserSettings({ ...ACCESS_DEFAULT, ...data.data })
      }
      setMessage(
        snapshot === 'after'
          ? 'Restored the “after” snapshot from history.'
          : 'Restored the previous (“before”) snapshot from history.'
      )
      await loadHistory()
      await loadHub()
    } catch (err) {
      setError(err.message || 'Failed to restore from history.')
    } finally {
      setRestoringId(null)
    }
  }

  const runEmergencyUnlock = async ({ keepRules = false } = {}) => {
    const ok = window.confirm(
      keepRules
        ? 'Switch enforcement to Monitor for this hub (keep rule flags)? You will no longer get hard 403s from these rules.'
        : 'Emergency unlock: clear UK-only / country / IP / VPN gates and set Monitor mode for this hub (and user rules)?'
    )
    if (!ok) return
    setUnlocking(true)
    setError('')
    setMessage('')
    try {
      const data = await api.accessControlEmergencyUnlock({ keep_rules: keepRules }, { asPowerAdmin })
      if (data.data) {
        setHubSettings({ ...ACCESS_DEFAULT, ...data.data })
      } else {
        await loadHub()
      }
      setMessage(data.message || 'Emergency unlock applied.')
      if (section === 'history') {
        loadHistory().catch(() => {})
      }
    } catch (err) {
      setError(err.message || 'Emergency unlock failed.')
    } finally {
      setUnlocking(false)
    }
  }

  const runSimulate = async (e, { useMyIp = false } = {}) => {
    e?.preventDefault?.()
    setSimulating(true)
    setError('')
    setMessage('')
    setSimResult(null)
    try {
      const payload = {}
      const ipValue = useMyIp ? '' : simIp.trim()
      if (ipValue) payload.ip = ipValue
      if (simUserId) payload.user_id = Number(simUserId)
      if (simCountry.trim()) payload.country = simCountry.trim().toUpperCase()
      if (simCity.trim()) payload.city = simCity.trim()
      if (simVpn === 'true') payload.vpn = true
      if (simVpn === 'false') payload.vpn = false

      const data = await api.accessControlSimulate(payload, { asPowerAdmin })
      setSimResult(data.data || null)
      if (data.data?.ip && (useMyIp || !simIp.trim())) {
        setSimIp(data.data.ip)
      }
    } catch (err) {
      setError(err.message || 'Simulation failed.')
    } finally {
      setSimulating(false)
    }
  }

  const simResultTone =
    simResult?.result === 'block'
      ? 'is-block'
      : simResult?.result === 'would_block'
        ? 'is-would-block'
        : 'is-pass'

  const simResultLabel =
    simResult?.result === 'block'
      ? 'BLOCK'
      : simResult?.result === 'would_block'
        ? 'WOULD BLOCK'
        : simResult
          ? 'PASS'
          : ''

  if (hubLoading || loading) {
    return (
      <div className="access-control-page">
        <p className="muted">Loading access control…</p>
      </div>
    )
  }

  if (!enabled) {
    return (
      <div className="access-control-page">
        <div className="access-control-card">
          <h1>Access control</h1>
          <p className="muted">
            You need the Access control capability (and Security Monitoring enabled for this hub) to
            manage these settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="access-control-page">
      <header className="access-control-header">
        <div>
          <h1>Access control</h1>
          <p className="muted">
            Hub-wide rules for everyone, plus optional per-user rules after login. Checked on every
            API request using the current IP / location / VPN signal.
          </p>
        </div>
        <div className="access-control-header__actions">
          <button
            type="button"
            className="btn ghost"
            disabled={unlocking}
            onClick={() => runEmergencyUnlock({ keepRules: true })}
          >
            {unlocking ? 'Unlocking…' : 'Switch to Monitor'}
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={unlocking}
            onClick={() => runEmergencyUnlock({ keepRules: false })}
          >
            Emergency unlock
          </button>
        </div>
      </header>

      <div className="tab-row access-control-tabs" role="tablist" aria-label="Access control views">
        <button
          type="button"
          role="tab"
          aria-selected={section === 'hub'}
          className={`btn ghost ${section === 'hub' ? 'active' : ''}`}
          onClick={() => {
            setSection('hub')
            setMessage('')
            setError('')
          }}
        >
          Hub rules
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === 'user'}
          className={`btn ghost ${section === 'user' ? 'active' : ''}`}
          onClick={() => {
            setSection('user')
            setMessage('')
            setError('')
          }}
        >
          User rules
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === 'simulate'}
          className={`btn ghost ${section === 'simulate' ? 'active' : ''}`}
          onClick={() => {
            setSection('simulate')
            setMessage('')
            setError('')
          }}
        >
          Simulate
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === 'blocked'}
          className={`btn ghost ${section === 'blocked' ? 'active' : ''}`}
          onClick={() => {
            setSection('blocked')
            setMessage('')
            setError('')
            loadBlockedAttempts().catch((err) =>
              setError(err.message || 'Failed to load blocked attempts.')
            )
          }}
        >
          Blocked attempts
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === 'history'}
          className={`btn ghost ${section === 'history' ? 'active' : ''}`}
          onClick={() => {
            setSection('history')
            setMessage('')
            setError('')
            loadHistory().catch((err) => setError(err.message || 'Failed to load history.'))
          }}
        >
          History
        </button>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      {section === 'hub' ? (
        <section className="access-control-section" aria-label="Hub access rules">
          <div className="access-control-section__intro">
            <h2>Hub access rules</h2>
            <p className="muted">These rules apply to all users on this hub.</p>
          </div>
          <AccessRulesForm
            settings={hubSettings}
            setFlag={setHubFlag}
            toggleSuggestedCity={toggleHubCity}
            suggestedCities={suggestedCities}
            onSubmit={saveHub}
            saving={saving}
            submitLabel="Save hub access rules"
          />
        </section>
      ) : null}

      {section === 'user' ? (
        <section className="access-control-section" aria-label="User access rules">
          <div className="access-control-card access-control-user-picker">
            <div className="access-control-section__intro">
              <h2>User access rules</h2>
              <p className="muted">
                Extra rules for one person, merged with hub rules after login. Restrict lists and
                Block VPN combine. UK cities intersect when both hub and user enable cities.
              </p>
            </div>

            <form
              className="access-control-search"
              onSubmit={(e) => {
                e.preventDefault()
                loadUsers(userQuery).catch((err) => setError(err.message))
              }}
            >
              <input
                type="search"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search users by name or email"
                aria-label="Search users"
              />
              <button type="submit" className="btn primary">
                Search
              </button>
            </form>

            {users.length === 0 ? (
              <p className="muted">No users found.</p>
            ) : (
              <div className="access-control-user-list" role="listbox" aria-label="Users">
                {users.map((u) => {
                  const active = selectedUser?.id === u.id
                  return (
                    <button
                      key={u.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`access-control-user-item ${active ? 'is-active' : ''}`}
                      onClick={() => {
                        setMessage('')
                        loadUserSettings(u.id).catch((err) => setError(err.message))
                      }}
                    >
                      <span className="access-control-user-item__name">{u.name || u.email}</span>
                      <span className="access-control-user-item__meta muted">
                        {u.email}
                        {formatUserRoles(u) !== '-' ? ` · ${formatUserRoles(u)}` : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {selectedUser ? (
              <p className="access-control-selected muted">
                Editing <strong>{selectedUser.name}</strong> ({selectedUser.email})
              </p>
            ) : (
              <p className="access-control-selected muted">Select a user to edit their access rules.</p>
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
        </section>
      ) : null}

      {section === 'simulate' ? (
        <section className="access-control-section" aria-label="Simulate access">
          <div className="access-control-section__intro">
            <h2>Simulate access</h2>
            <p className="muted">
              Preview what the current saved rules would do for an IP. Does not change settings or
              block anyone. Leave IP blank to use your current connection.
            </p>
          </div>

          <form className="access-control-card access-control-simulate" onSubmit={runSimulate}>
            <div className="access-control-simulate__grid">
              <label className="access-control-field">
                <span>IP address</span>
                <input
                  type="text"
                  value={simIp}
                  onChange={(e) => setSimIp(e.target.value)}
                  placeholder="Leave blank for my IP"
                  aria-label="IP address to simulate"
                />
              </label>

              <label className="access-control-field">
                <span>User (optional)</span>
                <select
                  value={simUserId}
                  onChange={(e) => setSimUserId(e.target.value)}
                  aria-label="User to include in simulation"
                >
                  <option value="">Hub rules only</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email} ({u.email})
                    </option>
                  ))}
                </select>
              </label>

              <label className="access-control-field">
                <span>Country override (optional)</span>
                <input
                  type="text"
                  value={simCountry}
                  onChange={(e) => setSimCountry(e.target.value)}
                  placeholder="e.g. GB"
                  maxLength={2}
                  aria-label="Country override"
                />
              </label>

              <label className="access-control-field">
                <span>City override (optional)</span>
                <input
                  type="text"
                  value={simCity}
                  onChange={(e) => setSimCity(e.target.value)}
                  placeholder="e.g. London, Manchester"
                  aria-label="City override"
                />
              </label>

              <label className="access-control-field">
                <span>VPN signal (optional)</span>
                <select
                  value={simVpn}
                  onChange={(e) => setSimVpn(e.target.value)}
                  aria-label="VPN override"
                >
                  <option value="">Auto / lookup</option>
                  <option value="true">Treat as VPN</option>
                  <option value="false">Treat as not VPN</option>
                </select>
              </label>
            </div>

            <div className="access-control-actions">
              <button type="submit" className="btn primary" disabled={simulating}>
                {simulating ? 'Running…' : 'Run simulation'}
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={simulating}
                onClick={() => runSimulate(null, { useMyIp: true })}
              >
                Use my IP
              </button>
            </div>
          </form>

          {simResult ? (
            <div className={`access-control-card access-control-sim-result ${simResultTone}`}>
              <div className="access-control-sim-result__badge">{simResultLabel}</div>
              <dl className="access-control-sim-result__meta">
                <div>
                  <dt>IP</dt>
                  <dd>{simResult.ip || '—'}</dd>
                </div>
                <div>
                  <dt>Mode</dt>
                  <dd>{simResult.mode === 'monitor' ? 'Monitor' : 'Enforce'}</dd>
                </div>
                <div>
                  <dt>Rule</dt>
                  <dd>{simResult.reason_label || simResult.reason || '—'}</dd>
                </div>
                <div>
                  <dt>Country / city</dt>
                  <dd>
                    {simResult.country || '—'}
                    {simResult.city ? ` / ${simResult.city}` : ''}
                  </dd>
                </div>
                <div>
                  <dt>VPN</dt>
                  <dd>
                    {simResult.vpn === true ? 'Yes' : simResult.vpn === false ? 'No' : 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt>Scopes</dt>
                  <dd>
                    {simResult.hub_rules_active ? 'Hub' : 'No hub rules'}
                    {simResult.user_rules_active
                      ? ` + user${simResult.user?.email ? ` (${simResult.user.email})` : ''}`
                      : simResult.user
                        ? ` (user ${simResult.user.email} has no extra rules)`
                        : ''}
                  </dd>
                </div>
              </dl>
              {simResult.private_ip_bypass ? (
                <p className="muted">
                  This is a private/local IP. Live API traffic from it skips geo / VPN rules by
                  default.
                </p>
              ) : null}
              {simResult.self_lockout_risk ? (
                <p className="access-control-sim-result__warn">
                  Warning: this matches your current IP. Switching to Enforce with these rules could
                  lock you out.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {section === 'blocked' ? (
        <section className="access-control-section" aria-label="Blocked access attempts">
          <div className="access-control-section__intro">
            <h2>Blocked attempts</h2>
            <p className="muted">
              Requests denied (or that would be denied in Monitor mode) by Access Control / the
              application firewall. Shows user, country, city, IP, path, and rule. Stored as
              security events — not in Change history or the general Activity log.
            </p>
          </div>

          <div className="access-control-card access-control-history-toolbar">
            <form
              className="access-control-search"
              onSubmit={(e) => {
                e.preventDefault()
                loadBlockedAttempts().catch((err) => setError(err.message))
              }}
            >
              <input
                type="search"
                value={blockedQuery}
                onChange={(e) => setBlockedQuery(e.target.value)}
                placeholder="Search IP, email, country, city…"
                aria-label="Search blocked attempts"
              />
              <select
                value={blockedType}
                onChange={(e) => setBlockedType(e.target.value)}
                aria-label="Event type filter"
              >
                <option value="">All types</option>
                <option value="fw.access_restricted">Blocked (enforce)</option>
                <option value="fw.access_would_block">Would block (monitor)</option>
                <option value="fw.ip_denied">Firewall IP deny</option>
                <option value="fw.ip_auto_blocked">Auto-blocked IP</option>
              </select>
              <button type="submit" className="btn primary" disabled={blockedLoading}>
                Search
              </button>
            </form>
            <button
              type="button"
              className="btn ghost"
              disabled={blockedLoading}
              onClick={() => loadBlockedAttempts().catch((err) => setError(err.message))}
            >
              {blockedLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {blockedLoading && blockedAttempts.length === 0 ? (
            <p className="muted">Loading blocked attempts…</p>
          ) : null}

          {!blockedLoading && blockedAttempts.length === 0 ? (
            <div className="access-control-card">
              <p className="muted">No blocked attempts recorded yet.</p>
            </div>
          ) : null}

          <div className="access-control-blocked-list">
            {blockedAttempts.map((row) => (
              <article key={row.id} className="access-control-card access-control-blocked-item">
                <div className="access-control-blocked-item__head">
                  <strong>{row.title}</strong>
                  <span className="muted">{formatChangeTime(row.occurred_at)}</span>
                </div>
                <p className="access-control-blocked-item__desc">{row.description}</p>
                <dl className="access-control-blocked-item__meta">
                  <div>
                    <dt>User</dt>
                    <dd>
                      {row.user?.email || row.actor?.email
                        ? `${row.user?.name || row.actor?.name || 'User'} (${row.user?.email || row.actor?.email})`
                        : 'Guest / unauthenticated'}
                    </dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>
                      {[row.country, row.city].filter(Boolean).join(' / ') || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>IP</dt>
                    <dd>
                      <code>{row.source_ip || '—'}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Request</dt>
                    <dd>
                      <code>
                        {row.http_method || ''} {row.path || '—'}
                      </code>
                    </dd>
                  </div>
                  <div>
                    <dt>Rule</dt>
                    <dd>{row.reason || row.event_type || '—'}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {section === 'history' ? (
        <section className="access-control-section" aria-label="Access policy history">
          <div className="access-control-section__intro">
            <h2>Change history</h2>
            <p className="muted">
              Who changed hub or user access rules, when, and what fields changed. Does not include
              simulate runs or blocked access attempts (see Blocked attempts).
            </p>
          </div>

          <div className="access-control-card access-control-history-toolbar">
            <div className="tab-row" role="tablist" aria-label="History scope filter">
              <button
                type="button"
                role="tab"
                aria-selected={historyScope === ''}
                className={`btn ghost ${historyScope === '' ? 'active' : ''}`}
                onClick={() => {
                  setHistoryScope('')
                  loadHistory('').catch((err) => setError(err.message))
                }}
              >
                All
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={historyScope === 'hub'}
                className={`btn ghost ${historyScope === 'hub' ? 'active' : ''}`}
                onClick={() => {
                  setHistoryScope('hub')
                  loadHistory('hub').catch((err) => setError(err.message))
                }}
              >
                Hub
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={historyScope === 'user'}
                className={`btn ghost ${historyScope === 'user' ? 'active' : ''}`}
                onClick={() => {
                  setHistoryScope('user')
                  loadHistory('user').catch((err) => setError(err.message))
                }}
              >
                User
              </button>
            </div>
            <button
              type="button"
              className="btn ghost"
              disabled={historyLoading}
              onClick={() => loadHistory().catch((err) => setError(err.message))}
            >
              {historyLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {historyLoading && history.length === 0 ? (
            <p className="muted">Loading history…</p>
          ) : null}

          {!historyLoading && history.length === 0 ? (
            <div className="access-control-card">
              <p className="muted">No access rule changes recorded yet.</p>
            </div>
          ) : null}

          <div className="access-control-history-list">
            {history.map((row) => {
              const open = expandedHistoryId === row.id
              const changes = row.changes || {}
              const changeKeys = Object.keys(changes)
              return (
                <article key={row.id} className="access-control-card access-control-history-item">
                  <button
                    type="button"
                    className="access-control-history-item__header"
                    aria-expanded={open}
                    onClick={() => setExpandedHistoryId(open ? null : row.id)}
                  >
                    <div className="access-control-history-item__main">
                      <strong>{row.title}</strong>
                      <span className="muted">
                        {formatChangeTime(row.occurred_at)}
                        {row.actor?.email ? ` · ${row.actor.email}` : ''}
                        {row.scope === 'user' && row.target_user?.email
                          ? ` · target ${row.target_user.email}`
                          : row.scope === 'hub'
                            ? ' · hub'
                            : ''}
                      </span>
                      {row.change_summary ? (
                        <span className="access-control-history-item__summary">
                          {row.change_summary}
                        </span>
                      ) : null}
                    </div>
                    <span className="access-control-history-item__toggle muted">
                      {open ? 'Hide' : 'Details'}
                    </span>
                  </button>

                  {open ? (
                    <div className="access-control-history-item__body">
                      {changeKeys.length === 0 ? (
                        <p className="muted">No field-level details available.</p>
                      ) : (
                        <table className="access-control-history-table">
                          <thead>
                            <tr>
                              <th>Field</th>
                              <th>From</th>
                              <th>To</th>
                            </tr>
                          </thead>
                          <tbody>
                            {changeKeys.map((key) => (
                              <tr key={key}>
                                <td>{CHANGE_FIELD_LABELS[key] || key}</td>
                                <td>{formatChangeValue(changes[key]?.from)}</td>
                                <td>{formatChangeValue(changes[key]?.to)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      {row.can_restore ? (
                        <div className="access-control-history-item__restore">
                          {row.has_before ? (
                            <button
                              type="button"
                              className="btn primary"
                              disabled={restoringId === row.id}
                              onClick={() => restoreHistoryRow(row, 'before')}
                            >
                              {restoringId === row.id ? 'Restoring…' : 'Restore previous'}
                            </button>
                          ) : null}
                          {row.has_after ? (
                            <button
                              type="button"
                              className="btn ghost"
                              disabled={restoringId === row.id}
                              onClick={() => restoreHistoryRow(row, 'after')}
                            >
                              Restore this version
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
