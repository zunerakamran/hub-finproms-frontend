/** Shared optional supporting files for GC / SMC / WC compliance flows. */

export const COMPLIANCE_SUPPORTING_FILES_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.zip'

export const COMPLIANCE_SUPPORTING_FILES_HELPER =
  'PDF, Office, images, or ZIP — up to 10 files, 10 MB each.'

export const COMPLIANCE_SUPPORTING_FILES_MAX = 10

export const SUPPORTING_FILE_ROLE_LABELS = {
  advisor: 'Advisor',
  approver: 'Approver',
  manager: 'Manager',
}

export function sliceSupportingFiles(list) {
  return Array.from(list || []).slice(0, COMPLIANCE_SUPPORTING_FILES_MAX)
}

export function appendSupportingFiles(form, files) {
  sliceSupportingFiles(files).forEach((file) => form.append('supporting_files[]', file))
}

/** Primary GC submission content files (distinct from supporting_files). */
export function appendComplianceAttachments(form, files) {
  sliceSupportingFiles(files).forEach((file) => form.append('attachments[]', file))
}

/**
 * Supporting files for a version/request — never falls back to `attachments`
 * (those are primary content on General Compliance).
 */
export function resolveComplianceSupportingFiles(rowOrVersion) {
  if (!rowOrVersion) return []
  const primary = rowOrVersion.supporting_files
  return Array.isArray(primary) ? primary : []
}

/** Primary GC attachments on a version/request. */
export function resolveComplianceAttachments(rowOrVersion) {
  if (!rowOrVersion) return []
  const list = rowOrVersion.attachments
  return Array.isArray(list) ? list : []
}

export function supportingFileRoleLabel(file) {
  if (!file) return null
  const role = file.uploaded_by_role
  if (role && SUPPORTING_FILE_ROLE_LABELS[role]) return SUPPORTING_FILE_ROLE_LABELS[role]
  return null
}

/**
 * Build JSON body or FormData for review / change-status / WC decision endpoints.
 * @param {Record<string, string>} fields
 * @param {File[]|FileList} [files]
 */
export function compliancePostBody(fields, files) {
  const picked = sliceSupportingFiles(files)
  if (!picked.length) return fields
  const form = new FormData()
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value != null && value !== '') form.append(key, value)
  })
  appendSupportingFiles(form, picked)
  return form
}

/**
 * Website change-request submit / resubmit / confirm with optional files.
 * @param {object[]} sectionEdits
 * @param {File[]|FileList} [supportingFiles]
 */
export function buildChangeRequestBody(sectionEdits, supportingFiles) {
  const picked = sliceSupportingFiles(supportingFiles)
  if (!picked.length) {
    return { section_edits: sectionEdits }
  }
  const form = new FormData()
  form.append('section_edits', JSON.stringify(sectionEdits))
  appendSupportingFiles(form, picked)
  return form
}
