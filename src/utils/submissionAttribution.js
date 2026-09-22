/**
 * @param {{ attribution_label?: string|null, on_behalf_by?: {name?: string}|null, submitter?: {name?: string}|null, editor?: {name?: string}|null, name?: string|null }} row
 * @param {'submitter'|'editor'} [ownerKey='submitter']
 */
export function submissionAttributionText(row, ownerKey = 'submitter') {
  if (row?.attribution_label) return row.attribution_label
  const owner = row?.[ownerKey]?.name || row?.name || 'Unknown'
  if (row?.on_behalf_by?.name) {
    return `${row.on_behalf_by.name} submitted on behalf of ${owner}`
  }
  return `Submitted by ${owner}`
}
