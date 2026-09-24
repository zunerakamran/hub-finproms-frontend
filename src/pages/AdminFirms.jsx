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

const PER_PAGE = 25

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
  const [firmOptions, setFirmOptions] = useState([])
  const [centralFirmId, setCentralFirmId] = useState(null)
  const [meta, setMeta] = useState(null)
  const [q, setQ] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const otherFirmOptions = useMemo(
    () => firmOptions.filter((f) => !f.is_central && f.id !== editingId),
    [firmOptions, editingId]
  )

  const load = async (page = 1, search = q) => {
    setLoading(true)
    setError('')
    try {
      const data = await api.listFirms(
        {
          q: search || undefined,
          page,
          per_page: PER_PAGE,
        },
        apiOpts
      )
      setFirms(data.firms || [])
      setFirmOptions(data.firm_options || data.firms || [])
      setCentralFirmId(data.central_firm_id ?? null)
      setMeta(data.meta || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setQ('')
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    load(1, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingHubId])

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(false)
  }

  const startCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startEdit = (firm) => {
    setEditingId(firm.id)
    setForm(visibilityFromFirm(firm))
    setShowForm(true)
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
        resetForm()
        await load(meta?.current_page || 1)
      } else {
        const data = await api.createFirm(payload, apiOpts)
        setMessage(data.message || 'Firm created.')
        resetForm()
        setQ('')
        await load(1, '')
      }
    } catch (err) {
      setError(err.data?.errors?.name?.[0] || err.data?.message || err.message)
    } finally {
      setSaving(false)
    }
  }

  const editingFirm =
    firms.find((f) => f.id === editingId) || firmOptions.find((f) => f.id === editingId)
  const isEditingCentral = Boolean(
    editingFirm?.is_central || (editingId && editingId === centralFirmId)
  )

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>
            {showForm
              ? editingId
                ? isEditingCentral
                  ? 'Edit Central / Network'
                  : 'Edit Firm'
                : 'Add Firm'
              : 'Firms'}
          </h1>
          <p className="muted">
            {isActingOnWhiteLabel
              ? `Managing Firms on ${actingHub?.name}. Switch hubs from the top bar.`
              : 'Manage Firms and who may review, approve, and see reports for each Firm’s compliance requests. Public registration does not ask for a Firm.'}
          </p>
        </div>
        {!showForm ? (
          <button type="button" className="btn primary" onClick={startCreate}>
            {isActingOnWhiteLabel ? `Add Firm on ${actingHub?.name || 'hub'}` : 'Add Firm'}
          </button>
        ) : null}
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {showForm ? (
        <form className="admin-form" onSubmit={onSubmit}>
          <label>
            {isEditingCentral ? 'Central / Network name' : 'Firm name'}
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={isEditingCentral ? 'Enter Central / Network name' : 'Enter Firm name'}
            />
          </label>

          <fieldset
            style={{
              border: '1px solid var(--border, #ddd)',
              borderRadius: 8,
              padding: '1rem',
              marginTop: '1rem',
            }}
          >
            <legend style={{ padding: '0 0.35rem' }}>Compliance check authority</legend>
            <p className="muted" style={{ marginTop: 0 }}>
              Choose who can review, approve, and see reports for requests submitted by users of this
              Firm.
            </p>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.compliance_visible_to_own}
                onChange={(e) =>
                  setForm((f) => ({ ...f, compliance_visible_to_own: e.target.checked }))
                }
              />
              Within the Firm
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.compliance_visible_to_central}
                onChange={(e) =>
                  setForm((f) => ({ ...f, compliance_visible_to_central: e.target.checked }))
                }
              />
              Central / Network&apos;s
            </label>
            <label>
              Another Firm&apos;s
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
                    : 'Update Firm'
                  : isActingOnWhiteLabel
                    ? `Add Firm on ${actingHub?.name || 'hub'}`
                    : 'Add Firm'}
            </button>
            <button type="button" className="btn ghost" onClick={resetForm} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <form
            className="row"
            style={{ gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}
            onSubmit={(e) => {
              e.preventDefault()
              load(1)
            }}
          >
            <input
              type="search"
              placeholder="Search firms by name"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: '14rem', flex: '1 1 14rem' }}
            />
            <button type="submit" className="btn ghost">
              Search
            </button>
          </form>

          {loading ? (
            <div className="state">Loading...</div>
          ) : firms.length === 0 ? (
            <div className="empty-state">
              <h2>{q ? 'No Firms match your search' : 'No Firms yet'}</h2>
              <p className="muted">
                {q
                  ? 'Try a different search, or clear the search box.'
                  : 'Add a Firm to get started. The Central / Network Firm is created automatically.'}
              </p>
            </div>
          ) : (
            <div className="admin-list">
              {firms.map((firm) => {
                const vis = firm.compliance_visibility || {}
                const bits = []
                if (vis.visible_to_own) bits.push('Within the Firm')
                if (vis.visible_to_central) bits.push("Central / Network's")
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
                        {bits.length
                          ? ` · Check authority: ${bits.join(', ')}`
                          : ' · No compliance check authority set'}
                      </div>
                    </div>
                    <div className="actions">
                      <button type="button" className="btn ghost" onClick={() => startEdit(firm)}>
                        Edit
                      </button>
                      {!firm.is_central && firm.id !== centralFirmId ? (
                        <button
                          type="button"
                          className="btn danger"
                          onClick={async () => {
                            if (!window.confirm(`Delete Firm “${firm.name}”?`)) return
                            try {
                              await api.deleteFirm(firm.id, apiOpts)
                              if (editingId === firm.id) resetForm()
                              const nextPage =
                                firms.length === 1 && meta?.current_page > 1
                                  ? meta.current_page - 1
                                  : meta?.current_page || 1
                              await load(nextPage)
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

          {meta && meta.last_page > 1 ? (
            <div
              className="row"
              style={{ gap: '0.75rem', marginTop: '1rem', alignItems: 'center' }}
            >
              <button
                type="button"
                className="btn ghost"
                disabled={meta.current_page <= 1 || loading}
                onClick={() => load(meta.current_page - 1)}
              >
                Previous
              </button>
              <span className="muted">
                Page {meta.current_page} of {meta.last_page} ({meta.total} firms)
              </span>
              <button
                type="button"
                className="btn ghost"
                disabled={meta.current_page >= meta.last_page || loading}
                onClick={() => load(meta.current_page + 1)}
              >
                Next
              </button>
            </div>
          ) : meta?.total ? (
            <p className="muted" style={{ marginTop: '1rem' }}>
              {meta.total} firm{meta.total === 1 ? '' : 's'}
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}
