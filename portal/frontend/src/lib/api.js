const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),

  auth: {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    verify: (token) => api.get(`/auth/verify-email?token=${token}`),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (data) => api.post('/auth/reset-password', data),
  },

  me: {
    get: () => api.get('/me'),
    update: (data) => api.patch('/me', data),
    changePassword: (data) => api.post('/me/change-password', data),
    tariff: () => api.get('/me/tariff'),
    switchTariff: (tariff_id) => api.post('/me/tariff', { tariff_id }),
  },

  databases: {
    list: () => api.get('/databases'),
    get: (id) => api.get(`/databases/${id}`),
    create: (data) => api.post('/databases', data),
    delete: (id) => api.delete(`/databases/${id}`),
  },

  users1c: {
    list: (dbId) => api.get(`/databases/${dbId}/users`),
    create: (dbId, data) => api.post(`/databases/${dbId}/users`, data),
    update: (dbId, username, data) => api.patch(`/databases/${dbId}/users/${username}`, data),
    delete: (dbId, username) => api.delete(`/databases/${dbId}/users/${username}`),
  },

  backups: {
    list: (dbId) => api.get(`/databases/${dbId}/backups`),
    create: (dbId) => api.post(`/databases/${dbId}/backups`, {}),
    delete: (dbId, id) => api.delete(`/databases/${dbId}/backups/${id}`),
    download: (dbId, id) => api.get(`/databases/${dbId}/backups/${id}/download`),
  },

  tariffs: {
    list: () => api.get('/tariffs'),
  },

  admin: {
    stats: () => api.get('/admin/stats'),
    tenants: (params = {}) => api.get('/admin/tenants?' + new URLSearchParams(params)),
    pendingDbs: () => api.get('/admin/databases/pending'),
    approveDb: (id) => api.post(`/admin/databases/${id}/approve`, {}),
    rejectDb: (id, reason) => api.post(`/admin/databases/${id}/reject`, { reason }),
    setRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  },
};
