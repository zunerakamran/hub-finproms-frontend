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

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  plans: () => request('/subscription-plans'),
  checkout: (planId) => request(`/subscription-plans/${planId}/checkout`, { method: 'POST' }),
  confirmSubscription: (sessionId) =>
    request('/subscriptions/confirm', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) }),
  mySubscriptions: () => request('/my-subscriptions'),
  posts: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString()
    return request(`/posts${query ? `?${query}` : ''}`)
  },
  post: (id) => request(`/posts/${id}`),
  categories: () => request('/posts/categories'),
  purchasePost: (id) => request(`/posts/${id}/purchase`, { method: 'POST' }),
  myPurchases: () => request('/my-purchases'),
  createPost: (formData) => request('/admin/posts', { method: 'POST', body: formData }),
  updatePost: (id, formData) => request(`/admin/posts/${id}`, { method: 'POST', body: formData }),
  deletePost: (id) => request(`/admin/posts/${id}`, { method: 'DELETE' }),
}
