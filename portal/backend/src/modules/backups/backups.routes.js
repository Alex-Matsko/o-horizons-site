import { authenticate } from '../../middleware/auth.middleware.js';
import { query } from '../../config/db.js';
import { backupQueue } from '../../jobs/queues.js';
import path from 'path';
import fs from 'fs';

export async function backupsRoutes(app) {
  app.addHook('preHandler', authenticate);

  // List backups for a database
  app.get('/:dbId/backups', async (req, reply) => {
    const { rows } = await query(
      `SELECT b.* FROM backups b
       JOIN databases d ON d.id=b.database_id
       WHERE b.database_id=$1 AND (d.tenant_id=$2 OR $3)
       ORDER BY b.created_at DESC`,
      [req.params.dbId, req.user.tenant_id, req.user.role === 'SUPER_ADMIN']
    );
    reply.send(rows);
  });

  // Create manual backup
  app.post('/:dbId/backups', async (req, reply) => {
    const { rows: dbRows } = await query(
      `SELECT d.*, t.tariff_id FROM databases d JOIN tenants t ON t.id=d.tenant_id
       WHERE d.id=$1 AND (d.tenant_id=$2 OR $3) AND d.status='ACTIVE'`,
      [req.params.dbId, req.user.tenant_id, req.user.role === 'SUPER_ADMIN']
    );
    if (!dbRows.length) return reply.code(404).send({ error: 'Database not found or not active' });
    const db = dbRows[0];

    // Check manual backup limit
    const { rows: limitRows } = await query(
      `SELECT tar.backup_manual_count FROM tariffs tar WHERE tar.id=$1`, [db.tariff_id]
    );
    const limit = limitRows[0]?.backup_manual_count || 2;
    const { rows: existingRows } = await query(
      `SELECT COUNT(*) FROM backups WHERE database_id=$1 AND type='manual' AND status='READY'`,
      [req.params.dbId]
    );
    if (parseInt(existingRows[0].count) >= limit) {
      return reply.code(403).send({ error: `Manual backup limit (${limit}) reached` });
    }

    const { rows } = await query(
      `INSERT INTO backups (database_id, type, status, created_by) VALUES ($1,'manual','CREATING',$2) RETURNING *`,
      [req.params.dbId, req.user.id]
    );
    const backup = rows[0];

    await backupQueue.add('create-backup', { backupId: backup.id, databaseId: db.id, dbName: db.name }, {
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
    });

    reply.code(202).send(backup);
  });

  // Download link (temp)
  app.get('/:dbId/backups/:backupId/download', async (req, reply) => {
    const { rows } = await query(
      `SELECT b.* FROM backups b JOIN databases d ON d.id=b.database_id
       WHERE b.id=$1 AND b.database_id=$2 AND b.status='READY' AND (d.tenant_id=$3 OR $4)`,
      [req.params.backupId, req.params.dbId, req.user.tenant_id, req.user.role === 'SUPER_ADMIN']
    );
    if (!rows.length) return reply.code(404).send({ error: 'Backup not found' });
    const backup = rows[0];
    if (!fs.existsSync(backup.file_path)) return reply.code(404).send({ error: 'Backup file not found' });
    reply.header('Content-Disposition', `attachment; filename="${path.basename(backup.file_path)}"`);
    return reply.sendFile(backup.file_path);
  });
}
