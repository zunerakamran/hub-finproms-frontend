function normalizeContent(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function parseContentArray(str) {
  if (!str) return null
  if (Array.isArray(str)) return str
  if (typeof str === 'object') return null
  try {
    const parsed = JSON.parse(str)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function pickCurrentContent(item) {
  return item?.current_content
    ?? item?.original_content
    ?? item?.previous_content
    ?? item?.published_content
    ?? item?.live_content
    ?? item?.content_before
    ?? item?.before_content
    ?? item?.old_content
    ?? item?.submitted_current_content
    ?? item?.snapshot_content
    ?? null
}

export function pickProposedContent(item) {
  return item?.proposed_content
    ?? item?.draft_content
    ?? item?.content
    ?? item?.submitted_proposed_content
    ?? null
}

function pickSectionName(item, fallbackSection) {
  return item?.section_name
    ?? item?.section?.name
    ?? fallbackSection?.name
    ?? 'Section'
}

function editsFromRelation(req) {
  const relation = req.section_edits
    ?? req.sectionEdits
    ?? req.edits
    ?? req.change_request_edits
    ?? req.change_request_sections

  if (!Array.isArray(relation) || relation.length === 0) return null

  return relation.map((item) => ({
    section_name: pickSectionName(item, item.section),
    current_content: pickCurrentContent(item),
    proposed_content: pickProposedContent(item),
  }))
}

function editsFromProposedContent(req) {
  const batch = parseContentArray(req.proposed_content)
  if (!batch) return null

  return batch.map((item) => ({
    section_name: pickSectionName(item, req.section),
    current_content: pickCurrentContent(item),
    proposed_content: pickProposedContent(item),
  }))
}

export function buildPreviewFromRequest(req) {
  const relationEdits = editsFromRelation(req)
  if (relationEdits?.length) {
    return { is_batch: true, edits: relationEdits }
  }

  const batchEdits = editsFromProposedContent(req)
  if (batchEdits?.length) {
    return { is_batch: true, edits: batchEdits }
  }

  const current = pickCurrentContent(req)
  const proposed = pickProposedContent(req)
  if (!proposed) return null

  return {
    is_batch: false,
    current_content: current,
    proposed_content: proposed,
  }
}

/** Build a preview payload from a single change-request version row. */
export function buildPreviewFromVersion(version) {
  if (!version) return null

  if (Array.isArray(version.section_edits) && version.section_edits.length) {
    return {
      is_batch: true,
      edits: version.section_edits.map((item) => ({
        section_id: item.section_id,
        section_name: pickSectionName(item),
        current_content: pickCurrentContent(item),
        proposed_content: pickProposedContent(item),
      })),
      version_number: version.version_number,
    }
  }

  const built = buildPreviewFromRequest({
    proposed_content: version.proposed_content,
    section_edits: version.section_edits,
  })
  if (!built) return null
  return { ...built, version_number: version.version_number }
}

export async function fetchLivePreview(api, requestId, { version = null } = {}) {
  const path = version != null
    ? `/change-requests/${requestId}/preview?version=${encodeURIComponent(version)}`
    : `/change-requests/${requestId}/preview`
  const res = await api.get(path)
  return res.data
}

export async function resolveVersionPreview(api, requestId, version, { brandingRequest = null } = {}) {
  const local = buildPreviewFromVersion(version)
  try {
    const live = await fetchLivePreview(api, requestId, { version: version?.version_number })
    if (previewHasStoredSnapshot(local)) {
      return preferStoredPreview(live, local)
    }
    return live
  } catch {
    if (local && brandingRequest) {
      try {
        const branded = await fetchLivePreview(api, requestId)
        return {
          ...branded,
          ...local,
          is_batch: local.is_batch,
          edits: local.edits,
          current_content: local.current_content,
          proposed_content: local.proposed_content,
          version_number: version?.version_number,
        }
      } catch {
        return local
      }
    }
    return local
  }
}

export function clonePreviewData(data) {
  if (!data) return null
  try {
    return JSON.parse(JSON.stringify(data))
  } catch {
    return data
  }
}

export function previewHasStoredSnapshot(preview) {
  if (!preview) return false

  if (preview.is_batch && Array.isArray(preview.edits)) {
    return preview.edits.some(
      (item) => pickCurrentContent(item) != null && pickProposedContent(item) != null
    )
  }

  return pickCurrentContent(preview) != null && pickProposedContent(preview) != null
}

export function previewHasDistinctSides(preview) {
  if (!preview) return false
  return !previewSidesMatch(preview)
}

export function previewSidesMatch(preview) {
  if (!preview) return false

  if (preview.is_batch && Array.isArray(preview.edits)) {
    if (preview.edits.length === 0) return true
    return preview.edits.every(
      (item) => normalizeContent(pickCurrentContent(item)) === normalizeContent(pickProposedContent(item))
    )
  }

  return normalizeContent(pickCurrentContent(preview)) === normalizeContent(pickProposedContent(preview))
}

function mergeEdit(current, stored) {
  const storedCurrent = pickCurrentContent(stored)
  const storedProposed = pickProposedContent(stored)
  const liveCurrent = pickCurrentContent(current)
  const liveProposed = pickProposedContent(current)

  return {
    section_name: pickSectionName(stored, null) || pickSectionName(current, null),
    current_content: storedCurrent ?? liveCurrent,
    proposed_content: storedProposed ?? liveProposed,
  }
}

export function preferStoredPreview(apiPreview, storedPreview) {
  if (!storedPreview) return apiPreview
  if (!apiPreview) return storedPreview

  if (storedPreview.is_batch && apiPreview.is_batch) {
    const storedEdits = storedPreview.edits || []
    const apiEdits = apiPreview.edits || []
    const mergedEdits = apiEdits.map((apiEdit, idx) => {
      const storedEdit = storedEdits[idx]
        ?? storedEdits.find((item) => pickSectionName(item) === pickSectionName(apiEdit))
      if (!storedEdit) return apiEdit

      const storedCurrent = pickCurrentContent(storedEdit)
      const apiCurrent = pickCurrentContent(apiEdit)
      const apiProposed = pickProposedContent(apiEdit)
      const storedProposed = pickProposedContent(storedEdit)

      if (
        storedCurrent != null
        && normalizeContent(storedCurrent) !== normalizeContent(storedProposed ?? apiProposed)
      ) {
        return mergeEdit(apiEdit, storedEdit)
      }

      if (
        storedCurrent != null
        && normalizeContent(apiCurrent) === normalizeContent(apiProposed)
        && normalizeContent(storedCurrent) !== normalizeContent(apiProposed)
      ) {
        return mergeEdit(apiEdit, storedEdit)
      }

      return apiEdit
    })

    return { ...apiPreview, is_batch: true, edits: mergedEdits }
  }

  if (!storedPreview.is_batch && !apiPreview.is_batch) {
    const storedCurrent = pickCurrentContent(storedPreview)
    const apiCurrent = pickCurrentContent(apiPreview)
    const apiProposed = pickProposedContent(apiPreview)

    if (
      storedCurrent != null
      && normalizeContent(apiCurrent) === normalizeContent(apiProposed)
      && normalizeContent(storedCurrent) !== normalizeContent(apiProposed)
    ) {
      return {
        ...apiPreview,
        current_content: storedCurrent,
        proposed_content: pickProposedContent(storedPreview) ?? apiProposed,
      }
    }
  }

  return apiPreview
}

export function isHistoricalRequest(req) {
  return ['approved', 'rejected', 'scheduled', 'approved_with_feedback'].includes(req?.status)
}

async function fetchRequestDetail(api, req) {
  try {
    const res = await api.get(`/change-requests/${req.id}`)
    return { ...req, ...(res.data?.data ?? res.data) }
  } catch {
    return req
  }
}

export async function resolveRequestPreview(api, req, { cachedPreview = null } = {}) {
  const historical = isHistoricalRequest(req)

  if (cachedPreview && (historical || previewHasDistinctSides(cachedPreview))) {
    return clonePreviewData(cachedPreview)
  }

  const detailedReq = historical ? await fetchRequestDetail(api, req) : req
  const storedPreview = buildPreviewFromRequest(detailedReq)

  if (historical && previewHasStoredSnapshot(storedPreview) && previewHasDistinctSides(storedPreview)) {
    return storedPreview
  }

  const livePreview = await fetchLivePreview(api, req.id)
  let nextPreview = livePreview

  if (previewHasStoredSnapshot(storedPreview)) {
    nextPreview = preferStoredPreview(nextPreview, storedPreview)
  }

  if (cachedPreview && previewSidesMatch(nextPreview)) {
    return clonePreviewData(cachedPreview)
  }

  return nextPreview
}

export async function capturePreviewSnapshot(api, requestId, existingPreview = null) {
  if (existingPreview) return clonePreviewData(existingPreview)
  return clonePreviewData(await fetchLivePreview(api, requestId))
}

export const PREVIEW_SNAPSHOT_STORAGE_KEY = 'approver_preview_snapshots_v1'

export function loadPreviewSnapshots() {
  try {
    const raw = sessionStorage.getItem(PREVIEW_SNAPSHOT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function savePreviewSnapshot(snapshots, requestId, preview) {
  const clone = clonePreviewData(preview)
  if (!clone) return snapshots
  const next = { ...snapshots, [requestId]: clone }
  try {
    sessionStorage.setItem(PREVIEW_SNAPSHOT_STORAGE_KEY, JSON.stringify(next))
  } catch { /* ignore quota errors */ }
  return next
}
