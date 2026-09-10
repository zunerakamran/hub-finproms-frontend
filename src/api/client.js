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

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  plans: () => request('/subscription-plans'),
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
  createCategory: (payload) =>
    request(`${CLIENT_ADMIN}/categories`, { method: 'POST', body: JSON.stringify(payload) }),
  updateCategory: (id, payload) =>
    request(`${CLIENT_ADMIN}/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCategory: (id) => request(`${CLIENT_ADMIN}/categories/${id}`, { method: 'DELETE' }),
  listTypes: () => request('/types'),
  createType: (payload) =>
    request(`${CLIENT_ADMIN}/types`, { method: 'POST', body: JSON.stringify(payload) }),
  updateType: (id, payload) =>
    request(`${CLIENT_ADMIN}/types/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteType: (id) => request(`${CLIENT_ADMIN}/types/${id}`, { method: 'DELETE' }),
  listTags: () => request('/tags'),
  createTag: (payload) => request(`${CLIENT_ADMIN}/tags`, { method: 'POST', body: JSON.stringify(payload) }),
  updateTag: (id, payload) =>
    request(`${CLIENT_ADMIN}/tags/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTag: (id) => request(`${CLIENT_ADMIN}/tags/${id}`, { method: 'DELETE' }),
  purchasePost: (id) => request(`/posts/${id}/purchase`, { method: 'POST' }),
  myPurchases: () => request('/my-purchases'),
  myInvoices: () => request('/my-invoices'),
  invoice: (id) => request(`/invoices/${id}`),
  createPost: (formData) => request(`${CLIENT_ADMIN}/posts`, { method: 'POST', body: formData }),
  updatePost: (id, formData) => request(`${CLIENT_ADMIN}/posts/${id}`, { method: 'POST', body: formData }),
  deletePost: (id) => request(`${CLIENT_ADMIN}/posts/${id}`, { method: 'DELETE' }),
  adminSettings: () => request(`${CLIENT_ADMIN}/settings`),
  updateSettings: (payload) =>
    request(`${CLIENT_ADMIN}/settings`, { method: 'PUT', body: JSON.stringify(payload) }),
  powerAdminPaymentMethods: (hubId) => {
    const query = hubId ? `?hub_id=${hubId}` : ''
    return request(`/power-admin/payment-methods${query}`)
  },
  updatePowerAdminPaymentMethods: (payload) =>
    request('/power-admin/payment-methods', { method: 'PUT', body: JSON.stringify(payload) }),
  powerAdminCapabilitiesMe: () => request('/power-admin/capabilities/me'),
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
