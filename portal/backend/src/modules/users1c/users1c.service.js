import { getDb } from '../../config/db.js';
import * as onec from '../../services/onec.js';

export async function listUsers(tenantId, dbId) {
  const db = getDb();
  const { rows: [database] } = await db.query(
    'SELECT * FROM databases WHERE id = $1 AND tenant_id = $2',
    [dbId, tenantId]
  );
  if (!database) throw new Error('Database not found or access denied');
  return onec.getUsers(database.db_name);
}

export async function createUser(tenantId, dbId, { username, fullname, password, roles }) {
  const db = getDb();
  const { rows: [database] } = await db.query(
    'SELECT * FROM databases WHERE id = $1 AND tenant_id = $2',
    [dbId, tenantId]
  );
  if (!database) throw new Error('Database not found or access denied');

  // check tariff user limit
  const { rows: [tariff] } = await db.query(
    'SELECT t.max_users FROM tariffs t JOIN tenants tn ON tn.tariff_id = t.id WHERE tn.id = $1',
    [tenantId]
  );
  const existingUsers = await onec.getUsers(database.db_name);
  if (existingUsers.length >= (tariff?.max_users || 5)) {
    throw new Error('User limit reached for current tariff');
  }

  return onec.createUser(database.db_name, { username, fullname, password, roles });
}

export async function updateUser(tenantId, dbId, username, data) {
  const db = getDb();
  const { rows: [database] } = await db.query(
    'SELECT * FROM databases WHERE id = $1 AND tenant_id = $2',
    [dbId, tenantId]
  );
  if (!database) throw new Error('Database not found or access denied');
  return onec.updateUser(database.db_name, username, data);
}

export async function deleteUser(tenantId, dbId, username) {
  const db = getDb();
  const { rows: [database] } = await db.query(
    'SELECT * FROM databases WHERE id = $1 AND tenant_id = $2',
    [dbId, tenantId]
  );
  if (!database) throw new Error('Database not found or access denied');
  return onec.deleteUser(database.db_name, username);
}
