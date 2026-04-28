const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

let _token = null;
let _onUnauthorized = null;

export function setToken(t)  { _token = t; }
export function getToken()   { return _token; }
export function clearToken() { _token = null; }
export function setUnauthorizedHandler(fn) { _onUnauthorized = fn; }

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    try { sessionStorage.removeItem('auth_token'); } catch {}
    if (_onUnauthorized) _onUnauthorized();
    throw new Error('Сессия истекла. Войдите снова.');
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get:    (path)       => request(path),
  post:   (path, body) => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (path, body) => request(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)       => request(path, { method: 'DELETE' }),

  auth: {
    register:       (data)  => api.post('/auth/register', data),
    login:          (data)  => api.post('/auth/login', data),
    me:             ()      => api.get('/auth/me'),
    logout:         ()      => api.post('/auth/logout', {}),
    refresh:        ()      => api.post('/auth/refresh', {}),
    verify:         (token) => api.get(`/auth/verify-email?token=${token}`),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword:  (data)  => api.post('/auth/reset-password', data),
  },

  me: {
    get:              ()     => api.get('/profile/me'),
    update:           (data) => api.patch('/profile/me', data),
    changePassword:   (data) => api.post('/profile/me/password', data),
    notifications:    ()     => api.get('/profile/notifications'),
    readNotification: (id)   => api.patch(`/profile/notifications/${id}/read`, {}),
  },

  databases: {
    list:    ()     => api.get('/databases'),
    get:     (id)   => api.get(`/databases/${id}`),
    request: (data) => api.post('/databases/request', data),
    delete:  (id)   => api.delete(`/databases/${id}`),
  },

  users1c: {
    list:   (dbId)              => api.get(`/users1c/${dbId}/users`),
    create: (dbId, data)        => api.post(`/users1c/${dbId}/users`, data),
    update: (dbId, login, data) => api.patch(`/users1c/${dbId}/users/${login}`, data),
    delete: (dbId, login)       => api.delete(`/users1c/${dbId}/users/${login}`),
    sync:   (dbId)              => api.post(`/users1c/${dbId}/sync`, {}),
  },

  backups: {
    list:     (dbId)     => api.get(`/backups/${dbId}`),
    create:   (dbId)     => api.post(`/backups/${dbId}`, {}),
    delete:   (dbId, id) => api.delete(`/backups/${dbId}/${id}`),
    download: (dbId, id) => `${BASE}/backups/${dbId}/${id}/download`,
  },

  tariffs: {
    list: () => api.get('/tariffs'),
  },

  admin: {
    stats:         ()               => api.get('/admin/stats'),
    requests:      ()               => api.get('/admin/requests'),
    pendingDbs:    ()               => api.get('/admin/requests'),
    approveDb:     (id)             => api.patch(`/admin/requests/${id}`, { action: 'approve' }),
    rejectDb:      (id, reason)     => api.patch(`/admin/requests/${id}`, { action: 'reject', reason }),
    updateRequest: (id, data)       => api.patch(`/admin/requests/${id}`, data),
    tenants:       ()               => api.get('/admin/tenants'),
    updateTenant:  (id, data)       => api.patch(`/admin/tenants/${id}`, data),
    databases:     ()               => api.get('/admin/databases'),
    updateDb:      (id, data)       => api.patch(`/admin/databases/${id}`, data),
  },
};

export default api;
