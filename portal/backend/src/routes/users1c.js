'use strict';
const db   = require('../db');
const onec = require('../services/onec');

module.exports = async (app) => {

  // GET /api/users1c/:dbId — пользователи 1С в базе (синхр из REST API + кэш)
  app.get('/:dbId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { rows: dbRows } = await db.query(
      `SELECT * FROM databases WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [req.params.dbId, req.user.id]
    );
    if (!dbRows.length)
      return reply.code(404).send({ error: 'База не найдена или недоступна' });
    const dbRow = dbRows[0];

    // Sync from 1C REST API
    try {
      const users1c = await onec.getUsers(dbRow.url);
      for (const u of users1c) {
        await db.query(
          `INSERT INTO db_users_cache (database_id, onec_uuid, login, name, is_active, synced_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (database_id, login)
           DO UPDATE SET
             onec_uuid  = EXCLUDED.onec_uuid,
             name       = EXCLUDED.name,
             is_active  = EXCLUDED.is_active,
             synced_at  = NOW()`,
          [
            dbRow.id,
            u.Ref_Key || null,
            u.IBUserLogin || u.Description,
            u.Description,
            u.DeletionMark !== true,
          ]
        );
      }
      // Mark stale users not in 1C response
      const activeLogins = users1c.map(u => u.IBUserLogin || u.Description);
      if (activeLogins.length) {
        await db.query(
          `UPDATE db_users_cache SET is_active = false
           WHERE database_id = $1 AND login <> ALL($2::text[])`,
          [dbRow.id, activeLogins]
        );
      }
    } catch (e) {
      app.log.warn('1C sync failed for db %s: %s', dbRow.id, e.message);
      // Return cached data even if sync fails
    }

    const { rows } = await db.query(
      `SELECT * FROM db_users_cache WHERE database_id = $1 ORDER BY name`,
      [dbRow.id]
    );
    return rows;
  });

  // POST /api/users1c/:dbId — создать пользователя
  app.post('/:dbId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { login, name } = req.body;
    if (!login)
      return reply.code(400).send({ error: 'login обязателен' });

    const { rows: dbRows } = await db.query(
      `SELECT * FROM databases WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [req.params.dbId, req.user.id]
    );
    if (!dbRows.length)
      return reply.code(404).send({ error: 'База не найдена' });
    const dbRow = dbRows[0];

    // Check user limit from tariff
    const { rows: tariffRows } = await db.query(
      `SELECT tr.max_users FROM tenants ten
       JOIN tariffs tr ON tr.id = ten.tariff_id
       WHERE ten.id = $1`,
      [req.user.id]
    );
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM db_users_cache
       WHERE database_id = $1 AND is_active = true`,
      [dbRow.id]
    );
    if (parseInt(countRows[0].count) >= parseInt(tariffRows[0]?.max_users || 999))
      return reply.code(402).send({ error: 'Лимит пользователей по тарифу исчерпан' });

    // Create in 1C via REST API
    const created = await onec.createUser(dbRow.url, { login, name: name || login });

    // Cache locally
    const { rows } = await db.query(
      `INSERT INTO db_users_cache (database_id, onec_uuid, login, name, is_active, synced_at)
       VALUES ($1, $2, $3, $4, true, NOW())
       ON CONFLICT (database_id, login)
       DO UPDATE SET name = EXCLUDED.name, is_active = true, synced_at = NOW()
       RETURNING *`,
      [dbRow.id, created?.Ref_Key || null, login, name || login]
    );
    return reply.code(201).send(rows[0]);
  });

  // PATCH /api/users1c/:dbId/:userId/toggle — активировать/блокировать
  app.patch('/:dbId/:userId/toggle', { preHandler: [app.authenticate] }, async (req, reply) => {
    // Verify db ownership
    const { rows: dbRows } = await db.query(
      `SELECT id FROM databases WHERE id = $1 AND tenant_id = $2`,
      [req.params.dbId, req.user.id]
    );
    if (!dbRows.length)
      return reply.code(403).send({ error: 'Доступ запрещён' });

    const { rows } = await db.query(
      `UPDATE db_users_cache
       SET is_active = NOT is_active, synced_at = NOW()
       WHERE id = $1 AND database_id = $2
       RETURNING *`,
      [req.params.userId, req.params.dbId]
    );
    if (!rows.length)
      return reply.code(404).send({ error: 'Пользователь не найден' });

    // Sync to 1C if uuid known
    if (rows[0].onec_uuid) {
      const { rows: dbRow } = await db.query(
        'SELECT url FROM databases WHERE id = $1', [req.params.dbId]
      );
      await onec.setUserActive(
        dbRow[0]?.url, rows[0].onec_uuid, rows[0].is_active
      ).catch(e => app.log.warn('1C toggle sync failed:', e.message));
    }
    return rows[0];
  });
};
