'use strict';

const axios = require('axios');

const ONEC_ADMIN_USER = process.env.ONEC_ADMIN_USER;
const ONEC_ADMIN_PASS = process.env.ONEC_ADMIN_PASS;
const ONEC_SERVER_URL = process.env.ONEC_SERVER_URL; // http://<1c-server>

function getBaseUrl(db) {
  return `${ONEC_SERVER_URL}/${db.slug}/odata/standard.odata`;
}

function auth() {
  return { username: ONEC_ADMIN_USER, password: ONEC_ADMIN_PASS };
}

async function getUsers(databaseId, pgClient) {
  const { rows } = await pgClient.query(
    'SELECT slug FROM databases WHERE id=$1', [databaseId]
  );
  const db = rows[0];
  if (!db) throw new Error('Database not found');
  const url = `${getBaseUrl(db)}/Catalog_Пользователи?$format=json`;
  const resp = await axios.get(url, { auth: auth() });
  return resp.data.value || [];
}

async function createUser(db, userData) {
  const url = `${getBaseUrl(db)}/Catalog_Пользователи`;
  await axios.post(url, {
    Description: userData.full_name || userData.username,
    Name: userData.username,
    // Роль устанавливается отдельным запросом
  }, { auth: auth() });
}

async function deleteUser(db, username) {
  // Сначала находим GUID пользователя
  const url = `${getBaseUrl(db)}/Catalog_Пользователи?$filter=Name eq '${username}'&$format=json`;
  const resp = await axios.get(url, { auth: auth() });
  const user = resp.data.value?.[0];
  if (!user) throw new Error('User not found in 1C');
  await axios.delete(`${getBaseUrl(db)}/Catalog_Пользователи(guid'${user.Ref_Key}')`, { auth: auth() });
}

module.exports = { getUsers, createUser, deleteUser };
