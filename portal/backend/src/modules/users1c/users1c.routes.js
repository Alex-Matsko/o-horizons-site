import { authenticate } from '../../middleware/auth.middleware.js';
import { query } from '../../config/db.js';
import { logger } from '../../utils/logger.js';

const ONEC_URL  = process.env.ONEC_SERVER_URL;
const ONEC_USER = process.env.ONEC_API_USER;
const ONEC_PASS = process.env.ONEC_API_PASSWORD;

function onecHeaders() {
  return {
    Authorization: 'Basic ' + Buffer.from(`${ONEC_USER}:${ONEC_PASS}`).toString('base64'),
    'Content-Type': 'application/json',
  };
}

export async function users1cRoutes(app) {
  app.addHook('preHandler', authenticate);

  // List 1C users (from cache)
  app.get('/:dbId/users', async (req, reply) => {
    const { rows } = await query(
      `SELECT u.* FROM db_users_cache u
       JOIN databases d ON d.id=u.database_id
       WHERE u.database_id=$1 AND (d.tenant_id=$2 OR $3)`,
      [req.params.dbId, req.user.tenant_id, req.user.role === 'SUPER_ADMIN']
    );
    reply.send(rows);
  });

  // Sync users from 1C
  app.post('/:dbId/users/sync', async (req, reply) => {
    const { rows: dbRows } = await query(
      `SELECT * FROM databases WHERE id=$1 AND (tenant_id=$2 OR $3) AND status='ACTIVE'`,
      [req.params.dbId, req.user.tenant_id, req.user.role === 'SUPER_ADMIN']
    );
    if (!dbRows.length) return reply.code(404).send({ error: 'Database not found' });
    const db = dbRows[0];

    try {
      const res = await fetch(
        `${ONEC_URL}/${db.name}/odata/standard.odata/Catalog_Пользователи?$format=json`,
        { headers: onecHeaders(), signal: AbortSignal.timeout(15000) }
      );
      if (!res.ok) throw new Error(`1C API error: ${res.status}`);
      const data = await res.json();
      const users = data.value || [];

      for (const u of users) {
        await query(
          `INSERT INTO db_users_cache (database_id, onec_user_id, login, full_name, is_active, last_synced_at)
           VALUES ($1,$2,$3,$4,$5,NOW())
           ON CONFLICT (database_id, login) DO UPDATE
           SET full_name=$4, is_active=$5, last_synced_at=NOW()`,
          [db.id, u.Ref_Key, u.Имя || u.Description || '', u.ПолноеИмя || '', !u.НеДействителен]
        );
      }
      reply.send({ synced: users.length });
    } catch (err) {
      logger.error('1C sync error:', err.message);
      reply.code(502).send({ error: '1C API unavailable' });
    }
  });

  // Create 1C user
  app.post('/:dbId/users', async (req, reply) => {
    const { rows: dbRows } = await query(
      `SELECT d.*, t.tariff_id FROM databases d JOIN tenants t ON t.id=d.tenant_id
       WHERE d.id=$1 AND (d.tenant_id=$2 OR $3) AND d.status='ACTIVE'`,
      [req.params.dbId, req.user.tenant_id, req.user.role === 'SUPER_ADMIN']
    );
    if (!dbRows.length) return reply.code(404).send({ error: 'Database not found' });
    const db = dbRows[0];

    // Check user limit
    const { rows: limitRows } = await query(`SELECT max_users_per_db FROM tariffs WHERE id=$1`, [db.tariff_id]);
    const limit = limitRows[0]?.max_users_per_db || 3;
    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM db_users_cache WHERE database_id=$1 AND is_active=true`, [db.id]
    );
    if (parseInt(countRows[0].count) >= limit) {
      return reply.code(403).send({ error: `User limit (${limit}) reached for this database` });
    }

    const { login, full_name, password } = req.body;
    try {
      const payload = { Имя: login, ПолноеИмя: full_name, Пароль: password, НеДействителен: false };
      const res = await fetch(
        `${ONEC_URL}/${db.name}/odata/standard.odata/Catalog_Пользователи`,
        { method: 'POST', headers: onecHeaders(), body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) }
      );
      if (!res.ok) throw new Error(`1C error: ${res.status}`);
      const created = await res.json();

      await query(
        `INSERT INTO db_users_cache (database_id, onec_user_id, login, full_name, is_active, last_synced_at)
         VALUES ($1,$2,$3,$4,true,NOW()) ON CONFLICT DO NOTHING`,
        [db.id, created.Ref_Key, login, full_name]
      );
      reply.code(201).send(created);
    } catch (err) {
      logger.error('1C create user error:', err.message);
      reply.code(502).send({ error: '1C API error: ' + err.message });
    }
  });
}
