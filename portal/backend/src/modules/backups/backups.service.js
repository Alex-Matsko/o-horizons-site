import { getDb } from '../../config/db.js';
import { backupQueue } from '../../queues/index.js';

export async function listBackups(tenantId, dbId) {
  const db = getDb();
  const { rows } = await db.query(
    `SELECT b.* FROM backups b
     JOIN databases d ON d.id = b.database_id
     WHERE d.tenant_id = $1 AND b.database_id = $2
     ORDER BY b.created_at DESC`,
    [tenantId, dbId]
  );
  return rows;
}

export async function createBackup(tenantId, dbId) {
  const db = getDb();
  const { rows: [database] } = await db.query(
    'SELECT * FROM databases WHERE id = $1 AND tenant_id = $2 AND status = $3',
    [dbId, tenantId, 'active']
  );
  if (!database) throw new Error('Database not found or not active');

  const { rows: [backup] } = await db.query(
    `INSERT INTO backups (database_id, status, created_at)
     VALUES ($1, 'pending', NOW()) RETURNING *`,
    [dbId]
  );

  await backupQueue.add('create-backup', { backupId: backup.id, dbName: database.db_name, dbId });
  return backup;
}

export async function deleteBackup(tenantId, backupId) {
  const db = getDb();
  const { rows: [backup] } = await db.query(
    `SELECT b.* FROM backups b
     JOIN databases d ON d.id = b.database_id
     WHERE b.id = $1 AND d.tenant_id = $2`,
    [backupId, tenantId]
  );
  if (!backup) throw new Error('Backup not found or access denied');
  if (backup.status === 'in_progress') throw new Error('Cannot delete backup in progress');

  await db.query('DELETE FROM backups WHERE id = $1', [backupId]);
  return { ok: true };
}

export async function getBackupDownloadUrl(tenantId, backupId) {
  const db = getDb();
  const { rows: [backup] } = await db.query(
    `SELECT b.* FROM backups b
     JOIN databases d ON d.id = b.database_id
     WHERE b.id = $1 AND d.tenant_id = $2 AND b.status = 'done'`,
    [backupId, tenantId]
  );
  if (!backup) throw new Error('Backup not found or not ready');
  return backup.file_path;
}
