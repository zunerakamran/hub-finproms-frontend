import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const GROUP_ORDER = ['power_admin', 'member', 'general', 'dashboard']

export default function PowerAdminCapabilities() {
  const { canPower, setPowerCapabilities, refreshUser } = useAuth()
  const { refreshHub } = useHub()
  const allowed = canPower('pa_manage_power_capabilities')

  const [hubs, setHubs] = useState([])
  const [hubId, setHubId] = useState('')
  const [roles, setRoles] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const applyMatrix = (matrix, resolvedPower) => {
    setRoles(matrix.roles || [])
    setRows(matrix.rows || [])
    if (matrix.hub?.id) setHubId(String(matrix.hub.id))
    if (resolvedPower) setPowerCapabilities(resolvedPower)
  }

  const load = async (selectedHubId = hubId) => {
    setLoading(true)
    setError('')
    try {
      const data = await api.powerAdminCapabilitiesMatrix(selectedHubId || undefined)
      setHubs(data.hubs || [])
      applyMatrix(data.matrix, data.resolved)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const groupedRows = useMemo(() => {
    const groups = GROUP_ORDER.map((group) => ({
      group,
      label: rows.find((r) => r.group === group)?.group_label || group,
      rows: rows.filter((r) => r.group === group),
    })).filter((g) => g.rows.length > 0)

    const known = new Set(GROUP_ORDER)
    for (const row of rows) {
      if (!known.has(row.group) && !groups.find((g) => g.group === row.group)) {
        groups.push({
          group: row.group,
          label: row.group_label || row.group,
          rows: rows.filter((r) => r.group === row.group),
        })
      }
    }
    return groups
  }, [rows])

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

  const onSave = async (e) => {
    e.preventDefault()
    if (!allowed || !hubId) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const matrixPayload = {}
      for (const role of roles) {
        matrixPayload[role.key] = {}
      }
      for (const row of rows) {
        // Keep stored private-hub caps when public (inactive) — don't overwrite with false.
        if (row.inactive) continue
        for (const role of roles) {
          const cell = row.cells?.[role.key]
          if (cell?.applicable) {
            matrixPayload[role.key][row.key] = Boolean(cell.enabled)
          }
        }
      }

      const data = await api.updatePowerAdminCapabilitiesMatrix({
        hub_id: Number(hubId),
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

  const onHubChange = async (id) => {
    setHubId(id)
    await load(id)
  }

  return (
    <section className="capabilities-matrix-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Power Admin</p>
          <h1>User capabilities</h1>
          <p className="muted">
            What each role can do on the selected hub (users and hub admins), plus Power Admin
            platform tools. User rows (browse catalog, purchases, etc.) and hub-admin dashboard
            rows apply to every role column — remaining roles (approver, advisor, user) get
            dashboard tools only when you enable them. Hub Functionalities are configured
            separately under Hub checklists.
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

      <label className="hub-select-label">
        Hub
        <select value={hubId} onChange={(e) => onHubChange(e.target.value)} disabled={loading}>
          {hubs.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} ({h.type === 'shared' ? 'shared' : 'white-label'})
            </option>
          ))}
        </select>
      </label>

      {loading ? (
        <div className="state">Loading matrix...</div>
      ) : (
        <form onSubmit={onSave}>
          {groupedRows.map((section) => (
            <div key={section.group} className="checklist-section matrix-section">
              <h2>{section.label}</h2>
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
                          row.inactive
                            ? row.inactive_reason === 'public_only'
                              ? 'Public hub only — inactive while this hub is private'
                              : 'Private hub only — inactive while this hub is public'
                            : undefined
                        }
                      >
                        <td className="matrix-capability-col">
                          <strong>
                            {row.label}
                            {row.inactive && (
                              <span className="matrix-inactive-badge">
                                {row.inactive_reason === 'public_only' ? 'Public only' : 'Private only'}
                              </span>
                            )}
                          </strong>
                          <small className="muted">
                            {row.inactive
                              ? row.inactive_reason === 'public_only'
                                ? 'Inactive while the hub is private. Turn on Public subscribe to use this.'
                                : 'Inactive while the hub is public. Turn on Private invite-only to use this.'
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
                                  onChange={(e) => setCell(row.key, role.key, e.target.checked)}
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
            </div>
          ))}

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
