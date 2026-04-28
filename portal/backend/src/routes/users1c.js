const db = require('../db');
const onec = require('../services/onec');
const { authenticate } = require('../middleware/auth');

module.exports = async (app) => {
  // GET /api/users1c/:dbId — пользователи 1С в базе
  app.get('/:dbId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { rows: dbRows } = await db.query(
      'SELECT * FROM databases_1c WHERE id=$1 AND tenant_id=$2 AND status=$3',
      [req.params.dbId, req.user.sub, 'active']
    );
    if (!dbRows.length) return reply.code(404).send({ error: 'База не найдена' });
    const dbRow = dbRows[0];

    // Sync from 1C
    const users1c = await onec.getUsers(dbRow.url_path);
    // Upsert into local cache
    for (const u of users1c) {
      await db.query(
        `INSERT INTO users_1c(database_id,tenant_id,username,full_name,synced_at)
         VALUES($1,$2,$3,$4,NOW())
         ON CONFLICT(database_id,username)
         DO UPDATE SET full_name=EXCLUDED.full_name, synced_at=NOW()`,
        [dbRow.id, req.user.sub, u.Description, u.НаименованиеПолное || u.Description]
      );
    }
    await db.query(
      'UPDATE databases_1c SET user_count=$1 WHERE id=$2',
      [users1c.length, dbRow.id]
    );

    const { rows } = await db.query(
      'SELECT * FROM users_1c WHERE database_id=$1 ORDER BY full_name',
      [dbRow.id]
    );
    return rows;
  });

  // POST /api/users1c/:dbId — создать пользователя
  app.post('/:dbId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { username, full_name } = req.body;
    if (!username) return reply.code(400).send({ error: 'username обязателен' });

    const { rows: dbRows } = await db.query(
      'SELECT * FROM databases_1c WHERE id=$1 AND tenant_id=$2',
      [req.params.dbId, req.user.sub]
    );
    if (!dbRows.length) return reply.code(404).send({ error: 'База не найдена' });
    const dbRow = dbRows[0];

    // Check user limit
    const tariff = await db.query(
      `SELECT tr.max_users FROM tenants ten JOIN tariffs tr ON tr.id=ten.tariff_id WHERE ten.id=$1`,
      [req.user.sub]
    );
    const { rows: uCount } = await db.query(
      'SELECT COUNT(*) FROM users_1c WHERE tenant_id=$1 AND is_active',
      [req.user.sub]
    );
    if (parseInt(uCount[0].count) >= tariff.rows[0].max_users)
      return reply.code(402).send({ error: 'Лимит пользователей по тарифу исчерпан' });

    await onec.createUser(dbRow.url_path, { username, full_name });
    const { rows } = await db.query(
      `INSERT INTO users_1c(database_id,tenant_id,username,full_name,synced_at)
       VALUES($1,$2,$3,$4,NOW()) RETURNING *`,
      [dbRow.id, req.user.sub, username, full_name || username]
    );
    return reply.code(201).send(rows[0]);
  });

  // PATCH /api/users1c/:dbId/:userId/toggle
  app.patch('/:dbId/:userId/toggle', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { rows } = await db.query(
      `UPDATE users_1c SET is_active=NOT is_active WHERE id=$1 AND tenant_id=$2 RETURNING *`,
      [req.params.userId, req.user.sub]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Пользователь не найден' });
    return rows[0];
  });
};
