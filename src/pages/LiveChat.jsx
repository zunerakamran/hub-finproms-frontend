import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'
import { formatDateTime } from '../utils/dateFormat'

const POLL_MS = 4000

export default function LiveChat() {
  const { can, loading: hubLoading, hub } = useHub()
  const moduleOn = can('live_chat')
  const canUse = can('lc_use_chat')
  const canManage = can('lc_manage_access')

  const [options, setOptions] = useState({ agents: [], is_central_agent: false })
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [activeSlug, setActiveSlug] = useState(null)
  const [active, setActive] = useState(null)
  const [draft, setDraft] = useState('')
  const [newAgentId, setNewAgentId] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const activeIdRef = useRef(null)
  const activeSlugRef = useRef(null)

  useEffect(() => {
    activeIdRef.current = activeId
    activeSlugRef.current = activeSlug
  }, [activeId, activeSlug])

  const isCentralAgent = Boolean(options.is_central_agent)

  const loadList = useCallback(async () => {
    if (!moduleOn || !canUse) return
    const [opts, list] = await Promise.all([
      api.liveChatOptions(),
      api.liveChatConversations(),
    ])
    setOptions(opts || { agents: [], is_central_agent: false })
    setConversations(list?.data || [])
  }, [moduleOn, canUse])

  const openConversation = useCallback(async (id, sourceHubSlug = null) => {
    if (!id) return
    setError('')
    const data = await api.liveChatShow(id, sourceHubSlug ? { source_hub_slug: sourceHubSlug } : {})
    setActive(data?.data || null)
    setActiveId(id)
    setActiveSlug(sourceHubSlug || data?.data?.source_hub_slug || null)
  }, [])

  useEffect(() => {
    if (hubLoading || !moduleOn || !canUse) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    loadList()
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load Live Chat.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hubLoading, moduleOn, canUse, loadList])

  useEffect(() => {
    if (!moduleOn || !canUse) return undefined
    const timer = setInterval(() => {
      loadList().catch(() => {})
      const id = activeIdRef.current
      if (id) {
        openConversation(id, activeSlugRef.current).catch(() => {})
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [moduleOn, canUse, loadList, openConversation])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages?.length])

  const agents = options.agents || []

  const titleFor = useMemo(() => {
    if (!active) return null
    if (isCentralAgent) {
      return active.hub_user_name || active.hub_user_email || 'Hub user'
    }
    return active.central_user_name || active.central_user_email || 'Central user'
  }, [active, isCentralAgent])

  async function handleStart(e) {
    e.preventDefault()
    if (!newAgentId) return
    setSending(true)
    setError('')
    try {
      const res = await api.liveChatStart({
        central_user_id: Number(newAgentId),
        message: newMessage || undefined,
      })
      setNewMessage('')
      setNewAgentId('')
      await loadList()
      const data = res?.data
      if (data?.id) {
        setActive(data)
        setActiveId(data.id)
        setActiveSlug(null)
      }
    } catch (err) {
      setError(err.message || 'Could not start conversation.')
    } finally {
      setSending(false)
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!activeId || !draft.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await api.liveChatSend(activeId, {
        body: draft.trim(),
        source_hub_slug: activeSlug || undefined,
      })
      setDraft('')
      setActive(res?.data || null)
      await loadList()
    } catch (err) {
      setError(err.message || 'Could not send message.')
    } finally {
      setSending(false)
    }
  }

  async function handleClose() {
    if (!activeId) return
    setSending(true)
    setError('')
    try {
      await api.liveChatClose(activeId, {
        source_hub_slug: activeSlug || undefined,
      })
      setActive(null)
      setActiveId(null)
      setActiveSlug(null)
      await loadList()
    } catch (err) {
      setError(err.message || 'Could not close conversation.')
    } finally {
      setSending(false)
    }
  }

  if (!hubLoading && !moduleOn) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Live Chat</p>
            <h1>Live Chat</h1>
            <p className="muted">
              Live Chat is not enabled for this hub. Ask Power Admin to enable it under
              Functionalities.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (!hubLoading && !canUse) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">Live Chat</p>
            <h1>Live Chat</h1>
            <p className="muted">You do not have permission to use Live Chat.</p>
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
          <h1>Live Chat</h1>
          <p className="muted">
            {isCentralAgent
              ? 'Reply to messages from Shared and White-label hub users. Only Central users checked under Live Chat access appear to hub members.'
              : 'Message Central Hub users who have Live Chat access enabled.'}
          </p>
        </div>
        {canManage && (hub?.is_central || hub?.is_control_plane) && (
          <Link className="btn ghost" to="/my-dashboard/live-chat/access">
            Manage access
          </Link>
        )}
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="live-chat-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: '1rem', minHeight: '420px' }}>
        <aside className="card" style={{ padding: '0.75rem', overflow: 'auto' }}>
          <h2 style={{ fontSize: '1rem', margin: '0 0 0.75rem' }}>Conversations</h2>
          {loading && <p className="muted">Loading…</p>}
          {!loading && conversations.length === 0 && (
            <p className="muted" style={{ fontSize: '0.9rem' }}>No conversations yet.</p>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {conversations.map((c) => {
              const selected = c.id === activeId && (c.source_hub_slug || null) === (activeSlug || null)
              const unread = isCentralAgent ? c.central_unread_count : c.hub_unread_count
              const label = isCentralAgent
                ? `${c.hub_user_name || 'Hub user'}${c.source_hub_name ? ` · ${c.source_hub_name}` : ''}`
                : c.central_user_name || 'Central user'
              return (
                <li key={`${c.source_hub_slug || 'local'}-${c.id}`}>
                  <button
                    type="button"
                    className={selected ? 'btn primary' : 'btn ghost'}
                    style={{ width: '100%', textAlign: 'left', marginBottom: '0.35rem', justifyContent: 'space-between' }}
                    onClick={() => openConversation(c.id, c.source_hub_slug || null).catch((err) => setError(err.message || 'Failed to open'))}
                  >
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                      <small className="muted" style={{ display: 'block' }}>
                        {c.last_message_at ? formatDateTime(c.last_message_at) : c.status}
                      </small>
                    </span>
                    {unread > 0 && (
                      <span style={{ marginLeft: '0.5rem', fontWeight: 700 }}>{unread}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          {!isCentralAgent && (
            <form onSubmit={handleStart} style={{ marginTop: '1rem', borderTop: '1px solid var(--border, #ddd)', paddingTop: '0.75rem' }}>
              <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem' }}>New chat</h3>
              {agents.length === 0 ? (
                <p className="muted" style={{ fontSize: '0.85rem' }}>
                  No Central Hub agents are available yet. Central admins must check users under Live Chat access.
                </p>
              ) : (
                <>
                  <label className="field">
                    <span>Central user</span>
                    <select value={newAgentId} onChange={(e) => setNewAgentId(e.target.value)} required>
                      <option value="">Select…</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} {a.email ? `(${a.email})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>First message (optional)</span>
                    <textarea
                      rows={2}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      maxLength={10000}
                    />
                  </label>
                  <button className="btn primary" type="submit" disabled={sending || !newAgentId}>
                    Start chat
                  </button>
                </>
              )}
            </form>
          )}
        </aside>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '0.75rem', minHeight: '420px' }}>
          {!active ? (
            <p className="muted" style={{ margin: 'auto' }}>Select a conversation{!isCentralAgent ? ' or start a new one' : ''}.</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <strong>{titleFor}</strong>
                  {active.source_hub_name && (
                    <span className="muted"> · {active.source_hub_name}</span>
                  )}
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    Status: {active.status || 'open'}
                  </div>
                </div>
                {active.status !== 'closed' && (
                  <button type="button" className="btn ghost" onClick={handleClose} disabled={sending}>
                    Close
                  </button>
                )}
              </div>

              <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.25rem 0' }}>
                {(active.messages || []).map((m) => {
                  const mine = isCentralAgent ? m.sender_side === 'central' : m.sender_side === 'hub'
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: mine ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        background: mine ? 'var(--primary, #2563eb)' : 'var(--surface-2, #f3f4f6)',
                        color: mine ? '#fff' : 'inherit',
                        borderRadius: '12px',
                        padding: '0.55rem 0.75rem',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', opacity: 0.85, marginBottom: '0.2rem' }}>
                        {m.sender_name || m.sender_side} · {m.created_at ? formatDateTime(m.created_at) : ''}
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {active.status === 'closed' ? (
                <p className="muted" style={{ marginTop: '0.75rem' }}>This conversation is closed.</p>
              ) : (
                <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message…"
                    maxLength={10000}
                    style={{ flex: 1 }}
                    disabled={sending}
                  />
                  <button className="btn primary" type="submit" disabled={sending || !draft.trim()}>
                    Send
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
