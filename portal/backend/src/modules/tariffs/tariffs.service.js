import { getDb } from '../../config/db.js';

export async function getTariffs() {
  const db = getDb();
  const { rows } = await db.query('SELECT * FROM tariffs WHERE is_active = true ORDER BY max_users ASC');
  return rows;
}

export async function getTariffById(id) {
  const db = getDb();
  const { rows } = await db.query('SELECT * FROM tariffs WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function getTenantTariff(tenantId) {
  const db = getDb();
  const { rows } = await db.query(
    `SELECT t.* FROM tariffs t
     JOIN tenants tn ON tn.tariff_id = t.id
     WHERE tn.id = $1`,
    [tenantId]
  );
  return rows[0] || null;
}

export async function changeTariff(tenantId, tariffId) {
  const db = getDb();
  const tariff = await getTariffById(tariffId);
  if (!tariff) throw new Error('Tariff not found');

  const { rows: dbs } = await db.query(
    'SELECT COUNT(*) as cnt FROM databases WHERE tenant_id = $1 AND status != $2',
    [tenantId, 'deleted']
  );
  if (parseInt(dbs[0].cnt) > tariff.max_databases) {
    throw new Error(`Current tariff allows max ${tariff.max_databases} databases. You have ${dbs[0].cnt}.`);
  }

  await db.query('UPDATE tenants SET tariff_id = $1, updated_at = NOW() WHERE id = $2', [tariffId, tenantId]);
  return getTariffById(tariffId);
}
