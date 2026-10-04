import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaTimes } from 'react-icons/fa'
import DateTimeText from './DateTimeText'
import ComplianceStatusText from './ComplianceStatusText'
import { useHub } from '../context/HubContext'
import { plainTextFromHtml } from '../utils/richText'

const EVENT_LABELS = {
  submitted: 'Submitted',
  assigned: 'Assigned',
  unassigned: 'Unassigned',
  reviewed: 'Reviewed',
  resubmitted: 'Resubmitted',
  feedback_confirmed: 'Feedback confirmed',
  status_changed: 'Status changed',
  scheduled: 'Scheduled',
  published: 'Published',
  rejected: 'Rejected',
}

const EVENT_TONES = {
  submitted: 'submit',
  assigned: 'assign',
  unassigned: 'neutral',
  reviewed: 'review',
  resubmitted: 'submit',
  feedback_confirmed: 'review',
  status_changed: 'change',
  scheduled: 'schedule',
  published: 'publish',
  rejected: 'reject',
}

function eventLabel(type) {
  return EVENT_LABELS[type] || type || 'Event'
}

function eventTone(type) {
  return EVENT_TONES[type] || 'neutral'
}

function PersonBlock({ person, roleLabel }) {
  if (!person || (!person.name && !person.email)) return null
  const role = person.role ? roleLabel(person.role) : ''
  const initial = (person.name || person.email || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="compliance-audit-trail__person">
      <span className="compliance-audit-trail__avatar" aria-hidden>
        {initial}
      </span>
      <div className="compliance-audit-trail__person-text">
        <div>
          <strong>{person.name || 'Unknown'}</strong>
          {role ? <span className="muted"> · {role}</span> : null}
        </div>
        {person.email ? (
          <div className="muted compliance-audit-trail__email">{person.email}</div>
        ) : null}
      </div>
    </div>
  )
}

function EventBadge({ type }) {
  return (
    <span className={`compliance-audit-trail__badge compliance-audit-trail__badge--${eventTone(type)}`}>
      {eventLabel(type)}
    </span>
  )
}

function StatusTransition({ fromStatus, toStatus, complianceStatusLabel }) {
  if (!fromStatus && !toStatus) return null
  return (
    <p className="compliance-audit-trail__status">
      {fromStatus ? (
        <ComplianceStatusText status={fromStatus} label={complianceStatusLabel(fromStatus)} />
      ) : (
        <span className="muted">—</span>
      )}
      <span className="compliance-audit-trail__arrow" aria-hidden>
        →
      </span>
      {toStatus ? (
        <ComplianceStatusText status={toStatus} label={complianceStatusLabel(toStatus)} />
      ) : (
        <span className="muted">—</span>
      )}
    </p>
  )
}

function AuditEventItem({ event, roleLabel, complianceStatusLabel }) {
  return (
    <li className="compliance-audit-trail__item">
      <div className="compliance-audit-trail__marker" aria-hidden />
      <div className="compliance-audit-trail__body">
        <div className="compliance-audit-trail__top">
          <EventBadge type={event.event_type} />
          {event.version_number != null ? (
            <span className="compliance-audit-trail__version">v{event.version_number}</span>
          ) : null}
          <span className="compliance-audit-trail__when">
            <DateTimeText value={event.created_at} />
          </span>
        </div>

        {event.description ? (
          <p className="compliance-audit-trail__desc">
            {plainTextFromHtml(event.description)}
          </p>
        ) : null}

        <StatusTransition
          fromStatus={event.from_status}
          toStatus={event.to_status}
          complianceStatusLabel={complianceStatusLabel}
        />

        <div className="compliance-audit-trail__actors">
          <div>
            <span className="compliance-audit-trail__actor-label">By</span>
            <PersonBlock person={event.actor} roleLabel={roleLabel} />
          </div>
          {event.related_user ? (
            <div>
              <span className="compliance-audit-trail__actor-label">
                {event.event_type === 'assigned' || event.event_type === 'unassigned'
                  ? 'Assignee'
                  : 'Related'}
              </span>
              <PersonBlock person={event.related_user} roleLabel={roleLabel} />
            </div>
          ) : null}
        </div>
      </div>
    </li>
  )
}

/**
 * Vertical audit trail for SMC / GC / WC compliance requests.
 *
 * @param {{ events?: Array, compact?: boolean, title?: string, emptyLabel?: string }} props
 */
