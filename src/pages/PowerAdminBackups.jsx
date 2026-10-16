import { Link } from 'react-router-dom'
import { useHub } from '../context/HubContext'
import HubBackupPanel from '../components/HubBackupPanel'

/**
 * Platform tool: backup schedule / restore + DR runbook for the hub selected
 * in Control hub. Gated by pa_manage_hub_backups.
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
            Dual-store backups (hub local + Central), disaster recovery restore, and links for
            code rollback. Switch hubs with <strong>Control hub</strong> in the top bar.
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

      <section className="hub-backup-card hub-dr-runbook" aria-labelledby="hub-dr-heading">
        <div className="hub-backup-card__head">
          <div>
            <h3 id="hub-dr-heading">Disaster recovery &amp; rollback</h3>
            <p className="muted">
              Two recovery paths. Use data restore when the database or media are wrong; use code
              rollback when only a release package must be undone.
            </p>
          </div>
        </div>
        <div className="hub-dr-grid">
          <div className="hub-dr-path">
            <h4>A) Data disaster recovery</h4>
            <ol>
              <li>
                Optional but recommended: run <strong>Backup now</strong> before a risky change.
              </li>
              <li>Pick a completed <strong>Central</strong> archive below (safe source of truth).</li>
              <li>
                Click <strong>Restore</strong> — this overwrites the hub database and restored media
                trees. Work after that backup&apos;s timestamp is lost.
              </li>
              <li>Smoke-check login, catalog, and critical admin tools after restore.</li>
              <li>
                Download archives off-server when you need longer-term / off-site DR copies.
              </li>
            </ol>
          </div>
          <div className="hub-dr-path">
            <h4>B) Code rollback</h4>
            <ol>
              <li>
                On{' '}
                <Link to="/my-dashboard/hubs">Hubs / Code Updates</Link>, choose a{' '}
                <strong>prior release</strong> that still has zip artifacts.
              </li>
              <li>Select the affected hubs and apply that release (UI labels it Rollback).</li>
              <li>
                Rollback does not reverse irreversible migrations — if schema/data broke, restore
                from a Central backup (A) as well.
              </li>
              <li>Refresh versions and check Update history for success/failure.</li>
            </ol>
          </div>
        </div>
        <p className="muted hub-dr-footnote">
          Recommended pairing: Backup now on each target hub before applying a risky release. After
          a bad release, roll code back first if only code is wrong; restore data if the database
          or media are corrupt.
        </p>
      </section>

      <HubBackupPanel key={selectedId} hubId={selectedId} hubName={selectedName} embedded />
    </section>
  )
}
