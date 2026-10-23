import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

/** Children that must turn off when a parent module is turned off. */
const MODULE_CHILDREN = {
  module_social_media_template_library: ['module_social_media_compliance'],
  module_website_template_library: ['module_website_compliance'],
}

function lockedHint(item) {
  if (!item.locked) return null
  if (item.locked_reason === 'central_hub') {
    return 'Always enabled on Central Hub Controller (cannot be turned off). This instance is control plane only - no content catalog modules.'
  }
  if (item.locked_reason === 'shared_hub') {
    return 'Always enabled on the shared hub (cannot be turned off). Other modules depend on this.'
  }
  if (item.locked_reason === 'white_label_hub') {
    return 'Always enabled on white-labelled hubs (cannot be turned off). Other modules depend on this.'
  }
  if (item.locked_reason === 'module_package') {
    const name = item.locked_by_package?.name || 'a module package'
    return `Included in package “${name}”. Turn the package off to select this module separately.`
  }
  return 'This module cannot be toggled for this hub.'
}

function dependencyHint(item, labelByKey) {
  if (!item.depends_on?.length) return null
  const names = item.depends_on.map((k) => labelByKey[k] || k)
  if (names.length === 1) {
    return `You can avail this module if you have ${names[0]}`
  }
  const last = names[names.length - 1]
  const rest = names.slice(0, -1).join(', ')
  return `You can avail this module if you have ${rest} and ${last}`
}

function cascadeFlags(prev, key, checked) {
  const next = { ...prev, [key]: checked }
  if (!checked) {
    const queue = [...(MODULE_CHILDREN[key] || [])]
    while (queue.length) {
      const child = queue.shift()
      next[child] = false
      for (const grand of MODULE_CHILDREN[child] || []) queue.push(grand)
    }
  }
  return next
}

function dependenciesMet(item, flags) {
  if (!item.depends_on?.length) return true
  return item.depends_on.every((dep) => Boolean(flags[dep]))
}

function formatMoney(amount, currency = 'gbp') {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: (currency || 'gbp').toUpperCase(),
    }).format(Number(amount || 0))
  } catch {
    return `£${Number(amount || 0).toFixed(2)}`
  }
}

