import {
  hasOnBehalfAttribution,
  submissionAttributionText,
} from '../utils/submissionAttribution'

/**
 * Highlighted label when a request was submitted by Admin-staff on behalf of an advisor.
 * @param {{ row: object, ownerKey?: 'submitter'|'editor', className?: string }} props
 */
export default function OnBehalfAttribution({ row, ownerKey = 'submitter', className = '' }) {
  if (!hasOnBehalfAttribution(row)) return null

  return (
    <p className={`attribution-highlight${className ? ` ${className}` : ''}`}>
      {submissionAttributionText(row, ownerKey)}
    </p>
  )
}
