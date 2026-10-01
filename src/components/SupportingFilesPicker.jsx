import FileDropzone from './FileDropzone'
import {
  COMPLIANCE_SUPPORTING_FILES_ACCEPT,
  COMPLIANCE_SUPPORTING_FILES_HELPER,
  COMPLIANCE_SUPPORTING_FILES_MAX,
  sliceSupportingFiles,
} from '../utils/complianceSupportingFiles'

/**
 * Optional multi-file picker for compliance supporting documents.
 */
export default function SupportingFilesPicker({
  files = [],
  onChange,
  id = 'compliance-supporting-files',
  className = '',
  label = 'Supporting files (optional)',
  hint = COMPLIANCE_SUPPORTING_FILES_HELPER,
  disabled = false,
}) {
  return (
    <FileDropzone
      id={id}
      className={className}
      label={label}
      hint={hint}
      accept={COMPLIANCE_SUPPORTING_FILES_ACCEPT}
      multiple
      maxFiles={COMPLIANCE_SUPPORTING_FILES_MAX}
      files={files}
      disabled={disabled}
      onChange={(next) => onChange(sliceSupportingFiles(next))}
    />
  )
}