export default function PowerAdminModules() {
  const { isPowerAdmin } = useAuth()
  const { actingHubId, actingHub, hub, isActingOnWhiteLabel, isActingRemotely, refreshHub, can, loading: hubLoading } =
    useHub()

  const selectedId = actingHubId || hub?.id || ''
  const selectedName = actingHub?.name || hub?.name || 'this hub'
  const asPowerAdmin = isPowerAdmin
  const enabled = can('dashboard_manage_modules')

  const [modules, setModules] = useState([])
  const [packages, setPackages] = useState([])
  const [flags, setFlags] = useState({})
  const [packageFlags, setPackageFlags] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const labelByKey = useMemo(() => {
    const map = {}
    for (const row of modules) map[row.key] = row.label
    return map
  }, [modules])

  const applyPayload = (data) => {
    const rows = data.modules || []
    const pkgs = data.packages || []
    setModules(rows)
    setPackages(pkgs)
    const next = {}
    for (const row of rows) next[row.key] = Boolean(row.enabled)
    setFlags(next)
    const nextPkgs = {}
    for (const pkg of pkgs) nextPkgs[pkg.id] = Boolean(pkg.enabled)
    setPackageFlags(nextPkgs)
  }

  useEffect(() => {
    if (hubLoading || !selectedId || !enabled) {
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      setMessage('')
      try {
        const data = await api.hubModules(
          { hub_id: selectedId },
          { asPowerAdmin }
        )
        if (cancelled) return
        applyPayload(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedId, hubLoading, enabled, asPowerAdmin])

  const onTogglePackage = (pkg, checked) => {
    setPackageFlags((prevPkgFlags) => {
      const nextPkgFlags = { ...prevPkgFlags, [pkg.id]: checked }
      // Optimistic local exclusivity: turning one package on clears overlapping packages.
      if (checked) {
        const covered = new Set(pkg.module_keys || [])
        for (const other of packages) {
          if (other.id === pkg.id) continue
          if (!prevPkgFlags[other.id]) continue
          const overlap = (other.module_keys || []).some((k) => covered.has(k))
          if (overlap) nextPkgFlags[other.id] = false
        }
      }

      setFlags((prevFlags) => {
        const nextFlags = { ...prevFlags }
        const keys = pkg.module_keys || []
        if (checked) {
          for (const key of keys) nextFlags[key] = true
        } else {
          // Turn off covered modules unless another still-enabled package covers them.
          const stillCovered = new Set()
          for (const other of packages) {
            if (!nextPkgFlags[other.id]) continue
            for (const key of other.module_keys || []) stillCovered.add(key)
          }
          for (const key of keys) {
            if (!stillCovered.has(key)) nextFlags[key] = false
          }
        }
        return nextFlags
      })

      return nextPkgFlags
    })
  }

  const onSave = async (e) => {
    e.preventDefault()
    if (!selectedId) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      // Omit locked modules from the payload - backend enforces type locks, packages + deps.
      const modulePayload = {}
      for (const row of modules) {
        if (row.locked) continue
        modulePayload[row.key] = Boolean(flags[row.key]) && dependenciesMet(row, flags)
      }
      const packagePayload = packages.map((pkg) => ({
        id: pkg.id,
        enabled: Boolean(packageFlags[pkg.id]),
      }))
      const data = await api.updateHubModules(
        {
          hub_id: selectedId,
          modules: modulePayload,
          packages: packagePayload,
        },
        { asPowerAdmin }
      )
      applyPayload(data)
      setMessage(data.message || 'Modules updated.')
      await refreshHub({ withLoader: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && !enabled) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Hub</p>
            <h1>Modules</h1>
            <p className="muted">
              Enable &quot;Manage hub modules&quot; for your role under Power Admin → Capabilities
              for this hub.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Modules</h1>
          <p className="muted">
            Enable product modules for <strong>{selectedName}</strong>
            {isActingRemotely
              ? isActingOnWhiteLabel
                ? ' (white-labelled)'
                : ' (shared)'
              : hub?.type === 'central' || hub?.is_central
                ? ' (Central Hub Controller)'
                : ' (shared)'}
            . Related Capabilities stay
            unavailable until a module is on. Who can open this screen is controlled by{' '}
            <strong>Manage hub modules</strong> in the Capabilities matrix.
          </p>
        </div>
        <Link to="/my-dashboard/capabilities" className="btn ghost">
          Capabilities
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {!selectedId ? (
        <div className="state">Waiting for hub context…</div>
      ) : loading ? (
        <div className="state">Loading modules...</div>
      ) : modules.length === 0 ? (
        <div className="empty-state">
          <h2>No modules returned</h2>
          <p className="muted">Restart the Laravel backend and refresh this page.</p>
        </div>
      ) : (
        <form className="admin-form checklist-form" onSubmit={onSave}>
          {packages.length > 0 && (
            <div className="checklist-section" id="module-packages">
              <h2>Module packages</h2>
              <p className="muted checklist-section-hint">
                Packages bundle several product modules at a single one-time price (set under Module
                prices). Enabling a package turns its modules on and locks them so they cannot be
                selected separately. Packages that share a module cannot both be on.
              </p>
              <div className="checklist-grid">
                {packages.map((pkg) => {
                  const checked = Boolean(packageFlags[pkg.id])
                  const conflictBlocked = !checked && pkg.available === false
                  const disabled = conflictBlocked
                  const moduleNames = (pkg.modules || [])
                    .map((m) => m.label)
                    .join(', ')
                  const hint = conflictBlocked
                    ? pkg.unavailable_reason ||
                      'One or more modules in this package are already covered by another enabled package.'
                    : null
                  return (
                    <label
                      key={pkg.id}
                      className={`checklist-item${conflictBlocked ? ' is-inactive' : ''}`}
                      title={hint || undefined}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) => onTogglePackage(pkg, e.target.checked)}
                      />
                      <span>
                        <strong>
                          {pkg.name}
                          {conflictBlocked ? ' (unavailable)' : ''}
                        </strong>
                        <small className="muted">
                          {pkg.description ||
                            (moduleNames
                              ? `Includes: ${moduleNames}`
                              : 'Bundled product modules')}
                        </small>
                        <small className="muted">
                          Package price: {formatMoney(pkg.amount, pkg.currency)}
                          {Number(pkg.individual_module_amount_sum) > 0
                            ? ` (individual sum ${formatMoney(pkg.individual_module_amount_sum, pkg.currency)})`
                            : ''}
                        </small>
                        {moduleNames && pkg.description ? (
                          <small className="muted">Includes: {moduleNames}</small>
                        ) : null}
                        {hint && <small className="muted exclusive-hint">{hint}</small>}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <div className="checklist-section" id="modules">
            <h2>Modules</h2>
            <p className="muted checklist-section-hint">
              {(hub?.type === 'central' || hub?.is_central) && !isActingRemotely
                ? 'Central Hub Controller is the locked base module for this control plane. Content product modules (posts library, compliance, websites) are managed on Shared / White-label hubs via the hub switcher.'
                : `Module 1 is the hub base (${isActingOnWhiteLabel || actingHub?.is_white_label ? 'White Label Hub' : 'Shared Hub'}) and is always on. Other modules are gated by dependencies: Social Media Pre Approval needs the Social Media Template Library; Website Content Pre Approval needs the Website Template Library. Turning a parent off cascades to its dependents. Modules included in an enabled package stay locked until that package is turned off.`}
            </p>
            <div className="checklist-grid">
              {modules.map((item) => {
                const depsOk = dependenciesMet(item, flags)
                const packageLocked = item.locked_reason === 'module_package'
                const isLocked = Boolean(item.locked) || !item.available
                const depsBlocked = !isLocked && !depsOk
                const disabled = isLocked || !depsOk
                const hint = lockedHint(item) || (!depsOk ? dependencyHint(item, labelByKey) : null)
                // Locked base / package modules stay checked and editable=false,
                // but base modules are not dimmed/blurred.
                const checked = isLocked
                  ? Boolean(flags[item.key])
                  : Boolean(flags[item.key]) && depsOk
                return (
                  <label
                    key={item.key}
                    className={`checklist-item${isLocked ? ' is-readonly' : ''}${depsBlocked ? ' is-inactive' : ''}`}
                    title={hint || undefined}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(e) =>
                        setFlags((prev) => cascadeFlags(prev, item.key, e.target.checked))
                      }
                    />
                    <span>
                      <strong>
                        {item.label}
                        {item.locked && !packageLocked
                          ? ' (always on)'
                          : packageLocked
                            ? ` (in package${item.locked_by_package?.name ? `: ${item.locked_by_package.name}` : ''})`
                            : !depsOk
                              ? ' (requires parent)'
                              : !item.available
                                ? ' (coming soon)'
                                : ''}
                      </strong>
                      <small className="muted">{item.description}</small>
                      {hint && <small className="muted exclusive-hint">{hint}</small>}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="actions">
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save modules'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
