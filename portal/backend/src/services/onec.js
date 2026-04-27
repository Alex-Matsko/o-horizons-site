import axios from 'axios';
import { config } from '../config/index.js';
import { query } from '../config/db.js';

function onecClient(db) {
  const base = `${config.onec.apacheBaseUrl}/${db.onec_ib_name}/odata/standard.odata`;
  return axios.create({
    baseURL: base,
    auth: { username: config.onec.apiUser, password: config.onec.apiPass },
    headers: { Accept: 'application/json;odata=nometadata' },
    timeout: 15000,
  });
}

export async function onecSyncUsers(db) {
  const client = onecClient(db);
  const res = await client.get('/Catalog_Пользователи?$format=json&$select=Ref_Key,Description,ИмяПользователя,НедействующийПользователь');
  const items = res.data?.value || [];

  for (const u of items) {
    await query(
      `INSERT INTO db_users_cache (database_id, onec_uuid, name, login, is_active, synced_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (database_id, login)
       DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active, onec_uuid = EXCLUDED.onec_uuid, synced_at = NOW()`,
      [db.id, u.Ref_Key, u.Description, u.ИмяПользователя, !u.НедействующийПользователь]
    );
  }
  await query('UPDATE databases SET last_health_at = NOW() WHERE id = $1', [db.id]);
  return items;
}

export async function onecCreateUser(db, { name, login, password, roles = [] }) {
  const client = onecClient(db);
  const res = await client.post('/Catalog_Пользователи', {
    Description: name,
    ИмяПользователя: login,
    Пароль: password,
    НедействующийПользователь: false,
  });
  return res.data;
}

export async function onecCheckHealth(db) {
  try {
    const client = onecClient(db);
    const start = Date.now();
    await client.get('/$metadata', { timeout: 5000 });
    return { up: true, latency: Date.now() - start };
  } catch {
    return { up: false, latency: null };
  }
}
