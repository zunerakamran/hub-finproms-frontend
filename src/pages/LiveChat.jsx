import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaComments,
  FaPaperPlane,
  FaPlus,
  FaTimes,
  FaUserFriends,
  FaCommentDots,
} from 'react-icons/fa'
import { api } from '../api/client'
import { useHub } from '../context/HubContext'
import { formatDateTime, formatTime } from '../utils/dateFormat'
import './LiveChat.css'

const POLL_MS = 4000

function initials(name, email) {
  const raw = String(name || email || '?').trim()
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return raw.slice(0, 2).toUpperCase()
}

function shortWhen(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) return formatTime(date)
  return formatDateTime(date)
}

export default function LiveChat() {
  const { can, loading: hubLoading, hub, isActingRemotely } = useHub()
  const moduleOn = can('live_chat')
  const canUse = can('lc_use_chat')
  const canManage = can('lc_manage_access')
  const onCentralHome = Boolean(
    (hub?.is_central || hub?.is_control_plane || hub?.type === 'central') && !isActingRemotely
  )
  const showContactsLink = canManage && !onCentralHome

  const [options, setOptions] = useState({ agents: [], is_central_agent: false })
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [activeSlug, setActiveSlug] = useState(null)
  const [active, setActive] = useState(null)
  const [draft, setDraft] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newAgentId, setNewAgentId] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const activeIdRef = useRef(null)
  const activeSlugRef = useRef(null)
  const composerRef = useRef(null)

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
    setShowNew(false)
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

  const subtitleFor = useMemo(() => {
    if (!active) return null
    if (isCentralAgent) {
      const bits = [active.hub_user_email, active.source_hub_name].filter(Boolean)
      return bits.join(' · ')
    }
    return active.central_user_email || null
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
      setShowNew(false)
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
    e?.preventDefault?.()
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
      composerRef.current?.focus()
    } catch (err) {
      setError(err.message || 'Could not send message.')
    } finally {
      setSending(false)
    }
  }

  function onComposerKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!hubLoading && !moduleOn) {
    return (
      <section className="lc-page">
        <div className="lc-page__head">
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
      <section className="lc-page">
        <div className="lc-page__head">
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
    <section className="lc-page">
      <div className="lc-page__head">
        <div>
          <p className="eyebrow">Live Chat</p>
          <h1>Live Chat</h1>
          <p className="muted">
            {isCentralAgent
              ? 'Reply to messages from Shared and White-label hub users.'
              : 'Message the Central Hub contacts chosen for this hub.'}
          </p>
        </div>
        {showContactsLink && (
          <Link className="btn ghost" to="/my-dashboard/live-chat/access">
            <FaUserFriends style={{ marginRight: '0.4rem' }} />
            Central contacts
          </Link>
        )}
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="lc-shell">
        <aside className="lc-sidebar">
          <div className="lc-sidebar__top">
            <h2>Conversations</h2>
            <span className="lc-sidebar__count">{conversations.length}</span>
          </div>

          <ul className="lc-conv-list">
            {loading && <li className="lc-conv-list__empty muted">Loading…</li>}
            {!loading && conversations.length === 0 && (
              <li className="lc-conv-list__empty">
                <div className="lc-conv-list__empty-icon">
                  <FaComments />
                </div>
                <strong>No conversations yet</strong>
                <span className="muted">
                  {isCentralAgent
                    ? 'Waiting for hub users to message you.'
                    : 'Start a chat with a Central contact.'}
                </span>
              </li>
            )}
            {conversations.map((c) => {
              const selected =
                c.id === activeId && (c.source_hub_slug || null) === (activeSlug || null)
              const unread = isCentralAgent ? c.central_unread_count : c.hub_unread_count
              const name = isCentralAgent
                ? c.hub_user_name || 'Hub user'
                : c.central_user_name || 'Central user'
              const sub = isCentralAgent
                ? [c.source_hub_name, c.preview].filter(Boolean).join(' · ')
                : c.preview || c.central_user_email || c.status
              return (
                <li key={`${c.source_hub_slug || 'local'}-${c.id}`}>
                  <button
                    type="button"
                    className={`lc-conv${selected ? ' is-active' : ''}`}
                    onClick={() =>
                      openConversation(c.id, c.source_hub_slug || null).catch((err) =>
                        setError(err.message || 'Failed to open')
                      )
                    }
                  >
                    <span className="lc-avatar" aria-hidden>
                      {initials(name, isCentralAgent ? c.hub_user_email : c.central_user_email)}
                    </span>
                    <span className="lc-conv__meta">
                      <span className="lc-conv__name">{name}</span>
                      <span className="lc-conv__sub">{sub || '—'}</span>
                    </span>
                    <span className="lc-conv__aside">
                      <span className="lc-conv__time">{shortWhen(c.last_message_at)}</span>
                      {unread > 0 && <span className="lc-badge">{unread > 99 ? '99+' : unread}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {!isCentralAgent && (
            <div className="lc-new">
              <button
                type="button"
                className={`btn ${showNew ? 'ghost' : 'primary'} lc-new__toggle`}
                onClick={() => setShowNew((v) => !v)}
              >
                {showNew ? (
                  <>
                    <FaTimes style={{ marginRight: '0.4rem' }} />
                    Cancel
                  </>
                ) : (
                  <>
                    <FaPlus style={{ marginRight: '0.4rem' }} />
                    New chat
                  </>
                )}
              </button>

              {showNew && (
                <form className="lc-new__form" onSubmit={handleStart}>
                  {agents.length === 0 ? (
                    <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                      No Central contacts are configured yet. An admin must check Central Hub users
                      under Central contacts.
                    </p>
                  ) : (
                    <>
                      <label className="field">
                        <span>Central contact</span>
                        <select
                          value={newAgentId}
                          onChange={(e) => setNewAgentId(e.target.value)}
                          required
                        >
                          <option value="">Select…</option>
                          {agents.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                              {a.email ? ` (${a.email})` : ''}
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
                          placeholder="Say hello…"
                        />
                      </label>
                      <button
                        className="btn primary"
                        type="submit"
                        disabled={sending || !newAgentId}
                      >
                        Start chat
                      </button>
                    </>
                  )}
                </form>
              )}
            </div>
          )}
        </aside>

        <div className="lc-thread">
          {!active ? (
            <div className="lc-thread__empty">
              <div className="lc-thread__empty-icon">
                <FaCommentDots />
              </div>
              <strong>Select a conversation</strong>
              <span className="muted">
                {isCentralAgent
                  ? 'Pick a thread from the left to reply.'
                  : 'Pick a thread or start a new chat with a Central contact.'}
              </span>
            </div>
          ) : (
            <>
              <div className="lc-thread__header">
                <div className="lc-thread__who">
                  <span className="lc-avatar lc-avatar--lg" aria-hidden>
                    {initials(titleFor, subtitleFor)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <strong>{titleFor}</strong>
                    {subtitleFor && <div className="muted">{subtitleFor}</div>}
                  </div>
                </div>
              </div>

              <div className="lc-messages">
                {(active.messages || []).map((m) => {
                  const mine = isCentralAgent
                    ? m.sender_side === 'central'
                    : m.sender_side === 'hub'
                  return (
                    <div
                      key={m.id}
                      className={`lc-msg ${mine ? 'lc-msg--mine' : 'lc-msg--theirs'}`}
                    >
                      <div className="lc-bubble">
                        <div className="lc-bubble__meta">
                          {m.sender_name || m.sender_side}
                          {m.created_at ? ` · ${shortWhen(m.created_at)}` : ''}
                        </div>
                        <div className="lc-bubble__body">{m.body}</div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <form className="lc-composer" onSubmit={handleSend}>
                <textarea
                  ref={composerRef}
                  className="lc-composer__input"
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                  maxLength={10000}
                  disabled={sending}
                />
                <button
                  className="btn primary"
                  type="submit"
                  disabled={sending || !draft.trim()}
                  aria-label="Send message"
                >
                  <FaPaperPlane style={{ marginRight: '0.35rem' }} />
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
