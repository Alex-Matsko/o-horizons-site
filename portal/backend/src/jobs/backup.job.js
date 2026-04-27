'use strict';

const { Pool } = require('pg');
const backupService = require('../services/backup.service');

async function processBackup(job) {
  const db = new Pool({ connectionString: process.env.DATABASE_URL });
  const { backupId, databaseId, slug, dbName, dbHost } = job.data;

  try {
    await db.query(
      `UPDATE backups SET status='in_progress', started_at=NOW() WHERE id=$1`,
      [backupId]
    );

    const { rows: dbRows } = await db.query(
      'SELECT db_user, db_host FROM databases WHERE id=$1',
      [databaseId]
    );

    const result = await backupService.runBackup({
      slug,
      dbName,
      dbHost: dbHost || dbRows[0]?.db_host || 'localhost',
      dbUser: process.env.DB_USER_1C,
      dbPass: process.env.DB_PASS_1C,
    });

    await db.query(
      `UPDATE backups SET status='done', file_path=$1, file_size_bytes=$2,
        completed_at=NOW(), expires_at=NOW() + INTERVAL '30 days'
       WHERE id=$3`,
      [result.filePath, result.fileSize, backupId]
    );
  } catch (err) {
    await db.query(
      `UPDATE backups SET status='error', error_message=$1, completed_at=NOW() WHERE id=$2`,
      [err.message, backupId]
    );
    throw err;
  } finally {
    await db.end();
  }
}

module.exports = { processBackup };
