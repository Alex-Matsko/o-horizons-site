import path from 'path';
import { query } from '../config/db.js';
import { requireVerified } from '../middleware/auth.js';
import { backupQueue } from '../queues/index.js';
import { config } from '../config/index.js';

export async function backupRoutes(fastify) {
  // GET /api/backups?databaseId=
  fastify.get('/', { preHandler: [requireVerified] }, async (req, reply) => {
    const { tenantId } = req.user;
    const { databaseId } = req.query;
    if (!databaseId) return reply.code(400).send({ error: 'databaseId required' });

    // Verify ownership
    const dbRes = await query(
      `SELECT id FROM databases WHERE id = $1 AND tenant_id = $2`,
      [databaseId, tenantId]
    );
    if (!dbRes.rows.length) return reply.code(404).send({ error: 'Database not found' });

    const res = await query(
      `SELECT id, file_name, size_bytes, type, status, error_message,
              started_at, completed_at, expires_at, created_at
       FROM backups WHERE database_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [databaseId]
    );
    return res.rows;
  });

  // POST /api/backups — create manual backup
  fastify.post('/', { preHandler: [requireVerified] }, async (req, reply) => {
    const { tenantId, sub: userId } = req.user;
    const { databaseId } = req.body;
    if (!databaseId) return reply.code(400).send({ error: 'databaseId required' });

    // Verify ownership and active status
    const dbRes = await query(
      `SELECT id, infobase_name FROM databases WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [databaseId, tenantId]
    );
    if (!dbRes.rows.length) return reply.code(404).send({ error: 'Active database not found' });

    // Check for running backup
    const runningRes = await query(
      `SELECT id FROM backups WHERE database_id = $1 AND status = 'running'`,
      [databaseId]
    );
    if (runningRes.rows.length > 0) {
      return reply.code(409).send({ error: 'A backup is already running' });
    }

    const { infobase_name } = dbRes.rows[0];
    const fileName = `${infobase_name}_${Date.now()}.dt`;
    const filePath = path.join(config.backups.localPath, fileName);

    const backupRes = await query(
      `INSERT INTO backups (database_id, file_path, file_name, type, status, created_by)
       VALUES ($1, $2, $3, 'manual', 'pending', $4) RETURNING id`,
      [databaseId, filePath, fileName, userId]
    );
    const backupId = backupRes.rows[0].id;

    await backupQueue.add('create-backup', { backupId, databaseId, infobaseName: infobase_name, filePath });

    return reply.code(202).send({ id: backupId, message: 'Backup queued' });
  });

  // DELETE /api/backups/:id
  fastify.delete('/:id', { preHandler: [requireVerified] }, async (req, reply) => {
    const { tenantId } = req.user;
    const { id } = req.params;

    // Verify ownership via join
    const res = await query(
      `SELECT b.id, b.file_path, b.status
       FROM backups b JOIN databases d ON d.id = b.database_id
       WHERE b.id = $1 AND d.tenant_id = $2`,
      [id, tenantId]
    );
    if (!res.rows.length) return reply.code(404).send({ error: 'Not found' });
    if (res.rows[0].status === 'running') return reply.code(409).send({ error: 'Cannot delete running backup' });

    await query(`DELETE FROM backups WHERE id = $1`, [id]);
    return { message: 'Deleted' };
  });
}
