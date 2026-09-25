/**
 * Axios-shaped shim over hub `api.websiteCompliance*` helpers.
 * Ported dashboard code expects `res.data` and `err.response?.data`.
 */
import { api as hubApi } from '../api/client'

function wrap(data) {
  return { data }
}

function rethrow(err) {
  if (err && !err.response) {
    err.response = {
      data: err.data || { message: err.message },
      status: err.status,
    }
  }
  throw err
}

function stripQuery(path) {
  return String(path || '')
    .replace(/^\//, '')
    .split('?')[0]
}

function parseQuery(path, configParams = {}) {
  const raw = String(path || '')
  const qIndex = raw.indexOf('?')
  const fromPath = {}
  if (qIndex >= 0) {
    new URLSearchParams(raw.slice(qIndex + 1)).forEach((v, k) => {
      fromPath[k] = v
    })
  }
  return { ...fromPath, ...(configParams || {}) }
}

async function get(path, config = {}) {
  const p = stripQuery(path)
  const params = parseQuery(path, config.params)
  try {
    if (p === 'templates') return wrap(await hubApi.websiteComplianceTemplates(params))
    if (/^templates\/\d+$/.test(p)) {
      return wrap(await hubApi.websiteComplianceTemplate(p.split('/')[1]))
    }
    if (/^templates\/\d+\/pages$/.test(p)) {
      return wrap(await hubApi.websiteComplianceTemplatePages(p.split('/')[1]))
    }
    if (p === 'pages') return wrap(await hubApi.websiteCompliancePages(params))
    if (/^pages\/\d+$/.test(p)) return wrap(await hubApi.websiteCompliancePage(p.split('/')[1]))
    if (/^pages\/\d+\/sections$/.test(p)) {
      return wrap(await hubApi.websiteCompliancePageSections(p.split('/')[1], params))
    }
    if (/^sections\/\d+$/.test(p)) return wrap(await hubApi.websiteComplianceSection(p.split('/')[1]))
    if (p === 'change-requests') return wrap(await hubApi.websiteComplianceChangeRequests(params))
    if (/^change-requests\/\d+$/.test(p)) {
      return wrap(await hubApi.websiteComplianceShowChangeRequest(p.split('/')[1]))
    }
    if (/^change-requests\/\d+\/preview$/.test(p)) {
      const id = p.split('/')[1]
      return wrap(await hubApi.websiteComplianceChangeRequestPreview(id, params))
    }
    if (p === 'template-requests') return wrap(await hubApi.websiteComplianceTemplateRequests(params))
    if (/^template-requests\/\d+\/sections$/.test(p)) {
      return wrap(await hubApi.websiteComplianceTemplateRequestSections(p.split('/')[1]))
    }
    if (p === 'reports/summary' || p === 'reports') {
      if (p === 'reports') return wrap(await hubApi.websiteComplianceReports(params))
      return wrap(await hubApi.websiteComplianceReportSummary())
    }
    if (p === 'advisors') return wrap(await hubApi.websiteComplianceAdvisors())
    if (p === 'reviewers' || p === 'users') {
      // Approver picker: roles with wc_review_change_requests on this hub.
      const list = await hubApi.websiteComplianceReviewers()
      return wrap(Array.isArray(list) ? list : list?.data || [])
    }
    if (p === 'public/pages') return wrap(await hubApi.websiteCompliancePublicPages())
    throw new Error(`WC API GET not mapped: ${path}`)
  } catch (err) {
    rethrow(err)
  }
}

async function post(path, body, _config = {}) {
  const p = stripQuery(path)
  try {
    if (p === 'upload-image' || p === 'upload-image/') {
      return wrap(await hubApi.websiteComplianceUploadImage(body))
    }
    if (p === 'templates') return wrap(await hubApi.websiteComplianceCreateTemplate(body))
    if (p === 'pages') return wrap(await hubApi.websiteComplianceCreatePage(body))
    if (p === 'sections') return wrap(await hubApi.websiteComplianceCreateSection(body))
    if (/^sections\/\d+\/lock$/.test(p)) {
      return wrap(await hubApi.websiteComplianceLockSection(p.split('/')[1]))
    }
    if (/^sections\/\d+\/unlock$/.test(p)) {
      return wrap(await hubApi.websiteComplianceUnlockSection(p.split('/')[1]))
    }
    if (p === 'change-requests') return wrap(await hubApi.websiteComplianceCreateChangeRequest(body))
    if (/^change-requests\/\d+\/assign$/.test(p)) {
      return wrap(await hubApi.websiteComplianceAssignChangeRequest(p.split('/')[1]))
    }
    if (/^change-requests\/\d+\/assign-to-approver$/.test(p)) {
      return wrap(await hubApi.websiteComplianceAssignToApprover(p.split('/')[1], body))
    }
    if (/^change-requests\/\d+\/approve$/.test(p)) {
      return wrap(await hubApi.websiteComplianceApproveChangeRequest(p.split('/')[1], body))
    }
    if (/^change-requests\/\d+\/reject$/.test(p)) {
      return wrap(await hubApi.websiteComplianceRejectChangeRequest(p.split('/')[1], body))
    }
    if (/^change-requests\/\d+\/resubmit$/.test(p)) {
      return wrap(await hubApi.websiteComplianceResubmitChangeRequest(p.split('/')[1], body))
    }
    if (/^change-requests\/\d+\/confirm-feedback$/.test(p)) {
      return wrap(await hubApi.websiteComplianceConfirmChangeRequestFeedback(p.split('/')[1], body))
    }
    if (/^change-requests\/\d+\/approve-with-feedback$/.test(p)) {
      return wrap(await hubApi.websiteComplianceApproveChangeRequestWithFeedback(p.split('/')[1], body))
    }
    if (/^change-requests\/\d+\/change-status$/.test(p)) {
      return wrap(await hubApi.websiteComplianceChangeRequestStatus(p.split('/')[1], body))
    }
    if (p === 'template-requests') return wrap(await hubApi.websiteComplianceCreateTemplateRequest(body))
    if (/^template-requests\/\d+\/deploy$/.test(p)) {
      return wrap(await hubApi.websiteComplianceDeployTemplateRequest(p.split('/')[1], body))
    }
    if (/^template-requests\/\d+\/reject$/.test(p)) {
      return wrap(await hubApi.websiteComplianceRejectTemplateRequest(p.split('/')[1], body || {}))
    }
    if (/^template-requests\/\d+\/assign-advisor$/.test(p)) {
      return wrap(await hubApi.websiteComplianceAssignAdvisor(p.split('/')[1], body))
    }
    if (/^template-requests\/\d+\/publish-content$/.test(p)) {
      return wrap(await hubApi.websiteCompliancePublishContent(p.split('/')[1], body))
    }
    if (p === 'reports/summary/refresh') {
      return wrap(await hubApi.websiteComplianceRefreshReportSummary())
    }
    throw new Error(`WC API POST not mapped: ${path}`)
  } catch (err) {
    rethrow(err)
  }
}

async function put(path, body, _config = {}) {
  const p = stripQuery(path)
  try {
    if (/^templates\/\d+$/.test(p)) {
      return wrap(await hubApi.websiteComplianceUpdateTemplate(p.split('/')[1], body))
    }
    if (/^pages\/\d+$/.test(p)) {
      return wrap(await hubApi.websiteComplianceUpdatePage(p.split('/')[1], body))
    }
    if (/^sections\/\d+$/.test(p)) {
      return wrap(await hubApi.websiteComplianceUpdateSection(p.split('/')[1], body))
    }
    if (/^template-requests\/\d+\/sections$/.test(p)) {
      return wrap(await hubApi.websiteComplianceUpdateTemplateRequestSections(p.split('/')[1], body))
    }
    if (/^template-requests\/\d+\/branding$/.test(p)) {
      return wrap(await hubApi.websiteComplianceUpdateTemplateRequestBranding(p.split('/')[1], body))
    }
    throw new Error(`WC API PUT not mapped: ${path}`)
  } catch (err) {
    rethrow(err)
  }
}

async function del(path) {
  const p = stripQuery(path)
  try {
    if (/^templates\/\d+$/.test(p)) {
      return wrap(await hubApi.websiteComplianceDeleteTemplate(p.split('/')[1]))
    }
    if (/^pages\/\d+$/.test(p)) {
      return wrap(await hubApi.websiteComplianceDeletePage(p.split('/')[1]))
    }
    throw new Error(`WC API DELETE not mapped: ${path}`)
  } catch (err) {
    rethrow(err)
  }
}

const wcApi = {
  get,
  post,
  put,
  delete: del,
}

export default wcApi
export { wcApi }
