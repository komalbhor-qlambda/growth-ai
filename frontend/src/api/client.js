import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({ baseURL: BASE, timeout: 30_000, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('access_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

let refreshing = false, queue = []
const flush = (err, token = null) => { queue.forEach(p => err ? p.reject(err) : p.resolve(token)); queue = [] }

api.interceptors.response.use(r => r, async (err) => {
  const orig = err.config
  if (err.response?.status === 401 && !orig._retry) {
    if (refreshing) return new Promise((res, rej) => queue.push({ resolve: res, reject: rej }))
      .then(t => { orig.headers.Authorization = `Bearer ${t}`; return api(orig) })
    orig._retry = true; refreshing = true
    try {
      const refresh = localStorage.getItem('refresh_token')
      if (!refresh) throw new Error('No refresh token')
      const { data } = await axios.post(`${BASE}/auth/refresh`, { refresh_token: refresh })
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      flush(null, data.access_token)
      orig.headers.Authorization = `Bearer ${data.access_token}`
      return api(orig)
    } catch (e) {
      flush(e, null); localStorage.clear(); window.location.href = '/login'
      return Promise.reject(e)
    } finally { refreshing = false }
  }
  return Promise.reject(err)
})

export const authAPI = {
  register: d  => api.post('/auth/register', d),
  login:    d  => api.post('/auth/login', d),
  refresh:  t  => api.post('/auth/refresh', { refresh_token: t }),
  me:       () => api.get('/auth/me'),
  logout:   () => api.post('/auth/logout'),
}
export const tenantAPI = {
  get:    ()  => api.get('/tenant/'),
  update: d   => api.patch('/tenant/', d),
}
export const chatAPI = {
  send: d => api.post('/chat/', d),
}
export const leadsAPI = {
  list:   p  => api.get('/leads/', { params: p }),
  create: d  => api.post('/leads/', d),
  update: (id, d) => api.patch(`/leads/${id}`, d),
  delete: id => api.delete(`/leads/${id}`),
  import: f  => { const form = new FormData(); form.append('file', f); return api.post('/leads/import', form, { headers: { 'Content-Type': 'multipart/form-data' } }) },
}
export const knowledgeAPI = {
  list:   ()  => api.get('/knowledge/'),
  upload: f   => { const form = new FormData(); form.append('file', f); return api.post('/knowledge/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }) },
  addUrl: d   => api.post('/knowledge/url', d),
  delete: id  => api.delete(`/knowledge/${id}`),
}
export const billingAPI = {
  plans:       ()  => api.get('/billing/plans'),
  createOrder: d   => api.post('/billing/orders', d),
  verify:      d   => api.post('/billing/verify', d),
  invoices:    ()  => api.get('/billing/invoices'),
}
export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
}
