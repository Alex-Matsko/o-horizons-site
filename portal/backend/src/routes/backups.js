const db = require('../db');
const { Queue } = require('bullmq');
const { authenticate } = require('../middleware/auth');

const backupQueue = new Queue('backups', {
  connection: { host: process.env.REDIS_HOST || 'redis', port: 6379 },
});

module.exports = async (app) => {
  // GET /api/backups — все бэкапы клиента
  app.get('/', { preHandler: [app.authenticate] }, async (req) => {
    const { database_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT b.*, d.name AS db_name, d.configuration
                 FROM backups b JOIN databases_1c d ON d.id=b.database_id
                 WHERE b.tenant_id=$1`;
    const params = [req.user.sub];
    if (database_id) { query += ` AND b.database_id=$2`; params.push(database_id); }
    query += ` ORDER BY b.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const { rows } = await db.query(query, params);
    return rows;
  });

  // POST /api/backups/create — ручной бэкап
  app.post('/create', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { database_id } = req.body;
    if (!database_id) return reply.code(400).send({ error: 'database_id обязателен' });

    // Verify ownership
    const { rows } = await db.query(
      'SELECT * FROM databases_1c WHERE id=$1 AND tenant_id=$2 AND status=$3',
      [database_id, req.user.sub, 'active']
    );
    if (!rows.length) return reply.code(404).send({ error: 'База не найдена или недоступна' });
    const dbRow = rows[0];

    // Check for running backup
    const { rows: running } = await db.query(
      `SELECT id FROM backups WHERE database_id=$1 AND status IN ('pending','running')`,
      [database_id]
    );
    if (running.length) return reply.code(409).send({ error: 'Бэкап уже выполняется' });

    // Create backup record
    const tariff = await db.query(
      `SELECT tr.backup_retention_days FROM tenants ten
       JOIN tariffs tr ON tr.id=ten.tariff_id WHERE ten.id=$1`, [req.user.sub]
    );
    const retentionDays = tariff.rows[0]?.backup_retention_days || 7;
    const expiresAt = new Date(Date.now() + retentionDays * 86400000);

    const { rows: backup } = await db.query(
      `INSERT INTO backups(database_id,tenant_id,type,status,expires_at,started_at)
       VALUES($1,$2,'manual','pending',$3,NOW()) RETURNING *`,
      [database_id, req.user.sub, expiresAt]
    );

    await backupQueue.add('backup', { backupId: backup[0].id, dbRow, tenantId: req.user.sub }, {
      attempts: 3, backoff: { type: 'exponential', delay: 10000 },
    });

    return reply.code(201).send({ ok: true, backup: backup[0] });
  });

  // GET /api/backups/:id/download — ссылка на скачивание
  app.get('/:id/download', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { rows } = await db.query(
      'SELECT * FROM backups WHERE id=$1 AND tenant_id=$2 AND status=$3',
      [req.params.id, req.user.sub, 'success']
    );
    if (!rows.length) return reply.code(404).send({ error: 'Бэкап не найден' });
    const backup = rows[0];
    if (!backup.file_path) return reply.code(404).send({ error: 'Файл бэкапа недоступен' });
    // Signed download URL (serve via nginx X-Accel-Redirect)
    return { download_url: `/api/backups/file/${backup.id}` };
  });

  // DELETE /api/backups/:id
  app.delete('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { rows } = await db.query(
      'DELETE FROM backups WHERE id=$1 AND tenant_id=$2 RETURNING id',
      [req.params.id, req.user.sub]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Не найдено' });
    return { ok: true };
  });
};
