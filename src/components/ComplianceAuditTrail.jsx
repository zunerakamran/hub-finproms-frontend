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

/**
 * Full report-level audit history built from report rows' audit_trail arrays.
 * Shown as a dedicated panel so it cannot be hidden by DataGrid column squeeze.
 */
export function ComplianceReportAuditPanel({
  rows = [],
  title = 'Full audit history',
  requestLabel = 'Request',
  requestPath = (id) => String(id),
  LinkComponent = null,
}) {
  const { roleLabel, complianceStatusLabel } = useHub()

  const events = []
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

  // Newest first for report browsing
  events.sort((a, b) => {
    const aId = Number(a.id) || 0
    const bId = Number(b.id) || 0
    if (aId !== bId) return bId - aId
    return String(b.created_at || '').localeCompare(String(a.created_at || ''))
  })

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
            No audit events yet. New submit / assign / review actions will appear here automatically.
            If you expected history, confirm the backend migration
            <code> compliance_audit_events </code>
            has been run.
          </p>
        </div>
      ) : (
        <ol className="compliance-report-audit__list">
          {events.map((event) => {
            const label = EVENT_LABELS[event.event_type] || event.event_type || 'Event'
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
                    <span className="compliance-audit-trail__event">{label}</span>
                    {event.version_number != null ? (
                      <span className="compliance-audit-trail__version">v{event.version_number}</span>
                    ) : null}
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
                  </div>
                  {event.description ? (
                    <p className="compliance-audit-trail__desc">{event.description}</p>
                  ) : null}
                  {(event.from_status || event.to_status) ? (
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
      )}
    </div>
  )
}
