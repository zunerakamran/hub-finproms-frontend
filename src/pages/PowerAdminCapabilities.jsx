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
  social_media_compliance: 'Social Media Compliance',
  general_compliance: 'General Compliance',
  website_compliance: 'Website Compliance',
}

export default function PowerAdminCapabilities() {
  const { canPower, setPowerCapabilities, refreshUser } = useAuth()
  const { refreshHub, actingHubId, actingHub, hub, isActingOnWhiteLabel } = useHub()
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

  const applyMatrix = (matrix, resolvedPower) => {
    setRoles(matrix.roles || [])
    setRows(matrix.rows || [])
    if (Array.isArray(matrix.group_order) && matrix.group_order.length > 0) {
      setGroupOrder(matrix.group_order)
    } else {
      setGroupOrder(DEFAULT_GROUP_ORDER)
    }
    if (resolvedPower) setPowerCapabilities(resolvedPower)
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

    // Keep API order, then append any unexpected groups in first-seen order.
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

  const onSave = async (e) => {
    e.preventDefault()
    if (!allowed || !selectedHubId) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const matrixPayload = {}
      for (const role of roles) {
        matrixPayload[role.key] = {}
      }
      for (const row of rows) {
        // Keep stored white-labelled hub caps when shared (inactive) — don't overwrite with false.
        if (row.inactive) continue
        for (const role of roles) {
          const cell = row.cells?.[role.key]
          if (cell?.applicable) {
            matrixPayload[role.key][row.key] = Boolean(cell.enabled)
          }
        }
      }

      const data = await api.updatePowerAdminCapabilitiesMatrix({
        hub_id: Number(selectedHubId),
        matrix: matrixPayload,
      })
      applyMatrix(data.matrix, data.resolved)
      setMessage(data.message || 'Capabilities matrix saved.')
      await refreshUser()
      await refreshHub()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="capabilities-matrix-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Platform</p>
          <h1>User capabilities</h1>
          <p className="muted">
            Editing roles for <strong>{selectedHubName}</strong>
            {isActingOnWhiteLabel ? ' (white-labelled)' : ' (shared)'}. Use{' '}
            <strong>Control hub</strong> in the top bar to switch hubs. Hub Functionalities are
            configured separately under Hub checklists.
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
        <form onSubmit={onSave}>
          <div className="matrix-toolbar">
            <label className="matrix-search">
              Search capabilities
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. firms, advisors, social media…"
              />
            </label>
            {groupedRows.length > 0 && (
              <nav className="matrix-jump" aria-label="Jump to capability section">
                {groupedRows.map((section) => (
                  <a key={section.group} href={`#matrix-${section.group}`}>
                    {section.shortLabel || section.label}
                  </a>
                ))}
              </nav>
            )}
          </div>

          {groupedRows.length === 0 ? (
            <div className="empty-state">
              <h2>No capabilities match</h2>
              <p className="muted">Try a different search term.</p>
            </div>
          ) : (
            groupedRows.map((section) => {
              const isCollapsed = Boolean(collapsed[section.group]) && !query.trim()
              return (
                <div
                  key={section.group}
                  id={`matrix-${section.group}`}
                  className="checklist-section matrix-section"
                >
                  <div className="matrix-section-head">
                    <h2>{section.label}</h2>
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
                    <div className="matrix-wrap">
                      <table className="capabilities-matrix">
                        <thead>
                          <tr>
                            <th className="matrix-capability-col">Capability</th>
                            {roles.map((role) => (
                              <th key={role.key} title={role.key}>
                                {role.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.map((row) => (
                            <tr
                              key={row.key}
                              className={row.inactive ? 'matrix-row-inactive' : undefined}
                              title={
                                row.inactive ? inactiveReasonTitle(row.inactive_reason) : undefined
                              }
                            >
                              <td className="matrix-capability-col">
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
                              </td>
                              {roles.map((role) => {
                                const cell = row.cells?.[role.key]
                                const applicable = Boolean(cell?.applicable)
                                return (
                                  <td
                                    key={role.key}
                                    className={[
                                      applicable ? '' : 'matrix-na',
                                      row.inactive ? 'matrix-cell-inactive' : '',
                                    ]
                                      .filter(Boolean)
                                      .join(' ')}
                                  >
                                    {applicable ? (
                                      <input
                                        type="checkbox"
                                        checked={Boolean(cell?.enabled)}
                                        disabled={
                                          !allowed ||
                                          row.inactive ||
                                          (role.key === 'power_admin' &&
                                            row.key === 'pa_manage_power_capabilities')
                                        }
                                        aria-label={`${row.label} for ${role.label}`}
                                        onChange={(e) =>
                                          setCell(row.key, role.key, e.target.checked)
                                        }
                                      />
                                    ) : (
                                      <span className="matrix-dash">—</span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })
          )}

          {allowed && (
            <div className="actions">
              <button className="btn primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save capabilities'}
              </button>
            </div>
          )}
        </form>
      )}
    </section>
  )
}
