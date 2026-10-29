import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaArrowLeft } from 'react-icons/fa'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'
import './LiveChat.css'

function initials(name, email) {
  const raw = String(name || email || '?').trim()
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return raw.slice(0, 2).toUpperCase()
}

export default function LiveChatAccess() {
  const { can, loading: hubLoading, hub, isActingRemotely } = useHub()
  const moduleOn = can('live_chat')
  const canManage = can('lc_manage_access')
  const onCentralHome = Boolean(
    (hub?.is_central || hub?.is_control_plane || hub?.type === 'central') && !isActingRemotely
  )
  const contentHubContext = !onCentralHome

  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (hubLoading || !moduleOn || !canManage || !contentHubContext) {
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
        setSelected(new Set(rows.filter((u) => u.selected).map((u) => u.id)))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load Central Hub users.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hubLoading, moduleOn, canManage, contentHubContext])

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
      setSelected(new Set(rows.filter((u) => u.selected).map((u) => u.id)))
      setMessage(res?.message || 'Central contacts saved.')
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (!hubLoading && onCentralHome) {
    return (
      <section className="lc-page">
        <div className="lc-page__head">
          <div>
            <p className="eyebrow">Live Chat</p>
            <h1>Central contacts</h1>
            <p className="muted">
              Central contacts are chosen on each Shared or White-label hub. Switch to a content hub
              to pick which Central users its members may message.
            </p>
          </div>
          <Link className="btn ghost" to="/my-dashboard/live-chat">
            <FaArrowLeft style={{ marginRight: '0.4rem' }} />
            Back to Live Chat
          </Link>
        </div>
      </section>
    )
  }

  if (!hubLoading && !moduleOn) {
    return (
      <section className="lc-page">
        <div className="lc-page__head">
          <div>
            <p className="eyebrow">Live Chat</p>
            <h1>Central contacts</h1>
            <p className="muted">
              Live Chat is not enabled for this hub. Ask Power Admin to enable it under
              Functionalities.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (!hubLoading && !canManage) {
    return (
      <section className="lc-page">
        <div className="lc-page__head">
          <div>
            <p className="eyebrow">Live Chat</p>
            <h1>Central contacts</h1>
            <p className="muted">You do not have permission to choose Central contacts.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="lc-page">
      <div className="lc-page__head">
        <div>
          <p className="eyebrow">Live Chat</p>
          <h1>Central contacts</h1>
          <p className="muted">
            Check which <strong>Central Hub</strong> users members of this hub may message. This is
            not a list of this hub’s own users.
          </p>
        </div>
        <Link className="btn ghost" to="/my-dashboard/live-chat">
          <FaArrowLeft style={{ marginRight: '0.4rem' }} />
          Back to Live Chat
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <form onSubmit={handleSave} className="lc-access-card">
        <div className="lc-access-toolbar">
          <label className="field">
            <span className="sr-only">Filter Central users</span>
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
            {saving ? 'Saving…' : 'Save contacts'}
          </button>
        </div>

        <p className="muted lc-access-stats">
          {selected.size} selected · {filtered.length} shown · {users.length} Central users
        </p>

        {loading ? (
          <p className="muted">Loading Central Hub users…</p>
        ) : filtered.length === 0 ? (
          <p className="muted">No Central Hub users found.</p>
        ) : (
          <ul className="lc-access-list">
            {filtered.map((u) => (
              <li key={u.id} className="lc-access-row">
                <label>
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggle(u.id)}
                  />
                  <span className="lc-avatar" aria-hidden>
                    {initials(u.name, u.email)}
                  </span>
                  <span className="lc-access-row__text">
                    <strong>{u.name || 'User'}</strong>
                    <span className="muted">
                      {u.email}
                      {(u.role_label || u.role) && ` · ${u.role_label || u.role}`}
                    </span>
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
