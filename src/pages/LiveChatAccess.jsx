import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'

export default function LiveChatAccess() {
  const { can, loading: hubLoading, hub } = useHub()
  const moduleOn = can('live_chat')
  const canManage = can('lc_manage_access')
  const isCentral = Boolean(hub?.is_central || hub?.is_control_plane)

  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (hubLoading || !moduleOn || !canManage || !isCentral) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .liveChatAccess()
      .then((res) => {
        if (cancelled) return
        const rows = res?.data || []
        setUsers(rows)
        setSelected(new Set(rows.filter((u) => u.live_chat_access).map((u) => u.id)))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load access list.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hubLoading, moduleOn, canManage, isCentral])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role_label || u.role || '').toLowerCase().includes(q)
    )
  }, [users, filter])

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev)
      filtered.forEach((u) => next.add(u.id))
      return next
    })
  }

  function clearAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev)
      filtered.forEach((u) => next.delete(u.id))
      return next
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await api.liveChatAccessUpdate({ user_ids: Array.from(selected) })
      const rows = res?.data || []
      setUsers(rows)
      setSelected(new Set(rows.filter((u) => u.live_chat_access).map((u) => u.id)))
      setMessage(res?.message || 'Live Chat access saved.')
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && (!moduleOn || !isCentral)) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Live Chat</p>
            <h1>Live Chat access</h1>
            <p className="muted">
              {!isCentral
                ? 'Live Chat access is managed only on the Central Hub.'
                : 'Live Chat is not enabled. Ask Power Admin to enable it under Functionalities.'}
            </p>
          </div>
          <Link className="btn ghost" to="/my-dashboard/live-chat">
            Back to Live Chat
          </Link>
        </div>
      </section>
    )
  }

  if (!hubLoading && !canManage) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Live Chat</p>
            <h1>Live Chat access</h1>
            <p className="muted">You do not have permission to manage Live Chat access.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Live Chat</p>
          <h1>Live Chat access</h1>
          <p className="muted">
            Check the Central Hub users who may use Live Chat and appear as contacts for Shared /
            White-label hub users. Unchecked users cannot access the Live Chat module on Central.
          </p>
        </div>
        <Link className="btn ghost" to="/my-dashboard/live-chat">
          Back to Live Chat
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <form onSubmit={handleSave} className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
          <label className="field" style={{ flex: '1 1 220px', margin: 0 }}>
            <span className="sr-only">Filter users</span>
            <input
              type="search"
              placeholder="Filter by name, email, or role…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </label>
          <button type="button" className="btn ghost" onClick={selectAllFiltered}>
            Check filtered
          </button>
          <button type="button" className="btn ghost" onClick={clearAllFiltered}>
            Uncheck filtered
          </button>
          <button type="submit" className="btn primary" disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save access'}
          </button>
        </div>

        <p className="muted" style={{ marginTop: 0 }}>
          {selected.size} selected · {filtered.length} shown · {users.length} total
        </p>

        {loading ? (
          <p className="muted">Loading users…</p>
        ) : filtered.length === 0 ? (
          <p className="muted">No users match.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '60vh', overflow: 'auto' }}>
            {filtered.map((u) => (
              <li
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.45rem 0',
                  borderBottom: '1px solid var(--border, #eee)',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggle(u.id)}
                  />
                  <span>
                    <strong>{u.name || 'User'}</strong>
                    <span className="muted"> · {u.email}</span>
                    {(u.role_label || u.role) && (
                      <span className="muted"> · {u.role_label || u.role}</span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </form>
    </section>
  )
}
