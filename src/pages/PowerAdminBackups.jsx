import { useHub } from '../context/HubContext'
import HubBackupPanel from '../components/HubBackupPanel'

/**
 * Platform tool: backup schedule / restore for the hub selected in Control hub.
 * Gated by pa_manage_hub_backups.
 */
export default function PowerAdminBackups() {
  const { actingHubId, actingHub, hub, isActingRemotely } = useHub()
  const selectedId = actingHubId || hub?.id || ''
  const selectedName = actingHub?.name || hub?.name || 'this hub'

  if (!selectedId) {
    return (
      <div className="admin-form">
        <h1>Hub backups &amp; restore</h1>
        <p className="muted">
          Choose a hub from the <strong>Control hub</strong> dropdown at the top, then configure
          backup schedule and restore for that hub.
        </p>
      </div>
    )
  }

  return (
    <div className="admin-form">
      <div className="page-head">
        <div>
          <p className="eyebrow">Platform</p>
          <h1>Hub backups &amp; restore</h1>
          <p className="muted">
            Managing backups for <strong>{selectedName}</strong>
            {isActingRemotely
              ? ' (selected in Control hub).'
              : ' (Central). Use Control hub to switch to a Shared or White-label hub.'}
          </p>
        </div>
      </div>

      <HubBackupPanel key={selectedId} hubId={selectedId} hubName={selectedName} embedded />
    </div>
  )
}
