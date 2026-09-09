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

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

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
  adminPlans: () => request(`${CLIENT_ADMIN}/subscription-plans`),
  createPlan: (payload) =>
    request(`${CLIENT_ADMIN}/subscription-plans`, { method: 'POST', body: JSON.stringify(payload) }),
  updatePlan: (id, payload) =>
    request(`${CLIENT_ADMIN}/subscription-plans/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deletePlan: (id) => request(`${CLIENT_ADMIN}/subscription-plans/${id}`, { method: 'DELETE' }),
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
  powerAdminPaymentMethods: () => request('/power-admin/payment-methods'),
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
}
