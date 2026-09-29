import { normalizeComplianceStatusKey } from '../utils/complianceStatusLabels'

/**
 * Renders a compliance status label.
 * "Approved with Feedback" (and hub overrides ending in Feedback) always stack on two lines.
 */
export default function ComplianceStatusText({ status, label, className = '' }) {
  const text = String(label || status || 'Pending').trim()
  const key = normalizeComplianceStatusKey(status || label)
  const isAwf = key === 'approved_with_feedback'

  if (isAwf) {
    const match = text.match(/^(.*?)\s+(Feedback)$/i)
    const line1 = match ? match[1].trim() : 'Approved with'
    const line2 = match ? match[2] : 'Feedback'
    return (
      <span className={`compliance-status-text compliance-status-text--awf ${className}`.trim()}>
        <span className="compliance-status-text__line">{line1}</span>
        <span className="compliance-status-text__line">{line2}</span>
      </span>
    )
  }

  return <span className={`compliance-status-text ${className}`.trim()}>{text}</span>
}
