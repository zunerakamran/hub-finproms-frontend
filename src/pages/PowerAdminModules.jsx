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
  if (item.locked_reason === 'shared_hub') {
    return 'Always enabled on the shared hub (cannot be turned off). Other modules depend on this.'
  }
  if (item.locked_reason === 'white_label_hub') {
    return 'Always enabled on white-labelled hubs (cannot be turned off). Other modules depend on this.'
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

export default function PowerAdminModules() {
  const { isPowerAdmin } = useAuth()
  const { actingHubId, actingHub, hub, isActingOnWhiteLabel, refreshHub, can, loading: hubLoading } =
    useHub()

  const selectedId = actingHubId || hub?.id || ''
  const selectedName = actingHub?.name || hub?.name || 'this hub'
  const asPowerAdmin = isPowerAdmin
  const enabled = can('dashboard_manage_modules')

  const [modules, setModules] = useState([])
  const [flags, setFlags] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const labelByKey = useMemo(() => {
    const map = {}
    for (const row of modules) map[row.key] = row.label
    return map
  }, [modules])

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
        const rows = data.modules || []
        setModules(rows)
        const next = {}
        for (const row of rows) next[row.key] = Boolean(row.enabled)
        setFlags(next)
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

  const onSave = async (e) => {
    e.preventDefault()
    if (!selectedId) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      // Omit locked modules from the payload — backend enforces type locks + deps.
      const payload = {}
      for (const row of modules) {
        if (row.locked) continue
        payload[row.key] = Boolean(flags[row.key]) && dependenciesMet(row, flags)
      }
      const data = await api.updateHubModules(
        { hub_id: selectedId, modules: payload },
        { asPowerAdmin }
      )
      const rows = data.modules || []
      setModules(rows)
      const next = {}
      for (const row of rows) next[row.key] = Boolean(row.enabled)
      setFlags(next)
      setMessage(data.message || 'Modules updated.')
      await refreshHub({ silent: true })
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
            {isActingOnWhiteLabel ? ' (white-labelled)' : ' (shared)'}. Related Capabilities stay
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
          <div className="checklist-section" id="modules">
            <h2>Modules</h2>
            <p className="muted checklist-section-hint">
              Module 1 is the hub base ({isActingOnWhiteLabel ? 'White Label Hub' : 'Shared Hub'}) and
              is always on. Other modules are gated by dependencies: Social Media Pre Approval needs
              the Social Media Template Library; Website Content Pre Approval needs the Website
              Template Library. Turning a parent off cascades to its dependents.
            </p>
            <div className="checklist-grid">
              {modules.map((item) => {
                const depsOk = dependenciesMet(item, flags)
                const isLocked = Boolean(item.locked) || !item.available
                const depsBlocked = !isLocked && !depsOk
                const disabled = isLocked || !depsOk
                const hint = lockedHint(item) || (!depsOk ? dependencyHint(item, labelByKey) : null)
                // Locked base modules (Shared / White Label Hub) stay checked and editable=false,
                // but are not dimmed/blurred.
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
                        {item.locked
                          ? ' (always on)'
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
