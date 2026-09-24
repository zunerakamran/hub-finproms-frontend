const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token) {
  if (token) localStorage.setItem('token', token)
  else localStorage.removeItem('token')
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {})
  const isFormData = options.body instanceof FormData

  if (!isFormData && !headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Accept', 'application/json')

  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    })
  } catch (err) {
    const error = new Error(err?.message === 'Failed to fetch'
      ? 'Cannot reach the API server. Is the backend running?'
      : (err?.message || 'Network error'))
    error.status = 0
    error.data = null
    throw error
  }

  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { message: text || 'Unexpected response' }
  }

  if (!response.ok) {
    const error = new Error(data?.message || 'Request failed')
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

const CLIENT_ADMIN = '/client-admin'

function adminBase(options = {}) {
  return options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  forgotPassword: (payload) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }),
  resetPassword: (payload) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  plans: () => request('/subscription-plans'),
  plan: (id) => request(`/subscription-plans/${id}`),
  settings: () => request('/settings'),
  adminPlans: (options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    return request(`${base}/subscription-plans`)
  },
  createPlan: (payload, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    const body = payload instanceof FormData ? payload : JSON.stringify(payload)
    return request(`${base}/subscription-plans`, { method: 'POST', body })
  },
  updatePlan: (id, payload, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    const body = payload instanceof FormData ? payload : JSON.stringify(payload)
    // POST so multipart image uploads work (same pattern as posts).
    return request(`${base}/subscription-plans/${id}`, {
      method: payload instanceof FormData ? 'POST' : 'PUT',
      body,
    })
  },
  deletePlan: (id, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    return request(`${base}/subscription-plans/${id}`, { method: 'DELETE' })
  },
  checkout: (planId, paymentMethod = 'stripe') =>
    request(`/subscription-plans/${planId}/checkout`, {
      method: 'POST',
      body: JSON.stringify({ payment_method: paymentMethod }),
    }),
  confirmSubscription: (sessionId) =>
    request('/subscriptions/confirm', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) }),
  mySubscriptions: () => request('/my-subscriptions'),
  myDashboard: () => request('/my-dashboard'),
  pendingBankTransfers: () => request(`${CLIENT_ADMIN}/bank-transfers/pending`),
  confirmBankTransfer: (id) =>
    request(`${CLIENT_ADMIN}/bank-transfers/${id}/confirm`, { method: 'POST' }),
  posts: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`/posts${query ? `?${query}` : ''}`)
  },
  post: (id) => request(`/posts/${id}`),
  /** Listing scroll impressions (unique reach per viewer). */
  recordPostReach: (postIds) =>
    request('/posts/reach', {
      method: 'POST',
      body: JSON.stringify({ post_ids: postIds }),
    }),
  categories: () => request('/posts/categories'),
  listCategories: () => request('/categories'),
  createCategory: (payload, options = {}) =>
    request(`${adminBase(options)}/categories`, { method: 'POST', body: JSON.stringify(payload) }),
  updateCategory: (id, payload, options = {}) =>
    request(`${adminBase(options)}/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCategory: (id, options = {}) =>
    request(`${adminBase(options)}/categories/${id}`, { method: 'DELETE' }),
  listTypes: () => request('/types'),
  createType: (payload, options = {}) =>
    request(`${adminBase(options)}/types`, { method: 'POST', body: JSON.stringify(payload) }),
  updateType: (id, payload, options = {}) =>
    request(`${adminBase(options)}/types/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteType: (id, options = {}) =>
    request(`${adminBase(options)}/types/${id}`, { method: 'DELETE' }),
  listTags: () => request('/tags'),
  createTag: (payload, options = {}) =>
    request(`${adminBase(options)}/tags`, { method: 'POST', body: JSON.stringify(payload) }),
  updateTag: (id, payload, options = {}) =>
    request(`${adminBase(options)}/tags/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTag: (id, options = {}) =>
    request(`${adminBase(options)}/tags/${id}`, { method: 'DELETE' }),

  listFirms: (params = {}, options = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`${adminBase(options)}/firms${query ? `?${query}` : ''}`)
  },
  createFirm: (payload, options = {}) =>
    request(`${adminBase(options)}/firms`, { method: 'POST', body: JSON.stringify(payload) }),
  updateFirm: (id, payload, options = {}) =>
    request(`${adminBase(options)}/firms/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteFirm: (id, options = {}) =>
    request(`${adminBase(options)}/firms/${id}`, { method: 'DELETE' }),
  purchasePost: (id, paymentMethod = null) =>
    request(`/posts/${id}/purchase`, {
      method: 'POST',
      body: JSON.stringify(paymentMethod ? { payment_method: paymentMethod } : {}),
    }),
  bundles: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`/bundles${query ? `?${query}` : ''}`)
  },
  bundle: (id) => request(`/bundles/${id}`),
  purchaseBundle: (id, paymentMethod = null) =>
    request(`/bundles/${id}/purchase`, {
      method: 'POST',
      body: JSON.stringify(paymentMethod ? { payment_method: paymentMethod } : {}),
    }),
  confirmContentPurchase: (sessionId) =>
    request('/content-purchases/confirm', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    }),
  confirmContentBankTransfer: (id) =>
    request(`${CLIENT_ADMIN}/content-bank-transfers/${id}/confirm`, { method: 'POST' }),
  adminBundles: (params = {}, options = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`${adminBase(options)}/bundles${query ? `?${query}` : ''}`)
  },
  adminBundle: (id, options = {}) => request(`${adminBase(options)}/bundles/${id}`),
  createBundle: (formData, options = {}) =>
    request(`${adminBase(options)}/bundles`, { method: 'POST', body: formData }),
  updateBundle: (id, formData, options = {}) =>
    request(`${adminBase(options)}/bundles/${id}`, { method: 'POST', body: formData }),
  deleteBundle: (id, options = {}) =>
    request(`${adminBase(options)}/bundles/${id}`, { method: 'DELETE' }),
  myPurchases: () => request('/my-purchases'),
  myInvoices: () => request('/my-invoices'),
  invoice: (id) => request(`/invoices/${id}`),
  createPost: (formData, options = {}) =>
    request(`${adminBase(options)}/posts`, { method: 'POST', body: formData }),
  updatePost: (id, formData, options = {}) =>
    request(`${adminBase(options)}/posts/${id}`, { method: 'POST', body: formData }),
  deletePost: (id, options = {}) =>
    request(`${adminBase(options)}/posts/${id}`, { method: 'DELETE' }),

  contentPushTargets: (options = {}) =>
    request(`${adminBase(options)}/content-push/targets`),
  contentPushPosts: (params = {}, options = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`${adminBase(options)}/content-push/posts${query ? `?${query}` : ''}`)
  },
  contentPushRecent: (options = {}) =>
    request(`${adminBase(options)}/content-push/recent`),
  contentPush: (payload, options = {}) =>
    request(`${adminBase(options)}/content-push`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  contentPushTestConnection: (hubId, options = {}) =>
    request(`${adminBase(options)}/content-push/hubs/${hubId}/test-connection`, {
      method: 'POST',
    }),

  getActingHub: (options = {}) => request(`${adminBase(options)}/acting-hub`),
  setActingHub: (hubId, options = {}) =>
    request(`${adminBase(options)}/acting-hub`, {
      method: 'PUT',
      body: JSON.stringify({ hub_id: hubId == null || hubId === '' ? null : Number(hubId) }),
    }),

  getActingAdvisor: () => request('/acting-advisor'),
  setActingAdvisor: (advisorId) =>
    request('/acting-advisor', {
      method: 'PUT',
      body: JSON.stringify({
        advisor_id: advisorId == null || advisorId === '' ? null : Number(advisorId),
      }),
    }),

  /** @deprecated Prefer normal CRUD while acting hub is set; hub_id is no longer required. */
  hubContentTargets: (options = {}) =>
    request(`${adminBase(options)}/hub-content/targets`),
  hubContentPosts: (params = {}, options = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`${adminBase(options)}/hub-content/posts${query ? `?${query}` : ''}`)
  },
  hubContentCreatePost: (formData, options = {}) =>
    request(`${adminBase(options)}/hub-content/posts`, { method: 'POST', body: formData }),
  hubContentUpdatePost: (postId, formData, options = {}) =>
    request(`${adminBase(options)}/hub-content/posts/${postId}`, {
      method: 'POST',
      body: formData,
    }),
  hubContentDeletePost: (postId, options = {}) =>
    request(`${adminBase(options)}/hub-content/posts/${postId}`, { method: 'DELETE' }),
  hubContentTypes: (options = {}) =>
    request(`${adminBase(options)}/hub-content/types`),
  hubContentCreateType: (payload, options = {}) =>
    request(`${adminBase(options)}/hub-content/types`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  hubContentUpdateType: (typeId, payload, options = {}) =>
    request(`${adminBase(options)}/hub-content/types/${typeId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  hubContentDeleteType: (typeId, options = {}) =>
    request(`${adminBase(options)}/hub-content/types/${typeId}`, { method: 'DELETE' }),
  hubContentCategories: (options = {}) =>
    request(`${adminBase(options)}/hub-content/categories`),
  hubContentCreateCategory: (payload, options = {}) =>
    request(`${adminBase(options)}/hub-content/categories`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  hubContentUpdateCategory: (categoryId, payload, options = {}) =>
    request(`${adminBase(options)}/hub-content/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  hubContentDeleteCategory: (categoryId, options = {}) =>
    request(`${adminBase(options)}/hub-content/categories/${categoryId}`, { method: 'DELETE' }),
  hubContentTags: (options = {}) =>
    request(`${adminBase(options)}/hub-content/tags`),
  hubContentCreateTag: (payload, options = {}) =>
    request(`${adminBase(options)}/hub-content/tags`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  hubContentUpdateTag: (tagId, payload, options = {}) =>
    request(`${adminBase(options)}/hub-content/tags/${tagId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  hubContentDeleteTag: (tagId, options = {}) =>
    request(`${adminBase(options)}/hub-content/tags/${tagId}`, { method: 'DELETE' }),
  hubContentBundles: (params = {}, options = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`${adminBase(options)}/hub-content/bundles${query ? `?${query}` : ''}`)
  },
  hubContentCreateBundle: (formData, options = {}) =>
    request(`${adminBase(options)}/hub-content/bundles`, { method: 'POST', body: formData }),
  hubContentUpdateBundle: (bundleId, formData, options = {}) =>
    request(`${adminBase(options)}/hub-content/bundles/${bundleId}`, {
      method: 'POST',
      body: formData,
    }),
  hubContentDeleteBundle: (bundleId, options = {}) =>
    request(`${adminBase(options)}/hub-content/bundles/${bundleId}`, { method: 'DELETE' }),
  adminSettings: () => request(`${CLIENT_ADMIN}/settings`),
  updateSettings: (payload) => {
    const body = payload instanceof FormData ? payload : JSON.stringify(payload)
    return request(`${CLIENT_ADMIN}/settings`, {
      method: payload instanceof FormData ? 'POST' : 'PUT',
      body,
    })
  },
  roleDisplayNames: () => request(`${CLIENT_ADMIN}/role-display-names`),
  updateRoleDisplayNames: (roles) =>
    request(`${CLIENT_ADMIN}/role-display-names`, {
      method: 'PUT',
      body: JSON.stringify({ roles }),
    }),
  complianceStatusDisplayNames: () =>
    request(`${CLIENT_ADMIN}/compliance-status-display-names`),
  updateComplianceStatusDisplayNames: (statuses) =>
    request(`${CLIENT_ADMIN}/compliance-status-display-names`, {
      method: 'PUT',
      body: JSON.stringify({ statuses }),
    }),
  powerAdminPaymentMethods: (hubId) => {
    const query = hubId ? `?hub_id=${hubId}` : ''
    return request(`/power-admin/payment-methods${query}`)
  },
  updatePowerAdminPaymentMethods: (payload) =>
    request('/power-admin/payment-methods', { method: 'PUT', body: JSON.stringify(payload) }),
  powerAdminCapabilitiesMe: () => request('/power-admin/capabilities/me'),
  powerAdminUsers: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`/power-admin/users${query ? `?${query}` : ''}`)
  },
  powerAdminUser: (id) => request(`/power-admin/users/${id}`),
  createPowerAdminUser: (payload) =>
    request('/power-admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  updatePowerAdminUser: (id, payload) =>
    request(`/power-admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deletePowerAdminUser: (id) =>
    request(`/power-admin/users/${id}`, { method: 'DELETE' }),
  updatePowerAdminCapabilities: (capabilities) =>
    request('/power-admin/capabilities', {
      method: 'PUT',
      body: JSON.stringify({ capabilities }),
    }),
  powerAdminCapabilitiesMatrix: (hubId) => {
    const query = hubId ? `?hub_id=${hubId}` : ''
    return request(`/power-admin/capabilities/matrix${query}`)
  },
  updatePowerAdminCapabilitiesMatrix: (payload) =>
    request('/power-admin/capabilities/matrix', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  currentHub: () => request('/hub'),
  powerAdminHubs: () => request('/power-admin/hubs'),
  powerAdminHub: (id) => request(`/power-admin/hubs/${id}`),
  createPowerAdminHub: (payload) =>
    request('/power-admin/hubs', { method: 'POST', body: JSON.stringify(payload) }),
  updatePowerAdminHub: (id, payload) =>
    request(`/power-admin/hubs/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  updatePowerAdminHubChecklist: (id, checklist) =>
    request(`/power-admin/hubs/${id}/checklist`, {
      method: 'PUT',
      body: JSON.stringify({ checklist }),
    }),
  advisors: (params = {}, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`${base}/advisors${query ? `?${query}` : ''}`)
  },
  discontinueAdvisor: (advisorId, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    return request(`${base}/advisors/${advisorId}/discontinue`, { method: 'POST' })
  },
  importAdvisors: (file, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    const formData = new FormData()
    formData.append('file', file)
    return request(`${base}/advisors/import`, { method: 'POST', body: formData })
  },
  advisorTemplateUrl: (options = {}) => {
    const basePath = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
    return `${base}${basePath}/advisors/template`
  },
  advisorBillingCheckout: (billingId, paymentMethod, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    return request(`${base}/advisor-billings/${billingId}/checkout`, {
      method: 'POST',
      body: JSON.stringify({ payment_method: paymentMethod }),
    })
  },
  confirmAdvisorBilling: (sessionId, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    return request(`${base}/advisor-billings/confirm`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    })
  },
  confirmAdvisorBankTransfer: (billingId, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    return request(`${base}/advisor-billings/${billingId}/confirm-bank-transfer`, {
      method: 'POST',
    })
  },
  paymentCard: () => request(`${CLIENT_ADMIN}/payment-card`),
  setupPaymentCard: () =>
    request(`${CLIENT_ADMIN}/payment-card/setup`, { method: 'POST' }),
  confirmPaymentCard: (sessionId) =>
    request(`${CLIENT_ADMIN}/payment-card/confirm`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    }),
  advisorBillingRenewal: (options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    return request(`${base}/advisor-billing-renewal`)
  },
  updateAdvisorBillingRenewal: (payload, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    return request(`${base}/advisor-billing-renewal`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  subscriberCredits: (params = {}, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`${base}/subscriber-credits${query ? `?${query}` : ''}`)
  },
  updateSubscriberCredits: (payload, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    return request(`${base}/subscriber-credits`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  advisorInvoices: (params = {}, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`${base}/advisor-invoices${query ? `?${query}` : ''}`)
  },
  powerAdminAdvisorPricing: () => request('/power-admin/advisor-pricing'),
  createPowerAdminAdvisorPricing: (payload) =>
    request('/power-admin/advisor-pricing', { method: 'POST', body: JSON.stringify(payload) }),
  updatePowerAdminAdvisorPricing: (id, payload) =>
    request(`/power-admin/advisor-pricing/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deletePowerAdminAdvisorPricing: (id) =>
    request(`/power-admin/advisor-pricing/${id}`, { method: 'DELETE' }),
  advisorPricing: (options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    return request(`${base}/advisor-pricing`)
  },
  createAdvisorPricing: (payload, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    return request(`${base}/advisor-pricing`, { method: 'POST', body: JSON.stringify(payload) })
  },
  updateAdvisorPricing: (id, payload, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    return request(`${base}/advisor-pricing/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
  },
  deleteAdvisorPricing: (id, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    return request(`${base}/advisor-pricing/${id}`, { method: 'DELETE' })
  },
  activityLogs: (params = {}, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`${base}/activity-logs${query ? `?${query}` : ''}`)
  },
  activityLogReport: (params = {}, options = {}) => {
    const base = options.asPowerAdmin ? '/power-admin' : CLIENT_ADMIN
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`${base}/activity-logs/report${query ? `?${query}` : ''}`)
  },

  hubModules: (params = {}, options = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`${adminBase(options)}/modules${query ? `?${query}` : ''}`)
  },
  updateHubModules: (payload, options = {}) => {
    const body = { ...payload }
    return request(`${adminBase(options)}/modules`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  // —— Social Media Compliance ——
  socialMediaComplianceMine: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`/social-media-compliance/requests/mine${query ? `?${query}` : ''}`)
  },
  socialMediaComplianceShow: (id) => request(`/social-media-compliance/requests/${id}`),
  socialMediaComplianceSubmit: (formData) =>
    request('/social-media-compliance/requests', { method: 'POST', body: formData }),
  socialMediaComplianceResubmit: (id, formData) =>
    request(`/social-media-compliance/requests/${id}/resubmit`, { method: 'POST', body: formData }),
  socialMediaComplianceConfirmFeedback: (id, formData = null) =>
    request(`/social-media-compliance/requests/${id}/confirm-feedback`, {
      method: 'POST',
      body: formData || new FormData(),
    }),
  socialMediaComplianceAdminRequests: (params = {}, options = {}) => {
    const base = adminBase(options)
    const path = options.queueOnly ? `${base}/social-media-compliance/queue` : `${base}/social-media-compliance/requests`
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`${path}${query ? `?${query}` : ''}`)
  },
  socialMediaComplianceAdminShow: (id, options = {}) =>
    request(`${adminBase(options)}/social-media-compliance/requests/${id}`),
  socialMediaComplianceReviewers: (options = {}) =>
    request(`${adminBase(options)}/social-media-compliance/reviewers`),
  socialMediaComplianceAssign: (id, assignedTo, options = {}) =>
    request(`${adminBase(options)}/social-media-compliance/requests/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigned_to: assignedTo }),
    }),
  socialMediaComplianceReview: (id, payload, options = {}) =>
    request(`${adminBase(options)}/social-media-compliance/requests/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  socialMediaComplianceChangeStatus: (id, payload, options = {}) =>
    request(`${adminBase(options)}/social-media-compliance/requests/${id}/change-status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  socialMediaComplianceReport: (params = {}, options = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`${adminBase(options)}/social-media-compliance/reports${query ? `?${query}` : ''}`)
  },
  socialMediaComplianceReportExport: async (params = {}, options = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    const headers = new Headers({ Accept: 'text/csv' })
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const response = await fetch(
      `${API_URL}${adminBase(options)}/social-media-compliance/reports/export${query ? `?${query}` : ''}`,
      { headers }
    )
    if (!response.ok) {
      const error = new Error('Export failed')
      error.status = response.status
      throw error
    }
    return response.blob()
  },
  socialMediaComplianceApproverWorkload: (params = {}, options = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(
      `${adminBase(options)}/social-media-compliance/charts/approver-workload${query ? `?${query}` : ''}`
    )
  },
  socialMediaComplianceAdvisorComparison: (params = {}, options = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(
      `${adminBase(options)}/social-media-compliance/charts/advisor-comparison${query ? `?${query}` : ''}`
    )
  },

  // —— General Compliance ——
  generalComplianceMine: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`/general-compliance/requests/mine${query ? `?${query}` : ''}`)
  },
  generalComplianceShow: (id) => request(`/general-compliance/requests/${id}`),
  generalComplianceSubmit: (formData) =>
    request('/general-compliance/requests', { method: 'POST', body: formData }),
  generalComplianceResubmit: (id, formData) =>
    request(`/general-compliance/requests/${id}/resubmit`, { method: 'POST', body: formData }),
  generalComplianceConfirmFeedback: (id, formData = null) =>
    request(`/general-compliance/requests/${id}/confirm-feedback`, {
      method: 'POST',
      body: formData || new FormData(),
    }),
  generalComplianceAdminRequests: (params = {}, options = {}) => {
    const base = adminBase(options)
    const path = options.queueOnly
      ? `${base}/general-compliance/queue`
      : `${base}/general-compliance/requests`
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`${path}${query ? `?${query}` : ''}`)
  },
  generalComplianceAdminShow: (id, options = {}) =>
    request(`${adminBase(options)}/general-compliance/requests/${id}`),
  generalComplianceReviewers: (options = {}) =>
    request(`${adminBase(options)}/general-compliance/reviewers`),
  generalComplianceAssign: (id, assignedTo, options = {}) =>
    request(`${adminBase(options)}/general-compliance/requests/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigned_to: assignedTo }),
    }),
  generalComplianceReview: (id, payload, options = {}) =>
    request(`${adminBase(options)}/general-compliance/requests/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  generalComplianceChangeStatus: (id, payload, options = {}) =>
    request(`${adminBase(options)}/general-compliance/requests/${id}/change-status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  generalComplianceReport: (params = {}, options = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`${adminBase(options)}/general-compliance/reports${query ? `?${query}` : ''}`)
  },
  generalComplianceReportExport: async (params = {}, options = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    const headers = new Headers({ Accept: 'text/csv' })
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const response = await fetch(
      `${API_URL}${adminBase(options)}/general-compliance/reports/export${query ? `?${query}` : ''}`,
      { headers }
    )
    if (!response.ok) {
      const error = new Error('Export failed')
      error.status = response.status
      throw error
    }
    return response.blob()
  },
  generalComplianceApproverWorkload: (params = {}, options = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(
      `${adminBase(options)}/general-compliance/charts/approver-workload${query ? `?${query}` : ''}`
    )
  },
  generalComplianceAdvisorComparison: (params = {}, options = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(
      `${adminBase(options)}/general-compliance/charts/advisor-comparison${query ? `?${query}` : ''}`
    )
  },

  // —— Website Compliance ——
  websiteComplianceTemplates: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`/website-compliance/templates${query ? `?${query}` : ''}`)
  },
  websiteComplianceTemplate: (id) => request(`/website-compliance/templates/${id}`),
  websiteComplianceCreateTemplate: (payload) =>
    request('/website-compliance/templates', { method: 'POST', body: JSON.stringify(payload) }),
  websiteComplianceUpdateTemplate: (id, payload) =>
    request(`/website-compliance/templates/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  websiteComplianceDeleteTemplate: (id) =>
    request(`/website-compliance/templates/${id}`, { method: 'DELETE' }),
  websiteComplianceTemplatePages: (id) => request(`/website-compliance/templates/${id}/pages`),
  websiteCompliancePages: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`/website-compliance/pages${query ? `?${query}` : ''}`)
  },
  websiteCompliancePage: (id) => request(`/website-compliance/pages/${id}`),
  websiteComplianceCreatePage: (payload) =>
    request('/website-compliance/pages', { method: 'POST', body: JSON.stringify(payload) }),
  websiteComplianceUpdatePage: (id, payload) =>
    request(`/website-compliance/pages/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  websiteComplianceDeletePage: (id) =>
    request(`/website-compliance/pages/${id}`, { method: 'DELETE' }),
  websiteCompliancePageSections: (pageId, params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`/website-compliance/pages/${pageId}/sections${query ? `?${query}` : ''}`)
  },
  websiteComplianceSection: (id) => request(`/website-compliance/sections/${id}`),
  websiteComplianceCreateSection: (payload) =>
    request('/website-compliance/sections', { method: 'POST', body: JSON.stringify(payload) }),
  websiteComplianceUpdateSection: (id, payload) =>
    request(`/website-compliance/sections/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  websiteComplianceLockSection: (id) =>
    request(`/website-compliance/sections/${id}/lock`, { method: 'POST' }),
  websiteComplianceUnlockSection: (id) =>
    request(`/website-compliance/sections/${id}/unlock`, { method: 'POST' }),
  websiteComplianceChangeRequests: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`/website-compliance/change-requests${query ? `?${query}` : ''}`)
  },
  websiteComplianceCreateChangeRequest: (body) =>
    request('/website-compliance/change-requests', { method: 'POST', body: JSON.stringify(body) }),
  websiteComplianceChangeRequestPreview: (id, params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString()
    return request(`/website-compliance/change-requests/${id}/preview${query ? `?${query}` : ''}`)
  },
  websiteComplianceAssignChangeRequest: (id) =>
    request(`/website-compliance/change-requests/${id}/assign`, { method: 'POST' }),
  websiteComplianceAssignToApprover: (id, payload) =>
    request(`/website-compliance/change-requests/${id}/assign-to-approver`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  websiteComplianceApproveChangeRequest: (id, payload) =>
    request(`/website-compliance/change-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  websiteComplianceRejectChangeRequest: (id, payload) =>
    request(`/website-compliance/change-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  websiteComplianceShowChangeRequest: (id) =>
    request(`/website-compliance/change-requests/${id}`),
  websiteComplianceResubmitChangeRequest: (id, body) =>
    request(`/website-compliance/change-requests/${id}/resubmit`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  websiteComplianceConfirmChangeRequestFeedback: (id, body) =>
    request(`/website-compliance/change-requests/${id}/confirm-feedback`, {
      method: 'POST',
      body: JSON.stringify(body || {}),
    }),
  websiteComplianceApproveChangeRequestWithFeedback: (id, payload) =>
    request(`/website-compliance/change-requests/${id}/approve-with-feedback`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  websiteComplianceChangeRequestStatus: (id, payload) =>
    request(`/website-compliance/change-requests/${id}/change-status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  websiteComplianceTemplateRequests: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`/website-compliance/template-requests${query ? `?${query}` : ''}`)
  },
  websiteComplianceCreateTemplateRequest: (body) =>
    request('/website-compliance/template-requests', { method: 'POST', body: JSON.stringify(body) }),
  websiteComplianceDeployTemplateRequest: (id, body) =>
    request(`/website-compliance/template-requests/${id}/deploy`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  websiteComplianceRejectTemplateRequest: (id, body = {}) =>
    request(`/website-compliance/template-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  websiteComplianceAssignAdvisor: (id, body) =>
    request(`/website-compliance/template-requests/${id}/assign-advisor`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  websiteComplianceTemplateRequestSections: (id) =>
    request(`/website-compliance/template-requests/${id}/sections`),
  websiteComplianceUpdateTemplateRequestSections: (id, body) =>
    request(`/website-compliance/template-requests/${id}/sections`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  websiteCompliancePublishContent: (id, body) =>
    request(`/website-compliance/template-requests/${id}/publish-content`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  websiteComplianceUploadImage: (formData) =>
    request('/website-compliance/upload-image', { method: 'POST', body: formData }),
  websiteComplianceReportSummary: () => request('/website-compliance/reports/summary'),
  websiteComplianceRefreshReportSummary: () =>
    request('/website-compliance/reports/summary/refresh', { method: 'POST' }),
  websiteComplianceReports: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`/website-compliance/reports${query ? `?${query}` : ''}`)
  },
  websiteComplianceAdvisors: () => request('/website-compliance/advisors'),
  websiteComplianceReviewers: () => request('/website-compliance/reviewers'),
  websiteCompliancePublicPages: () => request('/website-compliance/public/pages'),
}

/** Absolute API base for Website Compliance asset URLs (no trailing slash). */
export const WEBSITE_COMPLIANCE_API_BASE = `${API_URL}/website-compliance`

/** Live template preview host (cPanel showcase sites). Prefer hub.frontend_url at runtime. */
export const WC_TEMPLATE_PREVIEW_BASE = (import.meta.env.VITE_WC_TEMPLATE_PREVIEW_URL || '').replace(/\/$/, '')

/**
 * Resolve a WC upload path or absolute URL for <img src> / iframes.
 */
export function websiteComplianceAssetUrl(pathOrUrl) {
  if (!pathOrUrl) return ''
  if (/^(data:|blob:)/i.test(pathOrUrl)) return pathOrUrl
  const base = WEBSITE_COMPLIANCE_API_BASE.replace(/\/$/, '')
  const isUploaded =
    typeof pathOrUrl === 'string' &&
    (pathOrUrl.startsWith('/uploaded-images') ||
      pathOrUrl.includes('/uploaded-images/') ||
      pathOrUrl.includes('/website-compliance/uploaded-images') ||
      pathOrUrl.startsWith('/uploads') ||
      pathOrUrl.includes('/uploads/'))
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(pathOrUrl) && isUploaded) {
    const name = pathOrUrl.split('/').pop()
    return `${base}/uploaded-images/${name}`
  }
  if (/^(https?:)/i.test(pathOrUrl)) return pathOrUrl
  if (
    pathOrUrl.startsWith('/uploaded-images') ||
    pathOrUrl.includes('/uploaded-images/') ||
    pathOrUrl.includes('/website-compliance/uploaded-images/')
  ) {
    const name = pathOrUrl.split('/').pop()
    return `${base}/uploaded-images/${name}`
  }
  if (pathOrUrl.startsWith('/uploads') || pathOrUrl.includes('/uploads/')) {
    const name = pathOrUrl.split('/').pop()
    return `${base}/uploaded-images/${name}`
  }
  if (pathOrUrl.startsWith('/website-compliance/')) {
    return `${API_URL.replace(/\/$/, '')}${pathOrUrl}`
  }
  if (pathOrUrl.startsWith('/')) return `${base}${pathOrUrl}`
  return pathOrUrl
}
