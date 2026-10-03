import DateTimeText from './DateTimeText'
import ComplianceStatusText from './ComplianceStatusText'
import { useHub } from '../context/HubContext'

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

function PersonBlock({ person, roleLabel }) {
  if (!person || (!person.name && !person.email)) return null
  const role = person.role ? roleLabel(person.role) : ''
  return (
    <div className="compliance-audit-trail__person">
      <div>
        <strong>{person.name || 'Unknown'}</strong>
        {role ? <span className="muted"> · {role}</span> : null}
      </div>
      {person.email ? <div className="muted compliance-audit-trail__email">{person.email}</div> : null}
    </div>
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
        {list.map((event) => {
          const label = EVENT_LABELS[event.event_type] || event.event_type || 'Event'
          const hasStatus = Boolean(event.from_status || event.to_status)

          return (
            <li key={event.id || `${event.event_type}-${event.created_at}`} className="compliance-audit-trail__item">
              <div className="compliance-audit-trail__marker" aria-hidden />
              <div className="compliance-audit-trail__body">
                <div className="compliance-audit-trail__top">
                  <span className="compliance-audit-trail__event">{label}</span>
                  {event.version_number != null ? (
                    <span className="compliance-audit-trail__version">v{event.version_number}</span>
                  ) : null}
                  <span className="compliance-audit-trail__when">
                    <DateTimeText value={event.created_at} />
                  </span>
                </div>

                {event.description ? (
                  <p className="compliance-audit-trail__desc">{event.description}</p>
                ) : null}

                {hasStatus ? (
                  <p className="compliance-audit-trail__status">
                    {event.from_status ? (
                      <ComplianceStatusText
                        status={event.from_status}
                        label={complianceStatusLabel(event.from_status)}
                      />
                    ) : (
                      <span className="muted">—</span>
                    )}
                    <span className="muted"> → </span>
                    {event.to_status ? (
                      <ComplianceStatusText
                        status={event.to_status}
                        label={complianceStatusLabel(event.to_status)}
                      />
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </p>
                ) : null}

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

/** Expandable audit trail cell for report DataGrids. */
export function ComplianceAuditTrailCell({ events = [], summary = '' }) {
  const list = Array.isArray(events) ? events : []
  if (list.length === 0) {
    return summary ? <span className="muted" title={summary}>{summary}</span> : '—'
  }

  return (
    <details className="compliance-audit-trail-details">
      <summary>
        {list.length} event{list.length === 1 ? '' : 's'}
      </summary>
      <ComplianceAuditTrail events={list} compact />
    </details>
  )
}