export default function ComplianceAuditTrail({
  events = [],
  compact = false,
  title = 'Audit trail',
  emptyLabel = 'No audit events recorded yet for this request.',
}) {
  const { roleLabel, complianceStatusLabel } = useHub()
  const list = Array.isArray(events) ? events : []

  if (list.length === 0) {
    if (compact) return <span className="muted">—</span>
    return (
      <div className="compliance-audit-trail compliance-audit-trail--empty">
        <div className="compliance-audit-trail__head">
          <h2>{title}</h2>
        </div>
        <p className="muted">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className={`compliance-audit-trail${compact ? ' compliance-audit-trail--compact' : ''}`}>
      {!compact ? (
        <div className="compliance-audit-trail__head">
          <h2>{title}</h2>
          <p className="muted">
            {list.length} event{list.length === 1 ? '' : 's'} — who submitted, assigned, reviewed,
            and every status change.
          </p>
        </div>
      ) : null}

      <ol className="compliance-audit-trail__list">
        {list.map((event) => (
          <AuditEventItem
            key={event.id || `${event.event_type}-${event.created_at}`}
            event={event}
            roleLabel={roleLabel}
            complianceStatusLabel={complianceStatusLabel}
          />
        ))}
      </ol>
    </div>
  )
}

/** Compact person cell for report grids (name · role + email). */
export function CompliancePersonCell({ name, email, role }) {
  const { roleLabel } = useHub()
  if (!name && !email) return '—'
  const roleText = role ? roleLabel(role) : ''
  return (
    <>
      {name || '—'}
      {roleText ? <span className="muted"> · {roleText}</span> : null}
      {email ? (
        <>
          <br />
          <small className="muted">{email}</small>
        </>
      ) : null}
    </>
  )
}

function AuditTrailModal({ open, onClose, title, subtitle, events }) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="compliance-audit-modal" role="presentation">
      <button
        type="button"
        className="compliance-audit-modal__backdrop"
        aria-label="Close audit trail"
        onClick={onClose}
      />
      <div
        className="compliance-audit-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="compliance-audit-modal__head">
          <div>
            <h3 id={titleId}>{title}</h3>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="compliance-audit-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>
        <div className="compliance-audit-modal__body">
          <ComplianceAuditTrail events={events} compact title="" />
        </div>
      </div>
    </div>,
    document.body
  )
}

/**
 * Compact table cell: event count chip that opens a modal (does not expand inside the grid).
 */
export function ComplianceAuditTrailCell({
  events = [],
  summary = '',
  requestLabel = 'Request',
  requestId = null,
}) {
  const [open, setOpen] = useState(false)
  const list = Array.isArray(events) ? events : []

  if (list.length === 0) {
    return summary ? (
      <span className="muted compliance-audit-trail-cell__empty" title={summary}>
        No events
      </span>
    ) : (
      <span className="muted">—</span>
    )
  }

  const last = list[list.length - 1]
  const title =
    requestId != null ? `${requestLabel} #${requestId}` : 'Audit trail'

  return (
    <div className="compliance-audit-trail-cell">
      <button
        type="button"
        className="compliance-audit-trail-cell__btn"
        onClick={() => setOpen(true)}
        title={summary || undefined}
      >
        <span className="compliance-audit-trail-cell__count">
          {list.length} event{list.length === 1 ? '' : 's'}
        </span>
        <span className="compliance-audit-trail-cell__last muted">
          Last: {eventLabel(last?.event_type)}
        </span>
      </button>

      <AuditTrailModal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        subtitle={`${list.length} lifecycle event${list.length === 1 ? '' : 's'} · oldest → newest`}
        events={list}
      />
    </div>
  )
}

/**
 * Full report-level audit history.
 * Prefer API `audit_events` (hub-scoped). Fall back to flattening row.audit_trail.
 */
