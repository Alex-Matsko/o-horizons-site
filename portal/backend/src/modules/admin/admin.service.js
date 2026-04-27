import { getDb } from '../../config/db.js';

export async function listTenants({ page = 1, limit = 20, search } = {}) {
  const db = getDb();
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(t.company_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT t.id, t.company_name, t.created_at, t.tariff_id,
            tr.name as tariff_name,
            u.email as owner_email,
            COUNT(DISTINCT d.id) as db_count
     FROM tenants t
     JOIN users u ON u.tenant_id = t.id AND u.role = 'owner'
     LEFT JOIN tariffs tr ON tr.id = t.tariff_id
     LEFT JOIN databases d ON d.tenant_id = t.id AND d.status != 'deleted'
     ${where}
     GROUP BY t.id, t.company_name, t.created_at, t.tariff_id, tr.name, u.email
     ORDER BY t.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const { rows: [{ total }] } = await db.query(
    `SELECT COUNT(DISTINCT t.id) as total FROM tenants t JOIN users u ON u.tenant_id = t.id AND u.role = 'owner' ${where}`,
    params.slice(0, -2)
  );
  return { tenants: rows, total: parseInt(total), page, limit };
}

export async function listPendingDatabases() {
  const db = getDb();
  const { rows } = await db.query(
    `SELECT d.*, t.company_name, u.email as owner_email
     FROM databases d
     JOIN tenants t ON t.id = d.tenant_id
     JOIN users u ON u.tenant_id = t.id AND u.role = 'owner'
     WHERE d.status = 'pending'
     ORDER BY d.created_at ASC`
  );
  return rows;
}

export async function approveDatabase(dbId) {
  const db = getDb();
  const { rows: [database] } = await db.query(
    'SELECT * FROM databases WHERE id = $1 AND status = $2',
    [dbId, 'pending']
  );
  if (!database) throw new Error('Database not found or already processed');
  await db.query("UPDATE databases SET status = 'provisioning', updated_at = NOW() WHERE id = $1", [dbId]);
  const { provisionQueue } = await import('../../queues/index.js');
  await provisionQueue.add('create-database', { databaseId: dbId });
  return { ok: true };
}

export async function rejectDatabase(dbId, reason) {
  const db = getDb();
  await db.query(
    "UPDATE databases SET status = 'rejected', error_message = $1, updated_at = NOW() WHERE id = $2",
    [reason || 'Rejected by administrator', dbId]
  );
  return { ok: true };
}

export async function getStats() {
  const db = getDb();
  const queries = [
    db.query('SELECT COUNT(*) as total FROM tenants'),
    db.query("SELECT COUNT(*) as total FROM databases WHERE status = 'active'"),
    db.query("SELECT COUNT(*) as total FROM databases WHERE status = 'pending'"),
    db.query('SELECT COUNT(*) as total FROM users'),
    db.query("SELECT COUNT(*) as total FROM backups WHERE status = 'done'"),
  ];
  const results = await Promise.all(queries);
  return {
    tenants: parseInt(results[0].rows[0].total),
    active_databases: parseInt(results[1].rows[0].total),
    pending_databases: parseInt(results[2].rows[0].total),
    users: parseInt(results[3].rows[0].total),
    backups: parseInt(results[4].rows[0].total),
  };
}

export async function setUserRole(userId, role) {
  const db = getDb();
  if (!['user', 'admin'].includes(role)) throw new Error('Invalid role');
  await db.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, userId]);
  return { ok: true };
}
