const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

// Access-токен в памяти (не в localStorage — блокируется iframe-сандбоксом)
let _token = null;

export function setToken(t)  { _token = t; }
export function getToken()   { return _token; }
export function clearToken() { _token = null; }

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',          // для cookie-рефреш токена
    headers: {
      'Content-Type': 'application/json',
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
      ...options.headers,
    },
  });

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

  // --- Auth (/api/auth/*) ---
  auth: {
    register:      (data)  => api.post('/auth/register', data),
    login:         (data)  => api.post('/auth/login', data),
    me:            ()      => api.get('/auth/me'),
    logout:        ()      => api.post('/auth/logout', {}),
    refresh:       ()      => api.post('/auth/refresh', {}),
    verify:        (token) => api.get(`/auth/verify-email?token=${token}`),
    forgotPassword:(email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (data)  => api.post('/auth/reset-password', data),
  },

  // --- Профиль текущего пользователя (/api/profile/*) ---
  me: {
    get:            ()     => api.get('/profile/me'),
    update:         (data) => api.patch('/profile/me', data),
    changePassword: (data) => api.post('/profile/me/password', data),
    notifications:  ()     => api.get('/profile/notifications'),
    readNotification: (id) => api.patch(`/profile/notifications/${id}/read`, {}),
  },

  // --- Базы 1С (/api/databases/*) ---
  databases: {
    list:    ()       => api.get('/databases'),
    get:     (id)     => api.get(`/databases/${id}`),
    request: (data)   => api.post('/databases/request', data),
    delete:  (id)     => api.delete(`/databases/${id}`),
  },

  // --- Пользователи 1С (/api/users1c/*) ---
  users1c: {
    list:   (dbId)                 => api.get(`/users1c/${dbId}/users`),
    create: (dbId, data)           => api.post(`/users1c/${dbId}/users`, data),
    update: (dbId, login, data)    => api.patch(`/users1c/${dbId}/users/${login}`, data),
    delete: (dbId, login)          => api.delete(`/users1c/${dbId}/users/${login}`),
    sync:   (dbId)                 => api.post(`/users1c/${dbId}/sync`, {}),
  },

  // --- Бэкапы (/api/backups/*) ---
  backups: {
    list:     (dbId)     => api.get(`/backups/${dbId}`),
    create:   (dbId)     => api.post(`/backups/${dbId}`, {}),
    delete:   (dbId, id) => api.delete(`/backups/${dbId}/${id}`),
    download: (dbId, id) => `${BASE}/backups/${dbId}/${id}/download`,
  },

  // --- Тарифы (/api/tariffs) ---
  tariffs: {
    list: () => api.get('/tariffs'),
  },

  // --- Админ-панель (/api/admin/*) ---
  admin: {
    stats:         ()           => api.get('/admin/stats'),
    requests:      ()           => api.get('/admin/requests'),
    updateRequest: (id, data)   => api.patch(`/admin/requests/${id}`, data),
    tenants:       ()           => api.get('/admin/tenants'),
    updateTenant:  (id, data)   => api.patch(`/admin/tenants/${id}`, data),
    databases:     ()           => api.get('/admin/databases'),
    updateDb:      (id, data)   => api.patch(`/admin/databases/${id}`, data),
  },
};

export default api;
