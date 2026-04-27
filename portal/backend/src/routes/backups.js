'use strict';

const { authMiddleware } = require('../middleware/auth');
const { Queue } = require('bullmq');
const path = require('path');
const fs = require('fs');

const backupQueue = new Queue('backup-db', {
  connection: { url: process.env.REDIS_URL },
});

module.exports = async function backupRoutes(app) {
  // GET /api/databases/:id/backups — список бэкапов
  app.get('/:id/backups', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      'SELECT id FROM databases WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.tenant.id]
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Database not found' });

    // Колонка называется size_bytes согласно миграции 001_initial.sql
    const { rows } = await app.db.query(
      `SELECT id, type, status, size_bytes, error_message,
              started_at, completed_at, expires_at, created_at
       FROM backups
       WHERE database_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.params.id]
    );
    return rows;
  });

  // POST /api/databases/:id/backups — создать бэкап вручную
  app.post('/:id/backups', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      `SELECT * FROM databases WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [req.params.id, req.tenant.id]
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Database not found or not active' });
    const db = dbRows[0];

    // Проверяем нет ли уже запущенного бэкапа
    const { rows: runningRows } = await app.db.query(
      `SELECT id FROM backups WHERE database_id = $1 AND status IN ('pending','running')`,
      [req.params.id]
    );
    if (runningRows.length > 0) {
      return reply.code(409).send({ error: 'A backup is already in progress for this database.' });
    }

    const { rows: bRows } = await app.db.query(
      `INSERT INTO backups (database_id, type, status, created_by)
       VALUES ($1, 'manual', 'pending', $2)
       RETURNING id, created_at`,
      [req.params.id, req.user.id]
    );
    const backup = bRows[0];

    await backupQueue.add(
      'backup',
      {
        backupId: backup.id,
        databaseId: req.params.id,
        infobaseName: db.infobase_name,
      },
      { attempts: 2, backoff: { type: 'exponential', delay: 30000 } }
    );

    return reply.code(202).send({ message: 'Backup queued', backup_id: backup.id });
  });

  // DELETE /api/databases/:id/backups/:bid — удалить бэкап
  app.delete('/:id/backups/:bid', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      'SELECT id FROM databases WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.tenant.id]
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Database not found' });

    const { rows } = await app.db.query(
      `SELECT * FROM backups WHERE id = $1 AND database_id = $2 AND status = 'done'`,
      [req.params.bid, req.params.id]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Backup not found or not completed' });

    // Удаляем файл с диска
    if (rows[0].file_path && fs.existsSync(rows[0].file_path)) {
      try { fs.unlinkSync(rows[0].file_path); } catch (e) { /* log but continue */ }
    }

    await app.db.query('DELETE FROM backups WHERE id = $1', [req.params.bid]);
    return { message: 'Backup deleted' };
  });

  // GET /api/databases/:id/backups/:bid/download — скачать бэкап
  app.get('/:id/backups/:bid/download', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      'SELECT id FROM databases WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.tenant.id]
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Database not found' });

    const { rows } = await app.db.query(
      `SELECT * FROM backups WHERE id = $1 AND database_id = $2 AND status = 'done'`,
      [req.params.bid, req.params.id]
    );
    if (!rows[0] || !rows[0].file_path) return reply.code(404).send({ error: 'Backup not ready or missing file' });

    const filePath = rows[0].file_path;
    if (!fs.existsSync(filePath)) return reply.code(404).send({ error: 'Backup file not found on disk. It may have been deleted.' });

    const stat = fs.statSync(filePath);
    const filename = path.basename(filePath);

    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Content-Type', 'application/octet-stream');
    reply.header('Content-Length', stat.size);
    return reply.send(fs.createReadStream(filePath));
  });
};
