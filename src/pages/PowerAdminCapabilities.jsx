import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'
import {
  inactiveReasonHint,
  inactiveReasonLabel,
  inactiveReasonTitle,
} from '../utils/socialMediaCompliance'

const GROUP_ORDER = [
  'power_admin',
  'member',
  'general',
  'dashboard',
  'admin_emails',
  'social_media_compliance',
  'general_compliance',
  'website_compliance',
]

export default function PowerAdminCapabilities() {
  const { canPower, setPowerCapabilities, refreshUser } = useAuth()
  const { refreshHub, actingHubId, actingHub, hub, isActingOnWhiteLabel } = useHub()
  const allowed = canPower('pa_manage_power_capabilities')

  const selectedHubId = actingHubId || hub?.id || ''
  const selectedHubName = actingHub?.name || hub?.name || 'this hub'

  const [roles, setRoles] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const applyMatrix = (matrix, resolvedPower) => {
    setRoles(matrix.roles || [])
    setRows(matrix.rows || [])
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
          <p className="eyebrow">Power Admin</p>
          <h1>User capabilities</h1>
          <p className="muted">
            Editing roles for <strong>{selectedHubName}</strong>
            {isActingOnWhiteLabel ? ' (white-label)' : ' (shared)'}. Use{' '}
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
                        title={row.inactive ? inactiveReasonTitle(row.inactive_reason) : undefined}
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
