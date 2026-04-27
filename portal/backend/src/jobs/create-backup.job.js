import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { query } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const BACKUP_PATH = process.env.BACKUP_LOCAL_PATH || '/backups';

export function createBackupWorker() {
  const worker = new Worker('backup', async (job) => {
    const { backupId, databaseId, dbName } = job.data;
    logger.info(`[backup] Starting backup for ${dbName}`);

    const dir = path.join(BACKUP_PATH, dbName);
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${dbName}_${new Date().toISOString().replace(/[:.]/g, '-')}.dump`;
    const filePath = path.join(dir, filename);

    try {
      execSync(
        `pg_dump -Fc -h ${process.env.ONEC_PG_HOST || 'localhost'} -U ${process.env.ONEC_PG_USER || 'onec_user'} onec_${dbName} > "${filePath}"`,
        { env: { ...process.env, PGPASSWORD: process.env.ONEC_PG_PASSWORD }, timeout: 300000, stdio: 'pipe' }
      );

      const stats = fs.statSync(filePath);

      // Compute retention date based on tariff
      const { rows: dbRows } = await query(
        `SELECT t.backup_retention_days FROM tariffs t JOIN tenants ten ON ten.tariff_id=t.id
         JOIN databases d ON d.tenant_id=ten.id WHERE d.id=$1`, [databaseId]
      );
      const retentionDays = dbRows[0]?.backup_retention_days || 7;

      await query(
        `UPDATE backups SET status='READY', file_path=$1, file_size_bytes=$2,
         expires_at=NOW()+($3 || ' days')::interval, completed_at=NOW() WHERE id=$4`,
        [filePath, stats.size, retentionDays, backupId]
      );
      logger.info(`[backup] Done: ${filename} (${stats.size} bytes)`);
    } catch (err) {
      logger.error(`[backup] FAILED for ${dbName}:`, err.message);
      await query(`UPDATE backups SET status='ERROR', error_message=$1 WHERE id=$2`, [err.message, backupId]);
      throw err;
    }
  }, { connection: redis, concurrency: 3 });

  worker.on('failed', (job, err) => logger.error(`[backup] job ${job?.id} failed:`, err.message));
  return worker;
}
