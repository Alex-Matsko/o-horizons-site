'use strict';
const axios = require('axios');

/**
 * Create an axios instance pointed at a specific 1C database OData endpoint.
 * dbUrl — full URL stored in databases.url (e.g. http://1c-host/basename)
 */
const api = (dbUrl) => axios.create({
  baseURL: `${dbUrl}/odata/standard.odata`,
  auth: {
    username: process.env.ONEC_ADMIN_USER,
    password: process.env.ONEC_ADMIN_PASS,
  },
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 15_000,
});

/**
 * GET list of users from 1C database (Catalog_Пользователи)
 * Returns raw OData value array (filtered: not deleted)
 */
exports.getUsers = async (dbUrl) => {
  try {
    const res = await api(dbUrl).get(
      '/Catalog_Пользователи' +
      '?$format=json' +
      '&$select=Ref_Key,Code,Description,IBUserLogin,ПометкаУдаления'
    );
    return (res.data.value || []).filter(u => !u.ПометкаУдаления);
  } catch (err) {
    console.error(`[1C] getUsers error for ${dbUrl}:`, err.message);
    return [];
  }
};

/**
 * Create a new user in 1C database
 * @param {string} dbUrl
 * @param {{ login: string, name: string }} userData
 */
exports.createUser = async (dbUrl, userData) => {
  const res = await api(dbUrl).post('/Catalog_Пользователи', {
    Description:          userData.name  || userData.login,
    IBUserLogin:          userData.login,
    ПометкаУдаления: false,
    ФизическоеЛицо_Key: '00000000-0000-0000-0000-000000000000',
  });
  return res.data;
};

/**
 * Enable or disable a user in 1C by their Ref_Key (UUID)
 * @param {string} dbUrl
 * @param {string} refKey  — onec_uuid from db_users_cache
 * @param {boolean} active — true = enable, false = disable
 */
exports.setUserActive = async (dbUrl, refKey, active) => {
  await api(dbUrl).patch(
    `/Catalog_Пользователи(guid'${refKey}')`,
    { ПометкаУдаления: !active }
  );
};

// Backward-compat alias (used in older code)
exports.toggleUser = exports.setUserActive;

/**
 * Health check — ping the 1C web-server for a database
 * @returns {{ ok: boolean, responseMs: number }}
 */
exports.checkHealth = async (dbUrl) => {
  const t0 = Date.now();
  try {
    const res = await axios.get(dbUrl, {
      auth: {
        username: process.env.ONEC_ADMIN_USER,
        password: process.env.ONEC_ADMIN_PASS,
      },
      timeout: 8_000,
      validateStatus: (s) => s < 500,
    });
    return { ok: res.status < 400, responseMs: Date.now() - t0 };
  } catch {
    return { ok: false, responseMs: Date.now() - t0 };
  }
};