export function ComplianceReportAuditPanel({
  events: eventsProp = null,
  rows = [],
  hub = null,
  title = 'Full audit history',
  requestLabel = 'Request',
  requestPath = (id) => String(id),
  LinkComponent = null,
  pageSize = 10,
}) {
  const { roleLabel, complianceStatusLabel } = useHub()
  const [page, setPage] = useState(1)

  let events = []
  if (Array.isArray(eventsProp) && eventsProp.length > 0) {
    events = eventsProp.map((event) => ({
      ...event,
      _requestId: event.subject_id || event._requestId || null,
    }))
  } else {
    for (const row of Array.isArray(rows) ? rows : []) {
      const trail = Array.isArray(row.audit_trail) ? row.audit_trail : []
      for (const event of trail) {
        events.push({
          ...event,
          _requestId: row.id,
          _requestStatus: row.status,
          _submittedBy: row.submitted_by || row.on_behalf_by,
        })
      }
    }
  }

  // Newest first for report browsing
  events.sort((a, b) => {
    const aId = Number(a.id) || 0
    const bId = Number(b.id) || 0
    if (aId !== bId) return bId - aId
    return String(b.created_at || '').localeCompare(String(a.created_at || ''))
  })

  const size = Math.max(1, Number(pageSize) || 10)
  const totalPages = Math.max(1, Math.ceil(events.length / size))
  const safePage = Math.min(Math.max(1, page), totalPages)

  useEffect(() => {
    setPage(1)
  }, [eventsProp, rows, size])

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  const start = (safePage - 1) * size
  const pageEvents = events.slice(start, start + size)
  const rangeStart = events.length === 0 ? 0 : start + 1
  const rangeEnd = Math.min(start + size, events.length)

  const pagerPages = []
  if (events.length > 0 && totalPages > 1) {
    const maxVisible = 5
    let startPage = Math.max(1, safePage - Math.floor(maxVisible / 2))
    let endPage = Math.min(totalPages, startPage + maxVisible - 1)
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1)
    }
    for (let i = startPage; i <= endPage; i++) pagerPages.push(i)
  }

  return (
    <div className="compliance-report-audit">
      <div className="compliance-report-audit__head">
        <div>
          <h2>{title}</h2>
          <p className="muted">
            Who submitted, who assigned, every status change — with user name, role, and email.
          </p>
        </div>
        <div className="compliance-report-audit__count">
          <strong>{events.length}</strong>
          <span>events</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="compliance-report-audit__empty">
          <p className="muted">
            No audit events for{hub?.name ? ` “${hub.name}”` : ' this hub'} yet.
          </p>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            History lives on each content hub database. From Central Hub, use the{' '}
            <strong>hub switcher</strong> to select that content hub, then open Reports → Audit
            trail — you stay on Central, but read that hub’s history.
          </p>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            If the trail is still empty after a backfill, run{' '}
            <code>php artisan compliance:backfill-audit-trail</code> on that content hub’s API,
            then hard-refresh.
          </p>
        </div>
      ) : (
        <>
          <ol className="compliance-report-audit__list">
            {pageEvents.map((event) => {
              const path = requestPath(event._requestId)
              const RequestLink = LinkComponent
              return (
                <li
                  key={`${event._requestId}-${event.id || event.created_at}-${event.event_type}`}
                  className="compliance-report-audit__row"
                >
                  <div className="compliance-report-audit__when">
                    <DateTimeText value={event.created_at} />
                  </div>
                  <div className="compliance-report-audit__main">
                    <div className="compliance-report-audit__title-row">
                      <EventBadge type={event.event_type} />
                      {event.version_number != null ? (
                        <span className="compliance-audit-trail__version">v{event.version_number}</span>
                      ) : null}
                      {event._requestId != null ? (
                        <span className="compliance-report-audit__req">
                          {RequestLink ? (
                            <RequestLink to={path}>
                              {requestLabel} #{event._requestId}
                            </RequestLink>
                          ) : (
                            <>
                              {requestLabel} #{event._requestId}
                            </>
                          )}
                        </span>
                      ) : null}
                    </div>
                    {event.description ? (
                      <p className="compliance-audit-trail__desc">
                        {plainTextFromHtml(event.description)}
                      </p>
                    ) : null}
                    <StatusTransition
                      fromStatus={event.from_status}
                      toStatus={event.to_status}
                      complianceStatusLabel={complianceStatusLabel}
                    />
                    <div className="compliance-audit-trail__actors">
                      <div>
                        <span className="compliance-audit-trail__actor-label">By</span>
                        <PersonBlock person={event.actor} roleLabel={roleLabel} />
                      </div>
                      {event.related_user ? (
                        <div>
                          <span className="compliance-audit-trail__actor-label">
                            {event.event_type === 'assigned' || event.event_type === 'unassigned'
                              ? 'Assignee'
                              : 'Related'}
                          </span>
                          <PersonBlock person={event.related_user} roleLabel={roleLabel} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>

          <div className="data-grid__footer compliance-report-audit__footer">
            <span className="muted data-grid__count">
              Showing {rangeStart}–{rangeEnd} of {events.length}
            </span>
            {totalPages > 1 ? (
              <div className="data-grid__pager">
                <button
                  type="button"
                  className="btn ghost"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  Previous
                </button>
                {pagerPages.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`btn ghost data-grid__page-btn${p === safePage ? ' is-active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn ghost"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
