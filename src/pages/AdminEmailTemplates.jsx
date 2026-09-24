import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export default function AdminEmailTemplates() {
  const [events, setEvents] = useState([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await api.emailTemplates()
        if (cancelled) return
        setEvents(Array.isArray(data?.events) ? data.events : [])
        setNote(data?.admin_recipients_note || '')
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load email templates.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const grouped = useMemo(() => {
    const map = new Map()
    events.forEach((event) => {
      const group = event.group || 'Other'
      if (!map.has(group)) map.set(group, [])
      map.get(group).push(event)
    })
    return Array.from(map.entries())
  }, [events])

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Hub</p>
          <h1>Email templates</h1>
          <p className="muted">
            Edit subject and body copy for transactional emails. Logo and theme colours stay branded
            from hub settings. Only events enabled for this hub are listed.
          </p>
        </div>
      </div>

      {note && <p className="muted" style={{ marginBottom: '1rem' }}>{note}</p>}
      {error && <div className="alert">{error}</div>}

      {loading ? (
        <div className="state">Loading...</div>
      ) : events.length === 0 ? (
        <div className="empty-state">No email events are enabled for this hub yet.</div>
      ) : (
        grouped.map(([group, items]) => (
          <div key={group} style={{ marginBottom: '1.5rem' }}>
            <h2 className="section-title">{group}</h2>
            <div className="admin-list">
              {items.map((event) => {
                const audiences = Array.isArray(event.audiences) ? event.audiences : []
                const customized = audiences.filter((a) => a.is_customized).length
                return (
                  <div key={event.key} className="admin-row">
                    <div>
                      <strong>{event.label}</strong>
                      <p className="muted">{event.description}</p>
                      <p className="muted" style={{ fontSize: '0.85em' }}>
                        {audiences.map((a) => a.label).join(' · ')}
                        {customized > 0 ? ` · ${customized} customized` : ''}
                      </p>
                    </div>
                    <div className="actions">
                      <Link className="btn ghost" to={`/my-dashboard/email-templates/${event.key}`}>
                        Edit
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </section>
  )
}
