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
  purchasePost: (id) => request(`/posts/${id}/purchase`, { method: 'POST' }),
  bundles: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`/bundles${query ? `?${query}` : ''}`)
  },
  bundle: (id) => request(`/bundles/${id}`),
  purchaseBundle: (id) => request(`/bundles/${id}/purchase`, { method: 'POST' }),
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
  adminSettings: () => request(`${CLIENT_ADMIN}/settings`),
  updateSettings: (payload) => {
    const body = payload instanceof FormData ? payload : JSON.stringify(payload)
    return request(`${CLIENT_ADMIN}/settings`, {
      method: payload instanceof FormData ? 'POST' : 'PUT',
      body,
    })
  },
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
}
