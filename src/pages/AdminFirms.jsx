import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useHub } from '../context/HubContext'

const emptyForm = {
  name: '',
  compliance_visible_to_own: true,
  compliance_visible_to_central: false,
  compliance_visible_to_firm_id: '',
}

function visibilityFromFirm(firm) {
  const vis = firm?.compliance_visibility || {}
  return {
    name: firm?.name || '',
    compliance_visible_to_own: vis.visible_to_own !== false,
    compliance_visible_to_central: Boolean(vis.visible_to_central),
    compliance_visible_to_firm_id: vis.visible_to_firm_id ? String(vis.visible_to_firm_id) : '',
  }
}

export default function AdminFirms({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const { actingHubId, isActingOnWhiteLabel, actingHub } = useHub()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const apiOpts = { asPowerAdmin }

  const [firms, setFirms] = useState([])
  const [centralFirmId, setCentralFirmId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const otherFirmOptions = useMemo(
    () => firms.filter((f) => !f.is_central && f.id !== editingId),
    [firms, editingId]
  )

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.listFirms(apiOpts)
      setFirms(data.firms || [])
      setCentralFirmId(data.central_firm_id ?? null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    setEditingId(null)
    setForm(emptyForm)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingHubId])

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const startEdit = (firm) => {
    setEditingId(firm.id)
    setForm(visibilityFromFirm(firm))
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        name: form.name.trim(),
        compliance_visible_to_own: Boolean(form.compliance_visible_to_own),
        compliance_visible_to_central: Boolean(form.compliance_visible_to_central),
        compliance_visible_to_firm_id: form.compliance_visible_to_firm_id
          ? Number(form.compliance_visible_to_firm_id)
          : null,
      }

      if (editingId) {
        const data = await api.updateFirm(editingId, payload, apiOpts)
        setMessage(data.message || 'Firm updated.')
      } else {
        const data = await api.createFirm(payload, apiOpts)
        setMessage(data.message || 'Firm created.')
      }
      resetForm()
      await load()
    } catch (err) {
      setError(err.data?.errors?.name?.[0] || err.data?.message || err.message)
    } finally {
      setSaving(false)
    }
  }

  const editingFirm = firms.find((f) => f.id === editingId)
  const isEditingCentral = Boolean(editingFirm?.is_central)

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>{editingId ? (isEditingCentral ? 'Edit Central / Network' : 'Edit firm') : 'Firms'}</h1>
          <p className="muted">
            {isActingOnWhiteLabel
              ? `Managing firms on ${actingHub?.name}. Switch hubs from the top bar.`
              : 'Manage firms and who may review, approve, and see reports for each firm’s compliance requests. Public registration does not ask for a firm.'}
          </p>
        </div>
      </div>

      <form className="admin-form" onSubmit={onSubmit}>
        {error && <div className="alert">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        <label>
          {isEditingCentral ? 'Central / Network name' : 'Firm name'}
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={isEditingCentral ? 'Enter Central / Network name' : 'Enter firm name'}
          />
        </label>

        <fieldset style={{ border: '1px solid var(--border, #ddd)', borderRadius: 8, padding: '1rem', marginTop: '1rem' }}>
          <legend style={{ padding: '0 0.35rem' }}>Compliance visibility</legend>
          <p className="muted" style={{ marginTop: 0 }}>
            Choose who can review, approve, and see reports for requests submitted by users of this firm.
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.compliance_visible_to_own}
              onChange={(e) => setForm((f) => ({ ...f, compliance_visible_to_own: e.target.checked }))}
            />
            Own firm
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.compliance_visible_to_central}
              onChange={(e) =>
                setForm((f) => ({ ...f, compliance_visible_to_central: e.target.checked }))
              }
            />
            Central / Network firm
          </label>
          <label>
            Another firm
            <select
              value={form.compliance_visible_to_firm_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, compliance_visible_to_firm_id: e.target.value }))
              }
            >
              <option value="">None</option>
              {otherFirmOptions.map((firm) => (
                <option key={firm.id} value={firm.id}>
                  {firm.name}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <div className="actions">
          <button className="btn primary" disabled={saving}>
            {saving
              ? 'Saving...'
              : editingId
                ? isEditingCentral
                  ? 'Update Central / Network'
                  : 'Update firm'
                : isActingOnWhiteLabel
                  ? `Add firm on ${actingHub?.name || 'hub'}`
                  : 'Add firm'}
          </button>
          {editingId && (
            <button type="button" className="btn ghost" onClick={resetForm}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 className="section-title">
        {isActingOnWhiteLabel ? `Firms on ${actingHub?.name}` : 'Existing firms'}
      </h2>
      {loading ? (
        <div className="state">Loading...</div>
      ) : firms.length === 0 ? (
        <div className="empty-state">
          <h2>No firms yet</h2>
          <p className="muted">Add a firm above. The Central / Network firm is created automatically.</p>
        </div>
      ) : (
        <div className="admin-list">
          {firms.map((firm) => {
            const vis = firm.compliance_visibility || {}
            const bits = []
            if (vis.visible_to_own) bits.push('own')
            if (vis.visible_to_central) bits.push('central/network')
            if (vis.visible_to_firm?.name) bits.push(vis.visible_to_firm.name)
            return (
              <div key={firm.id} className="admin-row">
                <div>
                  <strong>
                    {firm.name}
                    {firm.is_central || firm.id === centralFirmId ? (
                      <span className="muted"> · Central / Network</span>
                    ) : null}
                  </strong>
                  <div className="muted" style={{ fontSize: '0.9em' }}>
                    {firm.users_count || 0} user{(firm.users_count || 0) === 1 ? '' : 's'}
                    {bits.length ? ` · Visible to: ${bits.join(', ')}` : ' · No compliance visibility set'}
                  </div>
                </div>
                <div className="actions">
                  <button className="btn ghost" onClick={() => startEdit(firm)}>
                    Edit
                  </button>
                  {!firm.is_central && firm.id !== centralFirmId ? (
                    <button
                      className="btn danger"
                      onClick={async () => {
                        if (!window.confirm(`Delete firm “${firm.name}”?`)) return
                        try {
                          await api.deleteFirm(firm.id, apiOpts)
                          if (editingId === firm.id) resetForm()
                          await load()
                        } catch (err) {
                          setError(err.message)
                        }
                      }}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
