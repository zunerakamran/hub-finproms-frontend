import {
  COMPLIANCE_SUPPORTING_FILES_ACCEPT,
  COMPLIANCE_SUPPORTING_FILES_HELPER,
  sliceSupportingFiles,
} from '../utils/complianceSupportingFiles'
import { formatGcFileSize } from '../utils/generalCompliance'

/**
 * Optional multi-file picker for compliance supporting documents.
 */
export default function SupportingFilesPicker({
  files = [],
  onChange,
  id = 'compliance-supporting-files',
  className = '',
}) {
  return (
    <label className={className}>
      Supporting files (optional)
      <span className="field-hint">{COMPLIANCE_SUPPORTING_FILES_HELPER}</span>
      <input
        id={id}
        type="file"
        accept={COMPLIANCE_SUPPORTING_FILES_ACCEPT}
        multiple
        onChange={(e) => onChange(sliceSupportingFiles(e.target.files))}
      />
      {files.length > 0 ? (
        <ul className="gc-attach-list">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`}>
              {file.name}{' '}
              <span className="muted">({formatGcFileSize(file.size)})</span>
            </li>
          ))}
        </ul>
      ) : null}
    </label>
  )
}
