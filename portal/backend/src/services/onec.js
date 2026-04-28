const axios = require('axios');

// 1C REST API base (OData)
const base1C = (dbPath, version = '8.3.27') => {
  const host = process.env.ONEC_HOST;
  return axios.create({
    baseURL: `http://${host}/${dbPath}/odata/standard.odata`,
    auth: {
      username: process.env.ONEC_ADMIN_USER,
      password: process.env.ONEC_ADMIN_PASS,
    },
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout: 15000,
  });
};

// Get users list from a 1C database
exports.getUsers = async (dbPath) => {
  try {
    const api = base1C(dbPath);
    const res = await api.get('/Catalog_Пользователи?$format=json&$select=Code,Description,НаименованиеПолное,ПометкаУдаления');
    return (res.data.value || []).filter(u => !u.ПометкаУдаления);
  } catch (err) {
    console.error(`[1C] getUsers error for ${dbPath}:`, err.message);
    return [];
  }
};

// Create user in 1C database
exports.createUser = async (dbPath, userData) => {
  const api = base1C(dbPath);
  const res = await api.post('/Catalog_Пользователи', {
    Description: userData.username,
    НаименованиеПолное: userData.full_name || userData.username,
    ФизическоеЛицо_Key: '00000000-0000-0000-0000-000000000000',
  });
  return res.data;
};

// Toggle user active state
exports.toggleUser = async (dbPath, userKey, active) => {
  const api = base1C(dbPath);
  await api.patch(`/Catalog_Пользователи(guid'${userKey}')`, {
    ПометкаУдаления: !active,
  });
};

// Check if 1C database is accessible (health)
exports.checkHealth = async (dbPath) => {
  const startTs = Date.now();
  try {
    const host = process.env.ONEC_HOST;
    const res = await axios.get(`http://${host}/${dbPath}/`, {
      auth: { username: process.env.ONEC_ADMIN_USER, password: process.env.ONEC_ADMIN_PASS },
      timeout: 8000,
      validateStatus: (s) => s < 500,
    });
    return { ok: res.status < 400, responseMs: Date.now() - startTs };
  } catch {
    return { ok: false, responseMs: Date.now() - startTs };
  }
};
