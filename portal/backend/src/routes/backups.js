'use strict';

const { authMiddleware } = require('../middleware/auth');
const { Queue } = require('bullmq');
const path = require('path');
const fs = require('fs');

const backupQueue = new Queue('backup-db', {
  connection: { url: process.env.REDIS_URL },
});

module.exports = async function backupRoutes(app) {
  // Список бэкапов
  app.get('/:id/backups', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      'SELECT id FROM databases WHERE id=$1 AND tenant_id=$2',
      [req.params.id, req.tenant.id]
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Not found' });

    const { rows } = await app.db.query(
      `SELECT id, type, status, file_size_bytes, started_at, completed_at, expires_at, created_at
       FROM backups WHERE database_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    );
    return rows;
  });

  // Создать бэкап
  app.post('/:id/backups', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      'SELECT * FROM databases WHERE id=$1 AND tenant_id=$2 AND status=$3',
      [req.params.id, req.tenant.id, 'active']
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Not found or not active' });

    const { rows: bRows } = await app.db.query(
      `INSERT INTO backups (database_id, type, status)
       VALUES ($1, 'manual', 'pending') RETURNING id`,
      [req.params.id]
    );
    await backupQueue.add('backup', {
      backupId: bRows[0].id,
      databaseId: req.params.id,
      slug: dbRows[0].slug,
      dbName: dbRows[0].db_name,
      dbHost: dbRows[0].db_host,
    });
    return reply.code(202).send({ message: 'Backup queued', backup_id: bRows[0].id });
  });

  // Скачать бэкап
  app.get('/:id/backups/:bid/download', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      'SELECT id FROM databases WHERE id=$1 AND tenant_id=$2',
      [req.params.id, req.tenant.id]
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Not found' });

    const { rows } = await app.db.query(
      'SELECT * FROM backups WHERE id=$1 AND database_id=$2 AND status=$3',
      [req.params.bid, req.params.id, 'done']
    );
    if (!rows[0] || !rows[0].file_path) return reply.code(404).send({ error: 'Backup not ready' });

    const filePath = rows[0].file_path;
    if (!fs.existsSync(filePath)) return reply.code(404).send({ error: 'File not found' });

    const filename = path.basename(filePath);
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Content-Type', 'application/octet-stream');
    return reply.send(fs.createReadStream(filePath));
  });
};
