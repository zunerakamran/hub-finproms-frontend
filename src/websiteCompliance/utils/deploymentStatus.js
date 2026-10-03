/** Template-request / deployment lifecycle helpers. */

export const DEPLOYMENT_ON_SITE_STATUSES = ['staging', 'ready_for_live', 'live', 'deployed']
export const DEPLOYMENT_LIVE_STATUSES = ['live']
/** Legacy `deployed` rows are treated as staging, not live. */
export const DEPLOYMENT_STAGING_PHASE_STATUSES = ['staging', 'ready_for_live', 'deployed']

export function isDeploymentOnSite(status) {
  return DEPLOYMENT_ON_SITE_STATUSES.includes(String(status || '').toLowerCase())
}

export function isDeploymentLive(status) {
  return DEPLOYMENT_LIVE_STATUSES.includes(String(status || '').toLowerCase())
}

export function isDeploymentStagingPhase(status) {
  return DEPLOYMENT_STAGING_PHASE_STATUSES.includes(String(status || '').toLowerCase())
}

export function canRequestGoLive(request, currentUserId) {
  if (!request || !currentUserId) return false
  const status = String(request.status || '').toLowerCase()
  if (status !== 'staging' && status !== 'deployed') return false
  return Number(request.requested_by_id) === Number(currentUserId)
}

export function canPromoteToLive(request) {
  return String(request?.status || '').toLowerCase() === 'ready_for_live'
}

/** Active site URL for links / previews (staging or live host currently wired). */
export function activeDeploymentUrl(request) {
  return request?.cpanel_domain || request?.staging_domain || request?.domain_name || ''
}
