import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import {
  inactiveReasonHint,
  inactiveReasonLabel,
  inactiveReasonTitle,
} from '../utils/socialMediaCompliance'

const DEFAULT_GROUP_ORDER = [
  'power_admin',
  'member',
  'general',
  'dashboard_content',
  'dashboard_firms',
  'dashboard_advisors',
  'dashboard_hub',
  'dashboard',
  'admin_emails',
  'social_media_compliance',
  'general_compliance',
  'website_template_library',
  'website_compliance',
]

const GROUP_FALLBACK_LABELS = {
  power_admin: 'Power Admin (platform)',
  member: 'Member catalog',
  general: 'Member personal dashboard',
  dashboard_content: 'Content catalog',
  dashboard_firms: 'Firms',
  dashboard_advisors: 'Advisors & private billing',
  dashboard_hub: 'Hub operations',
  dashboard: 'Hub-admin dashboard',
  admin_emails: 'Admin emails',
  social_media_compliance: 'Social Media Pre Approval',
  general_compliance: 'Generic Content Pre Approval',
  website_template_library: 'Website Template Library',
  website_compliance: 'Website Content Pre Approval',
}

function shortRoleLabel(label, key) {
  const text = String(label || key || '').trim()
  if (text.length <= 18) return text
  const parts = text.split(/\s+/)
  if (parts.length >= 2) {
    return parts.map((p) => p[0]?.toUpperCase() || '').join('') || text.slice(0, 16)
  }
  return `${text.slice(0, 14)}…`
}

function roleHint(role) {
  if ((role.added_to_hub || role.added_to_all_hubs) && !role.present_on_hub) {
    return 'Added to this hub (no users hold it yet)'
  }
  return role.key
}

