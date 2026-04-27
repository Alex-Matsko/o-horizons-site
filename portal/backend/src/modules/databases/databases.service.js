import { query } from '../../config/db.js';
import { databaseQueue } from '../../jobs/queues.js';
import { sendTelegram } from '../../services/telegram.service.js';

export async function listDatabases(tenantId, isAdmin) {
  const sql = isAdmin
    ? `SELECT d.*, t.name as tenant_name, c.name as config_name
       FROM databases d
       LEFT JOIN tenants t ON t.id = d.tenant_id
       LEFT JOIN configurations c ON c.id = d.config_id
       WHERE d.deleted_at IS NULL
       ORDER BY d.requested_at DESC`
    : `SELECT d.*, c.name as config_name
       FROM databases d
       LEFT JOIN configurations c ON c.id = d.config_id
       WHERE d.tenant_id = $1 AND d.deleted_at IS NULL
       ORDER BY d.requested_at DESC`;
  const params = isAdmin ? [] : [tenantId];
  const { rows } = await query(sql, params);
  return rows;
}

export async function getDatabase(id, tenantId, isAdmin) {
  const sql = isAdmin
    ? `SELECT d.*, c.name as config_name FROM databases d LEFT JOIN configurations c ON c.id=d.config_id WHERE d.id=$1 AND d.deleted_at IS NULL`
    : `SELECT d.*, c.name as config_name FROM databases d LEFT JOIN configurations c ON c.id=d.config_id WHERE d.id=$1 AND d.tenant_id=$2 AND d.deleted_at IS NULL`;
  const params = isAdmin ? [id] : [id, tenantId];
  const { rows } = await query(sql, params);
  if (!rows.length) throw { statusCode: 404, message: 'Database not found' };
  return rows[0];
}

export async function requestDatabase({ name, display_name, config_id, platform_version, comment }, user) {
  // Check tariff limits
  const usage = await query(
    `SELECT COUNT(*) as cnt FROM databases WHERE tenant_id=$1 AND status != 'DELETED' AND deleted_at IS NULL`,
    [user.tenant_id]
  );
  const tariff = await query(
    `SELECT t.max_databases FROM tariffs t JOIN tenants ten ON ten.tariff_id=t.id WHERE ten.id=$1`,
    [user.tenant_id]
  );
  const max = tariff.rows[0]?.max_databases || 1;
  if (parseInt(usage.rows[0].cnt) >= max) {
    throw { statusCode: 403, message: `Tariff limit: max ${max} databases` };
  }

  // Validate name uniqueness
  const exists = await query(`SELECT id FROM databases WHERE name=$1`, [name]);
  if (exists.rows.length) throw { statusCode: 409, message: 'Database name already taken' };

  const { rows } = await query(
    `INSERT INTO databases (tenant_id, name, display_name, config_id, platform_version, tenant_comment, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,'PENDING',$7) RETURNING *`,
    [user.tenant_id, name, display_name || name, config_id, platform_version, comment || null, user.id]
  );
  const db = rows[0];

  await sendTelegram(
    `📥 <b>Новая заявка на базу 1С</b>\n` +
    `Клиент: ${user.email}\n` +
    `База: <code>${name}</code>\n` +
    `Конфигурация: ${config_id}\n` +
    `Платформа: ${platform_version}\n` +
    `👉 Подтвердите в <a href="${process.env.FRONTEND_URL}/admin/pending">панели администратора</a>`
  );

  return db;
}

export async function approveDatabase(id, adminComment) {
  const { rows } = await query(
    `UPDATE databases SET status='CREATING', admin_comment=$2 WHERE id=$1 AND status='PENDING' RETURNING *`,
    [id, adminComment || null]
  );
  if (!rows.length) throw { statusCode: 404, message: 'Pending database not found' };
  const db = rows[0];

  // Enqueue job
  await databaseQueue.add('create-database', { databaseId: db.id }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
  });

  return db;
}

export async function rejectDatabase(id, reason) {
  const { rows } = await query(
    `UPDATE databases SET status='DELETED', deleted_at=NOW(), admin_comment=$2 WHERE id=$1 AND status='PENDING' RETURNING *`,
    [id, reason]
  );
  if (!rows.length) throw { statusCode: 404, message: 'Pending database not found' };
  // TODO: notify client by email
  return rows[0];
}
