import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,    // send cookies (refresh token)
  timeout: 15000,
})

// ─── Request interceptor — attach access token ────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response interceptor — handle 401 / token refresh ───────────────────────
let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        const newToken = data.accessToken
        localStorage.setItem('accessToken', newToken)
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('accessToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ─── API methods ──────────────────────────────────────────────────────────────

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.patch('/auth/password', data),
}

export const linksApi = {
  list: (params) => api.get('/links', { params }),
  get: (id) => api.get(`/links/${id}`),
  create: (data) => api.post('/links', data),
  update: (id, data) => api.patch(`/links/${id}`, data),
  delete: (id) => api.delete(`/links/${id}`),
  qr: (id) => api.get(`/links/${id}/qr`),
}

export const analyticsApi = {
  overview: () => api.get('/analytics/overview'),
  link: (shortCode, period) => api.get(`/analytics/${shortCode}`, { params: { period } }),
  realtime: (shortCode) => api.get(`/analytics/${shortCode}/realtime`),
  export: (shortCode, period) =>
    api.get(`/analytics/${shortCode}/export`, {
      params: { period },
      responseType: 'blob',
    }),
}

export const workspacesApi = {
  list: () => api.get('/workspaces'),
  get: (id) => api.get(`/workspaces/${id}`),
  create: (data) => api.post('/workspaces', data),
  invite: (id, data) => api.post(`/workspaces/${id}/invite`, data),
  removeMember: (id, memberId) => api.delete(`/workspaces/${id}/members/${memberId}`),
  delete: (id) => api.delete(`/workspaces/${id}`),
}

export default api
