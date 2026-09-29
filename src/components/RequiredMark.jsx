/**
 * Required-field caption with a red asterisk kept on one line
 * (hub `label` uses CSS grid, so bare text + * would wrap).
 *
 * @example
 * <RequiredMark>Description</RequiredMark>
 * // Description *
 *
 * @example
 * <RequiredMark after="(up to 10)">Attachments</RequiredMark>
 * // Attachments * (up to 10)
 */
export default function RequiredMark({ children, after = null }) {
  return (
    <span className="field-label-text">
      {children}{' '}
      <span className="required-mark" aria-hidden="true">
        *
      </span>
      {after ? <> {after}</> : null}
    </span>
  )
}