export default function PowerAdminCapabilities() {
  const { canPower, setPowerCapabilities } = useAuth()
  const { actingHubId, actingHub, hub, isActingOnWhiteLabel, isActingRemotely } = useHub()
  const allowed = canPower('pa_manage_power_capabilities')

  const selectedHubId = actingHubId || hub?.id || ''
  const selectedHubName = actingHub?.name || hub?.name || 'this hub'

  const [roles, setRoles] = useState([])
  const [rows, setRows] = useState([])
  const [groupOrder, setGroupOrder] = useState(DEFAULT_GROUP_ORDER)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const [viewMode, setViewMode] = useState('capability') // capability | role
  const [activeRoleKey, setActiveRoleKey] = useState('')
  const [visibleRoleKeys, setVisibleRoleKeys] = useState(null) // null = all

  const applyMatrix = (matrix, resolvedPower) => {
    const nextRoles = matrix.roles || []
    setRoles(nextRoles)
    setRows(matrix.rows || [])
    if (Array.isArray(matrix.group_order) && matrix.group_order.length > 0) {
      setGroupOrder(matrix.group_order)
    } else {
      setGroupOrder(DEFAULT_GROUP_ORDER)
    }
    if (resolvedPower) setPowerCapabilities(resolvedPower)
    setActiveRoleKey((prev) => {
      if (prev && nextRoles.some((r) => r.key === prev)) return prev
      return nextRoles[0]?.key || ''
    })
    setVisibleRoleKeys(null)
  }

  const load = async (hubId = selectedHubId) => {
    if (!hubId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const data = await api.powerAdminCapabilitiesMatrix(hubId)
      applyMatrix(data.matrix, data.resolved)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(selectedHubId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHubId])

  const displayedRoles = useMemo(() => {
    if (viewMode === 'role') return roles
    if (!visibleRoleKeys) return roles
    const allowedKeys = new Set(visibleRoleKeys)
    return roles.filter((r) => allowedKeys.has(r.key))
  }, [roles, visibleRoleKeys, viewMode])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const hay = `${row.label || ''} ${row.description || ''} ${row.key || ''} ${row.group_label || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, query])

  const groupedRows = useMemo(() => {
    const order =
      groupOrder.length > 0
        ? groupOrder
        : DEFAULT_GROUP_ORDER.filter((g) => filteredRows.some((r) => r.group === g))

    const seen = new Set()
    const orderedKeys = []
    for (const group of order) {
      if (!seen.has(group) && filteredRows.some((r) => r.group === group)) {
        orderedKeys.push(group)
        seen.add(group)
      }
    }
    for (const row of filteredRows) {
      if (!seen.has(row.group)) {
        orderedKeys.push(row.group)
        seen.add(row.group)
      }
    }

    return orderedKeys.map((group, index) => {
      const sectionRows = filteredRows.filter((r) => r.group === group)
      const baseLabel =
        sectionRows[0]?.group_label || GROUP_FALLBACK_LABELS[group] || group
      return {
        group,
        label: `${index + 1}. ${baseLabel}`,
        shortLabel: baseLabel,
        rows: sectionRows,
      }
    })
  }, [filteredRows, groupOrder])

  const activeRole = useMemo(
    () => roles.find((r) => r.key === activeRoleKey) || roles[0] || null,
    [roles, activeRoleKey]
  )

  const enabledCountForRole = useMemo(() => {
    if (!activeRole) return 0
    return rows.reduce((count, row) => {
      const cell = row.cells?.[activeRole.key]
      return count + (cell?.applicable && cell?.enabled && !row.inactive ? 1 : 0)
    }, 0)
  }, [rows, activeRole])

  const applicableCountForRole = useMemo(() => {
    if (!activeRole) return 0
    return rows.reduce((count, row) => {
      const cell = row.cells?.[activeRole.key]
      return count + (cell?.applicable && !row.inactive ? 1 : 0)
    }, 0)
  }, [rows, activeRole])

  const setCell = (capabilityKey, roleKey, enabled) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== capabilityKey || row.inactive) return row
        const cells = { ...row.cells }
        if (!cells[roleKey]?.applicable) return row
        cells[roleKey] = { ...cells[roleKey], enabled }
        return { ...row, cells }
      })
    )
  }

  const toggleSection = (group) => {
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  const expandAll = () => setCollapsed({})
  const collapseAll = () => {
    const next = {}
    for (const section of groupedRows) next[section.group] = true
    setCollapsed(next)
  }

  const toggleVisibleRole = (roleKey) => {
    setVisibleRoleKeys((prev) => {
      const current = prev ?? roles.map((r) => r.key)
      const set = new Set(current)
      if (set.has(roleKey)) {
        if (set.size <= 1) return current
        set.delete(roleKey)
      } else {
        set.add(roleKey)
      }
      const next = roles.map((r) => r.key).filter((k) => set.has(k))
      return next.length === roles.length ? null : next
    })
  }

  const showAllRoles = () => setVisibleRoleKeys(null)

  const setAllForRoleInSection = (sectionRows, roleKey, enabled) => {
    const keys = new Set(
      sectionRows
        .filter((row) => {
          if (row.inactive) return false
          if (roleKey === 'power_admin' && row.key === 'pa_manage_power_capabilities') return false
          return Boolean(row.cells?.[roleKey]?.applicable)
        })
        .map((row) => row.key)
    )
    if (keys.size === 0) return
    setRows((prev) =>
      prev.map((row) => {
        if (!keys.has(row.key)) return row
        const cells = { ...row.cells }
        cells[roleKey] = { ...cells[roleKey], enabled }
        return { ...row, cells }
      })
    )
  }

  const onSave = async (e) => {
    e.preventDefault()
    if (!allowed || !selectedHubId || saving) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const matrixPayload = {}
      for (const role of roles) {
        matrixPayload[role.key] = {}
      }
      for (const row of rows) {
        if (row.inactive) continue
        for (const role of roles) {
          const cell = row.cells?.[role.key]
          if (cell?.applicable) {
            matrixPayload[role.key][row.key] = Boolean(cell.enabled)
          }
        }
      }

      await api.updatePowerAdminCapabilitiesMatrix({
        hub_id: Number(selectedHubId),
        matrix: matrixPayload,
      })
      window.location.reload()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const hubTypeLabel = isActingRemotely
    ? isActingOnWhiteLabel
      ? 'white-labelled'
      : 'shared'
    : hub?.type === 'central' || hub?.is_central || hub?.is_control_plane
      ? 'Central Hub'
      : 'shared'

  const renderRoleToggle = (row, role) => {
    const cell = row.cells?.[role.key]
    const applicable = Boolean(cell?.applicable)
    const enabled = Boolean(cell?.enabled)
    const locked =
      !allowed ||
      row.inactive ||
      (role.key === 'power_admin' && row.key === 'pa_manage_power_capabilities')

    if (!applicable) {
      return (
        <span
          key={role.key}
          className="matrix-role-chip matrix-role-chip--na"
          title={`${role.label} — not applicable`}
        >
          <span className="matrix-role-chip__label">{shortRoleLabel(role.label, role.key)}</span>
          <span className="matrix-role-chip__state" aria-hidden="true">
            —
          </span>
        </span>
      )
    }

    return (
      <label
        key={role.key}
        className={[
          'matrix-role-chip',
          enabled ? 'matrix-role-chip--on' : '',
          locked ? 'matrix-role-chip--locked' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        title={`${role.label}${locked ? ' (locked)' : ''}`}
      >
        <input
          type="checkbox"
          checked={enabled}
          disabled={locked}
          aria-label={`${row.label} for ${role.label}`}
          onChange={(e) => setCell(row.key, role.key, e.target.checked)}
        />
        <span className="matrix-role-chip__label">{shortRoleLabel(role.label, role.key)}</span>
        <span className="matrix-role-chip__mark" aria-hidden="true">
          {enabled ? '✓' : ''}
        </span>
      </label>
    )
  }

  return (
    <section className="capabilities-matrix-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Platform</p>
          <h1>User capabilities</h1>
          <p className="muted">
            Editing roles for <strong>{selectedHubName}</strong> ({hubTypeLabel}). Columns are roles
            present on this hub (or added under <strong>Manage roles</strong>). Hub Functionalities
            are configured separately under Hub checklists.
            {(hub?.type === 'central' || hub?.is_central || hub?.is_control_plane) && (
              <>
                {' '}
                The dashboard <strong>Website</strong> button follows{' '}
                <strong>View website pages (outside Dashboard)</strong> for Power Admin / FinProms
                Admin on Central (even if another hub is selected in the switcher).
              </>
            )}
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {!allowed && (
        <div className="alert">
          You can view the matrix but cannot save changes (manage capabilities is off).
        </div>
      )}

      {!selectedHubId ? (
        <div className="state">Waiting for hub context…</div>
      ) : loading ? (
        <div className="state">Loading matrix...</div>
      ) : (
        <form onSubmit={onSave} className="matrix-form">
          <div className="matrix-toolbar">
            <div className="matrix-toolbar__top">
              <label className="matrix-search">
                Search capabilities
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. firms, website, reports…"
                />
              </label>

              <div className="matrix-view-toggle" role="tablist" aria-label="Matrix view">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'capability'}
                  className={viewMode === 'capability' ? 'is-active' : ''}
                  onClick={() => setViewMode('capability')}
                >
                  By capability
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'role'}
                  className={viewMode === 'role' ? 'is-active' : ''}
                  onClick={() => setViewMode('role')}
                >
                  By role
                </button>
              </div>
            </div>

            {viewMode === 'capability' && roles.length > 0 && (
              <div className="matrix-role-filter">
                <div className="matrix-role-filter__head">
                  <span>
                    Show roles
                    {visibleRoleKeys
                      ? ` (${visibleRoleKeys.length} of ${roles.length})`
                      : ` (all ${roles.length})`}
                  </span>
                  {visibleRoleKeys && (
                    <button type="button" className="btn ghost matrix-link-btn" onClick={showAllRoles}>
                      Show all
                    </button>
                  )}
                </div>
                <div className="matrix-role-filter__list" role="group" aria-label="Visible roles">
                  {roles.map((role) => {
                    const on = !visibleRoleKeys || visibleRoleKeys.includes(role.key)
                    return (
                      <button
                        key={role.key}
                        type="button"
                        className={`matrix-filter-chip ${on ? 'is-on' : ''}`}
                        title={roleHint(role)}
                        aria-pressed={on}
                        onClick={() => toggleVisibleRole(role.key)}
                      >
                        {role.label}
                      </button>
                    )
                  })}
                </div>
                <p className="matrix-role-filter__hint muted">
                  Tip: hide roles you are not editing so each capability stays readable. No horizontal
                  scrolling — role toggles wrap under each capability.
                </p>
              </div>
            )}

            {viewMode === 'role' && roles.length > 0 && (
              <div className="matrix-role-picker">
                <div className="matrix-role-picker__head">
                  <span>Select a role to edit</span>
                  {activeRole && (
                    <span className="muted">
                      {enabledCountForRole} / {applicableCountForRole} enabled
                    </span>
                  )}
                </div>
                <div className="matrix-role-picker__list" role="listbox" aria-label="Roles">
                  {roles.map((role) => (
                    <button
                      key={role.key}
                      type="button"
                      role="option"
                      aria-selected={activeRole?.key === role.key}
                      className={`matrix-role-pick ${activeRole?.key === role.key ? 'is-active' : ''}`}
                      title={roleHint(role)}
                      onClick={() => setActiveRoleKey(role.key)}
                    >
                      <strong>{role.label}</strong>
                      {(role.added_to_hub || role.added_to_all_hubs) && !role.present_on_hub ? (
                        <small>added</small>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {groupedRows.length > 0 && (
              <div className="matrix-toolbar__bottom">
                <nav className="matrix-jump" aria-label="Jump to capability section">
                  {groupedRows.map((section) => (
                    <a key={section.group} href={`#matrix-${section.group}`}>
                      {section.shortLabel || section.label}
                    </a>
                  ))}
                </nav>
                <div className="matrix-section-actions">
                  <button type="button" className="btn ghost" onClick={expandAll}>
                    Expand all
                  </button>
                  <button type="button" className="btn ghost" onClick={collapseAll}>
                    Collapse all
                  </button>
                </div>
              </div>
            )}
          </div>

          {roles.length === 0 ? (
            <div className="empty-state">
              <h2>No roles on this hub yet</h2>
              <p className="muted">
                Create users with roles, or open <strong>Manage roles</strong> to add a role column
                before anyone is assigned.
              </p>
            </div>
          ) : groupedRows.length === 0 ? (
            <div className="empty-state">
              <h2>No capabilities match</h2>
              <p className="muted">Try a different search term.</p>
            </div>
          ) : viewMode === 'capability' ? (
            groupedRows.map((section) => {
              const isCollapsed = Boolean(collapsed[section.group]) && !query.trim()
              return (
                <div
                  key={section.group}
                  id={`matrix-${section.group}`}
                  className="checklist-section matrix-section"
                >
                  <div className="matrix-section-head">
                    <div>
                      <h2>{section.label}</h2>
                      <p className="muted matrix-section-count">
                        {section.rows.length} capacit{section.rows.length === 1 ? 'y' : 'ies'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => toggleSection(section.group)}
                      aria-expanded={!isCollapsed}
                    >
                      {isCollapsed ? 'Expand' : 'Collapse'}
                    </button>
                  </div>
                  {!isCollapsed && (
                    <div className="matrix-card-list">
                      {section.rows.map((row) => (
                        <article
                          key={row.key}
                          className={`matrix-cap-card ${row.inactive ? 'is-inactive' : ''}`}
                          title={
                            row.inactive ? inactiveReasonTitle(row.inactive_reason) : undefined
                          }
                        >
                          <header className="matrix-cap-card__head">
                            <div className="matrix-cap-card__title">
                              <strong>
                                {row.label}
                                {row.inactive && (
                                  <span className="matrix-inactive-badge">
                                    {inactiveReasonLabel(row.inactive_reason)}
                                  </span>
                                )}
                              </strong>
                              <small className="muted">
                                {row.inactive
                                  ? inactiveReasonHint(row.inactive_reason)
                                  : row.description}
                              </small>
                            </div>
                          </header>
                          <div
                            className="matrix-role-chips"
                            role="group"
                            aria-label={`Roles for ${row.label}`}
                          >
                            {displayedRoles.map((role) => renderRoleToggle(row, role))}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            groupedRows.map((section) => {
              const isCollapsed = Boolean(collapsed[section.group]) && !query.trim()
              const roleKey = activeRole?.key
              if (!roleKey) return null
              const sectionApplicable = section.rows.filter(
                (row) => !row.inactive && row.cells?.[roleKey]?.applicable
              )
              return (
                <div
                  key={section.group}
                  id={`matrix-${section.group}`}
                  className="checklist-section matrix-section"
                >
                  <div className="matrix-section-head">
                    <div>
                      <h2>{section.label}</h2>
                      <p className="muted matrix-section-count">
                        {sectionApplicable.length} applicable for {activeRole.label}
                      </p>
                    </div>
                    <div className="matrix-section-head__actions">
                      {allowed && sectionApplicable.length > 0 && (
                        <>
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => setAllForRoleInSection(section.rows, roleKey, true)}
                          >
                            Enable all
                          </button>
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => setAllForRoleInSection(section.rows, roleKey, false)}
                          >
                            Disable all
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => toggleSection(section.group)}
                        aria-expanded={!isCollapsed}
                      >
                        {isCollapsed ? 'Expand' : 'Collapse'}
                      </button>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <div className="matrix-role-checklist">
                      {section.rows.map((row) => {
                        const cell = row.cells?.[roleKey]
                        const applicable = Boolean(cell?.applicable)
                        const locked =
                          !allowed ||
                          row.inactive ||
                          (roleKey === 'power_admin' &&
                            row.key === 'pa_manage_power_capabilities')
                        return (
                          <label
                            key={row.key}
                            className={[
                              'matrix-role-check',
                              !applicable ? 'is-na' : '',
                              row.inactive ? 'is-inactive' : '',
                              cell?.enabled ? 'is-on' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            title={
                              row.inactive
                                ? inactiveReasonTitle(row.inactive_reason)
                                : applicable
                                  ? row.description
                                  : 'Not applicable for this role'
                            }
                          >
                            {applicable ? (
                              <input
                                type="checkbox"
                                checked={Boolean(cell?.enabled)}
                                disabled={locked}
                                onChange={(e) => setCell(row.key, roleKey, e.target.checked)}
                              />
                            ) : (
                              <span className="matrix-role-check__na" aria-hidden="true">
                                —
                              </span>
                            )}
                            <span className="matrix-role-check__body">
                              <strong>
                                {row.label}
                                {row.inactive && (
                                  <span className="matrix-inactive-badge">
                                    {inactiveReasonLabel(row.inactive_reason)}
                                  </span>
                                )}
                              </strong>
                              <small className="muted">
                                {row.inactive
                                  ? inactiveReasonHint(row.inactive_reason)
                                  : applicable
                                    ? row.description
                                    : 'Not applicable for this role'}
                              </small>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}

          {allowed && roles.length > 0 && (
            <div className="matrix-save-bar">
              <p className="muted">
                Changes apply to <strong>{selectedHubName}</strong> after save.
              </p>
              <button className="btn primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save capabilities'}
              </button>
            </div>
          )}
        </form>
      )}
    </section>
  )
}
