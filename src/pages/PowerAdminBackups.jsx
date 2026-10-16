import { Link } from 'react-router-dom'
import { useHub } from '../context/HubContext'
import HubBackupPanel from '../components/HubBackupPanel'

/**
 * Platform tool: backup schedule / restore for the hub selected in Control hub.
 * Gated by pa_manage_hub_backups.
 *
 * Module-scoped disaster recovery (recognize via monitoring → roll back one
 * product module) lives under Security Monitoring — not whole-hub restore.
 */
export default function PowerAdminBackups() {
  const { actingHubId, actingHub, hub, isActingRemotely, isActingOnWhiteLabel } = useHub()
  const selectedId = actingHubId || hub?.id || ''
  const selectedName = actingHub?.name || hub?.name || 'this hub'
  const selectedSlug = actingHub?.slug || hub?.slug || ''

  const hubKind = isActingRemotely
    ? isActingOnWhiteLabel
      ? 'White-labelled'
      : 'Shared'
    : hub?.type === 'central' || hub?.is_central || hub?.is_control_plane
      ? 'Central'
      : hub?.type === 'white_label'
        ? 'White-labelled'
        : 'Shared'

  if (!selectedId) {
    return (
      <section className="hub-backups-page">
        <div className="page-head">
          <div>
            <p className="eyebrow">Platform</p>
            <h1>Hub backups &amp; restore</h1>
          </div>
        </div>
        <div className="empty-state">
          <h2>Choose a hub</h2>
          <p className="muted">
            Use the <strong>Control hub</strong> dropdown in the top bar, then open this page again
            to manage that hub&apos;s backup schedule and restores.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="hub-backups-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Platform</p>
          <h1>Hub backups &amp; restore</h1>
          <p className="muted">
            Dual-store backups (hub local + Central) for whole-hub recovery. Switch hubs with{' '}
            <strong>Control hub</strong> in the top bar. For module-scoped disaster recovery after
            Security Monitoring detects an issue, use{' '}
            <Link to="/my-dashboard/security-monitoring">Security monitoring</Link>.
          </p>
        </div>
      </div>

      <div className="checklist-hub-summary hub-backups-summary">
        <div>
          <h2>{selectedName}</h2>
          <p className="muted">
            <span className="badge">{hubKind}</span>
            {selectedSlug ? (
              <>
                {' '}
                Slug <code>{selectedSlug}</code>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <HubBackupPanel key={selectedId} hubId={selectedId} hubName={selectedName} embedded />
    </section>
  )
}
