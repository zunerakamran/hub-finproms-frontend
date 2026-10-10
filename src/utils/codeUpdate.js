/**
 * Badge class + short label for hub code_update status from Central.
 */
export function codeUpdateBadge(codeUpdate) {
  const status = codeUpdate?.status || 'unknown'
  if (status === 'up_to_date') {
    return { className: 'badge ok', label: codeUpdate?.status_label || 'Up to date' }
  }
  if (status === 'behind') {
    return { className: 'badge warn', label: codeUpdate?.status_label || 'Behind latest' }
  }
  if (status === 'error') {
    return { className: 'badge warn', label: codeUpdate?.status_label || 'Check failed' }
  }
  if (status === 'ahead') {
    return { className: 'badge', label: codeUpdate?.status_label || 'Ahead of latest' }
  }
  return { className: 'badge', label: codeUpdate?.status_label || 'Version unknown' }
}

export function formatReportedVersion(codeUpdate) {
  if (!codeUpdate?.reported_version) return '—'
  const latest = codeUpdate.latest_version
  if (latest && latest !== codeUpdate.reported_version) {
    return `${codeUpdate.reported_version} (latest ${latest})`
  }
  return codeUpdate.reported_version
}
