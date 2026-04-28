'use strict';
const db = require('../db');
const { Queue } = require('bullmq');

const backupQueue = new Queue('backups', {
  connection: { host: process.env.REDIS_HOST || 'redis', port: 6379 },
});

module.exports = async (app) => {

  // GET /api/backups — бэкапы клиента
  app.get('/', { preHandler: [app.authenticate] }, async (req) => {
    const { database_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [req.user.id];
    let filter = '';
    if (database_id) {
      params.push(database_id);
      filter = `AND b.database_id = $${params.length}`;
    }
    const { rows } = await db.query(
      `SELECT b.*, d.name AS db_name
       FROM backups b
       JOIN databases d ON d.id = b.database_id
       WHERE b.tenant_id = $1 ${filter}
       ORDER BY b.created_at DESC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );
    return rows;
  });

  // POST /api/backups/create — ручной бэкап
  app.post('/create', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { database_id } = req.body;
    if (!database_id)
      return reply.code(400).send({ error: 'database_id обязателен' });

    // Verify ownership and active status
    const { rows: dbRows } = await db.query(
      `SELECT * FROM databases WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [database_id, req.user.id]
    );
    if (!dbRows.length)
      return reply.code(404).send({ error: 'База не найдена или недоступна' });
    const dbRow = dbRows[0];

    // Block if backup already running
    const { rows: running } = await db.query(
      `SELECT id FROM backups WHERE database_id = $1 AND status IN ('pending','running')`,
      [database_id]
    );
    if (running.length)
      return reply.code(409).send({ error: 'Бэкап уже выполняется' });

    // Retention: 7 days default (can be extended per tariff later)
    const retentionDays = 7;
    const expiresAt = new Date(Date.now() + retentionDays * 86_400_000);

    const { rows: backup } = await db.query(
      `INSERT INTO backups (database_id, tenant_id, type, status, expires_at)
       VALUES ($1, $2, 'manual', 'pending', $3)
       RETURNING *`,
      [database_id, req.user.id, expiresAt]
    );

    await backupQueue.add(
      'backup',
      { backupId: backup[0].id, dbRow, tenantId: req.user.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 10_000 } }
    );

    return reply.code(201).send({ ok: true, backup: backup[0] });
  });

  // GET /api/backups/:id/download
  app.get('/:id/download', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { rows } = await db.query(
      `SELECT * FROM backups WHERE id = $1 AND tenant_id = $2 AND status = 'success'`,
      [req.params.id, req.user.id]
    );
    if (!rows.length)
      return reply.code(404).send({ error: 'Бэкап не найден' });
    if (!rows[0].file_path)
      return reply.code(404).send({ error: 'Файл бэкапа недоступен' });
    // nginx X-Accel-Redirect for secure file serving
    return { download_url: `/api/backups/file/${rows[0].id}` };
  });

  // DELETE /api/backups/:id
  app.delete('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { rows } = await db.query(
      `DELETE FROM backups WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows.length)
      return reply.code(404).send({ error: 'Не найдено' });
    return { ok: true };
  });
};
