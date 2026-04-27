const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

// Токен хранится в памяти (localStorage заблокирован в iframe-сандбоксе)
let _token = null;

export function setToken(t) { _token = t; }
export function getToken() { return _token; }

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
      ...options.headers,
    },
  });

  // 204 No Content — нет тела
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get:    (path)        => request(path),
  post:   (path, body)  => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (path, body)  => request(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)        => request(path, { method: 'DELETE' }),

  auth: {
    register:      (data)    => api.post('/auth/register', data),
    login:         (data)    => api.post('/auth/login', data),
    me:            ()        => api.get('/auth/me'),
    logout:        ()        => api.post('/auth/logout', {}),
    verify:        (token)   => api.get(`/auth/verify-email?token=${token}`),
    forgotPassword:(email)   => api.post('/auth/forgot-password', { email }),
    resetPassword: (data)    => api.post('/auth/reset-password', data),
  },

  me: {
    get:            ()        => api.get('/users/me'),
    update:         (data)    => api.patch('/users/me', data),
    changePassword: (data)    => api.post('/users/me/change-password', data),
  },

  databases: {
    list:    ()           => api.get('/databases'),
    get:     (id)         => api.get(`/databases/${id}`),
    request: (data)       => api.post('/databases/request', data),
    delete:  (id)         => api.delete(`/databases/${id}`),
  },

  users1c: {
    list:   (dbId)                  => api.get(`/databases/${dbId}/users`),
    create: (dbId, data)            => api.post(`/databases/${dbId}/users`, data),
    update: (dbId, username, data)  => api.patch(`/databases/${dbId}/users/${username}`, data),
    delete: (dbId, username)        => api.delete(`/databases/${dbId}/users/${username}`),
    reset:  (dbId, username, data)  => api.post(`/databases/${dbId}/users/${username}/reset-password`, data),
    sync:   (dbId)                  => api.post(`/databases/${dbId}/users/sync`, {}),
  },

  backups: {
    list:     (dbId)      => api.get(`/databases/${dbId}/backups`),
    create:   (dbId)      => api.post(`/databases/${dbId}/backups`, {}),
    delete:   (dbId, id)  => api.delete(`/databases/${dbId}/backups/${id}`),
    download: (dbId, id)  => `${BASE}/databases/${dbId}/backups/${id}/download`,
  },

  tariffs: {
    list: () => api.get('/tariffs'),
  },

  admin: {
    stats:       ()              => api.get('/admin/stats'),
    requests:    ()              => api.get('/admin/requests'),
    updateRequest: (id, data)    => api.patch(`/admin/requests/${id}`, data),
    tenants:     ()              => api.get('/admin/tenants'),
    updateTenant:(id, data)      => api.patch(`/admin/tenants/${id}`, data),
    databases:   ()              => api.get('/admin/databases'),
    updateDb:    (id, data)      => api.patch(`/admin/databases/${id}`, data),
  },
};

// default export — для `import api from '../lib/api.js'`
export default api;
