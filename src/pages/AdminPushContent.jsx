import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function AdminPushContent({ shell = 'client-admin' }) {
  const { isPowerAdmin } = useAuth()
  const asPowerAdmin = shell === 'power-admin' || isPowerAdmin
  const apiOpts = { asPowerAdmin }

  const [posts, setPosts] = useState([])
  const [hubs, setHubs] = useState([])
  const [recent, setRecent] = useState([])
  const [selectedPosts, setSelectedPosts] = useState([])
  const [selectedHubs, setSelectedHubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [pushing, setPushing] = useState(false)
  const [testingHubId, setTestingHubId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [results, setResults] = useState([])

  const eligibleHubs = useMemo(() => hubs.filter((h) => h.eligible), [hubs])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [postsRes, hubsRes, recentRes] = await Promise.all([
        api.contentPushPosts({ per_page: 100 }, apiOpts),
        api.contentPushTargets(apiOpts),
        api.contentPushRecent(apiOpts),
      ])
      setPosts(postsRes.data || [])
      setHubs(hubsRes.hubs || [])
      setRecent(recentRes.pushes || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const togglePost = (id) => {
    setSelectedPosts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleHub = (id) => {
    setSelectedHubs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const onTest = async (hubId) => {
    setTestingHubId(hubId)
    setError('')
    setMessage('')
    try {
      const data = await api.contentPushTestConnection(hubId, apiOpts)
      setMessage(data.message || 'Connection OK.')
    } catch (err) {
      setError(err.message)
    } finally {
      setTestingHubId(null)
    }
  }

  const onPush = async (e) => {
    e.preventDefault()
    if (!selectedPosts.length || !selectedHubs.length) {
      setError('Select at least one post and one eligible white-label hub.')
      return
    }
    setPushing(true)
    setError('')
    setMessage('')
    setResults([])
    try {
      const data = await api.contentPush(
        { post_ids: selectedPosts, hub_ids: selectedHubs },
        apiOpts
      )
      setMessage(data.message || 'Push complete.')
      setResults(data.results || [])
      setSelectedPosts([])
      setSelectedHubs([])
      const recentRes = await api.contentPushRecent(apiOpts)
      setRecent(recentRes.pushes || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setPushing(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Shared hub</p>
          <h1>Push content</h1>
          <p className="muted">
            Select active posts and push them into white-label hubs&apos; own databases. Target hubs
            need <code>receive_content_from_shared</code> enabled and remote DB credentials set.{' '}
            <Link to="/my-dashboard/hubs">Manage hubs</Link>
          </p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {loading ? (
        <div className="state">Loading…</div>
      ) : (
        <form className="admin-form" onSubmit={onPush}>
          <div className="form-row two" style={{ alignItems: 'start' }}>
            <div>
              <h2>Posts</h2>
              <p className="muted">{selectedPosts.length} selected</p>
              <div className="hub-list" style={{ maxHeight: '28rem', overflow: 'auto' }}>
                {posts.length === 0 ? (
                  <p className="muted">No active posts.</p>
                ) : (
                  posts.map((post) => (
                    <label key={post.id} className="toggle-row hub-card" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={selectedPosts.includes(post.id)}
                        onChange={() => togglePost(post.id)}
                      />
                      <span>
                        <strong>{post.title}</strong>
                        <br />
                        <span className="muted">
                          {post.type} · {post.category} · {post.credits_cost} credits
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <h2>White-label hubs</h2>
              <p className="muted">
                {eligibleHubs.length} eligible · {selectedHubs.length} selected
              </p>
              <div className="hub-list" style={{ maxHeight: '28rem', overflow: 'auto' }}>
                {hubs.length === 0 ? (
                  <p className="muted">No white-label hubs yet.</p>
                ) : (
                  hubs.map((hub) => (
                    <article key={hub.id} className="hub-card">
                      <label className="toggle-row" style={{ alignItems: 'flex-start' }}>
                        <input
                          type="checkbox"
                          disabled={!hub.eligible}
                          checked={selectedHubs.includes(hub.id)}
                          onChange={() => toggleHub(hub.id)}
                        />
                        <span>
                          <strong>{hub.name}</strong>
                          <br />
                          <span className="muted">
                            <code>{hub.slug}</code>
                          </span>
                          <br />
                          <span className={`badge ${hub.eligible ? 'ok' : 'warn'}`}>
                            {hub.eligible
                              ? 'Ready'
                              : !hub.can_receive
                                ? 'Receive disabled'
                                : 'DB not configured'}
                          </span>
                        </span>
                      </label>
                      <div className="actions">
                        <button
                          type="button"
                          className="btn ghost"
                          disabled={testingHubId === hub.id || !hub.db_ready}
                          onClick={() => onTest(hub.id)}
                        >
                          {testingHubId === hub.id ? 'Testing…' : 'Test DB'}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="actions" style={{ marginTop: '1rem' }}>
            <button
              className="btn primary"
              disabled={pushing || !selectedPosts.length || !selectedHubs.length}
            >
              {pushing ? 'Pushing…' : 'Push selected content'}
            </button>
          </div>
        </form>
      )}

      {results.length > 0 && (
        <div className="admin-form" style={{ marginTop: '1.25rem' }}>
          <h2>This run</h2>
          <ul className="hub-deploy-steps">
            {results.map((row, idx) => (
              <li key={`${row.post_id}-${row.target_hub_id}-${idx}`} className={row.status === 'success' ? 'done' : 'missing'}>
                <span className="hub-deploy-mark">{row.status === 'success' ? '✓' : '!'}</span>
                <span>
                  <strong>{row.post_title}</strong> → {row.target_hub_name}: {row.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="admin-form" style={{ marginTop: '1.25rem' }}>
        <h2>Recent pushes</h2>
        {recent.length === 0 ? (
          <p className="muted">No pushes yet.</p>
        ) : (
          <div className="hub-list">
            {recent.map((row) => (
              <article key={row.id} className="hub-card">
                <div className="hub-card-head">
                  <div>
                    <h2 style={{ fontSize: '1rem' }}>{row.post?.title || `Post #${row.id}`}</h2>
                    <p className="muted">
                      → {row.target_hub?.name || 'Hub'} · {row.pushed_by || 'Unknown'} ·{' '}
                      {row.created_at ? new Date(row.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                  <span className={`badge ${row.status === 'success' ? 'ok' : 'warn'}`}>
                    {row.status}
                  </span>
                </div>
                {row.message && <p className="muted">{row.message}</p>}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
