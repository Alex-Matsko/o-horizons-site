'use strict';

const axios = require('axios');

const ONEC_ADMIN_USER = process.env.ONEC_ADMIN_USER;
const ONEC_ADMIN_PASS = process.env.ONEC_ADMIN_PASS;
const ONEC_SERVER_URL = process.env.ONEC_SERVER_URL; // http://<1c-server-host>

function baseUrl(db) {
  // db.infobase_name — имя базы на сервере 1С (например: client_baza)
  return `${ONEC_SERVER_URL}/${db.infobase_name}/odata/standard.odata`;
}

function authConfig() {
  return { auth: { username: ONEC_ADMIN_USER, password: ONEC_ADMIN_PASS } };
}

/**
 * Получить список пользователей из 1С (OData REST API)
 * @returns {Array} Массив пользователей
 */
async function getUsers(db) {
  const url = `${baseUrl(db)}/InformationRegister_СведенияПользователейИнформационнойБазы?$format=json&$select=ИмяПользователя,ПолноеИмя,Администратор,Авторизация`;
  const resp = await axios.get(url, authConfig());
  return resp.data.value || [];
}

/**
 * Создать пользователя в 1С через OData
 * userData: { onec_user_name, full_name, password, roles }
 */
async function createUser(db, userData) {
  // Шаг 1: создаём запись пользователя
  const createUrl = `${baseUrl(db)}/InformationRegister_СведенияПользователейИнформационнойБазы`;
  await axios.post(createUrl, {
    ИмяПользователя: userData.onec_user_name,
    ПолноеИмя: userData.full_name || userData.onec_user_name,
    Администратор: false,
    Авторизация: '1С:Предприятие',
    // Пароль сетается отдельным запросом ниже
  }, authConfig());

  // Шаг 2: устанавливаем пароль
  if (userData.password) {
    await resetPassword(db, userData.onec_user_name, userData.password);
  }
}

/**
 * Обновить пользователя в 1С
 * userData: { full_name?, is_active? } — только те поля, которые переданы
 */
async function updateUser(db, username, userData) {
  // Сначала находим пользователя
  const findUrl = `${baseUrl(db)}/InformationRegister_СведенияПользователейИнформационнойБазы?$filter=ИмяПользователя eq '${encodeURIComponent(username)}'&$format=json`;
  const resp = await axios.get(findUrl, authConfig());
  const user = resp.data.value?.[0];
  if (!user) throw new Error(`User '${username}' not found in 1C`);

  const patchUrl = `${baseUrl(db)}/InformationRegister_СведенияПользователейИнформационнойБазы(ИмяПользователя='${encodeURIComponent(username)}')`;
  const body = {};
  if (userData.full_name !== undefined) body['ПолноеИмя'] = userData.full_name;
  if (userData.is_active !== undefined) body['Авторизация'] = userData.is_active ? '1С:Предприятие' : 'НетВхода';

  await axios.patch(patchUrl, body, {
    ...authConfig(),
    headers: { 'Content-Type': 'application/json', 'If-Match': '*' },
  });
}

/**
 * Сбросить пароль пользователя 1С
 * Используем встроенный HTTP-сервис 1С для смены пароля
 */
async function resetPassword(db, username, newPassword) {
  // 1С не разрешает менять пароль через OData напрямую.
  // Используем метод через сервис администрирования 1С (HTTP-сервис rac/ibcmd)
  // Вариант: публикуем ONEC_PASSWD_URL в .env — адрес отдельного веб-хука на сервере 1С
  const passwdHookUrl = process.env.ONEC_PASSWD_URL;
  if (passwdHookUrl) {
    await axios.post(passwdHookUrl, {
      infobase: db.infobase_name,
      username,
      password: newPassword,
    }, {
      auth: { username: ONEC_ADMIN_USER, password: ONEC_ADMIN_PASS },
      timeout: 10000,
    });
  } else {
    // Фолбек: логируем, но не кидаем ошибку
    console.warn(`[onec] ONEC_PASSWD_URL not set — password for user '${username}' in '${db.infobase_name}' was NOT changed`);
  }
}

/**
 * Удалить пользователя из 1С
 */
async function deleteUser(db, username) {
  const findUrl = `${baseUrl(db)}/InformationRegister_СведенияПользователейИнформационнойБазы?$filter=ИмяПользователя eq '${encodeURIComponent(username)}'&$format=json`;
  const resp = await axios.get(findUrl, authConfig());
  const user = resp.data.value?.[0];
  if (!user) throw new Error(`User '${username}' not found in 1C`);

  // Удаляем запись пользователя
  const delUrl = `${baseUrl(db)}/InformationRegister_СведенияПользователейИнформационнойБазы(ИмяПользователя='${encodeURIComponent(username)}')`;
  await axios.delete(delUrl, authConfig());
}

/**
 * Синхронизация пользователей из 1С → наша БД (db_users)
 * @param {object} db - запись databases
 * @param {object} pgClient - поол pg
 * @returns {Array} синхронизированные пользователи
 */
async function syncUsers(db, pgClient) {
  const onecUsers = await getUsers(db);

  for (const u of onecUsers) {
    await pgClient.query(
      `INSERT INTO db_users (database_id, onec_user_name, full_name, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (database_id, onec_user_name)
       DO UPDATE SET full_name = EXCLUDED.full_name, is_active = true, updated_at = now()`,
      [db.id, u['ИмяПользователя'], u['ПолноеИмя'] || u['ИмяПользователя']]
    );
  }

  // Отмечаем как неактивных тех, кто есть в нашей БД, но нет в 1С
  const onecNames = new Set(onecUsers.map((u) => u['ИмяПользователя']));
  const { rows: localUsers } = await pgClient.query(
    'SELECT onec_user_name FROM db_users WHERE database_id = $1 AND is_active = true',
    [db.id]
  );
  for (const local of localUsers) {
    if (!onecNames.has(local.onec_user_name)) {
      await pgClient.query(
        'UPDATE db_users SET is_active = false, updated_at = now() WHERE database_id = $1 AND onec_user_name = $2',
        [db.id, local.onec_user_name]
      );
    }
  }

  return onecUsers;
}

module.exports = { getUsers, createUser, updateUser, deleteUser, resetPassword, syncUsers };
