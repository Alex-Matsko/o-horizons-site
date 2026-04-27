'use strict';

const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const execAsync = util.promisify(exec);
const { Pool } = require('pg');
const { mailService } = require('../services/mail.service');

const SCRIPT_PATH = path.resolve(__dirname, '../../../scripts/create-db.sh');

async function processCreateDb(job) {
  const db = new Pool({ connectionString: process.env.DATABASE_URL });
  const { requestId, databaseId, tenantId, slug, dbName, configuration } = job.data;

  const log = async (msg) => {
    console.log(`[create-db][${slug}] ${msg}`);
    await db.query(
      `UPDATE databases SET updated_at=NOW() WHERE id=$1`, [databaseId]
    );
  };

  try {
    await log('Starting creation pipeline');

    const env = {
      ...process.env,
      SLUG: slug,
      CONFIG: configuration,
      DB_NAME: dbName,
      DB_HOST: process.env.DB_HOST_1C || 'localhost',
      DB_USER: process.env.DB_USER_1C,
      DB_PASS: process.env.DB_PASS_1C,
      ONEC_VERSION: process.env.ONEC_DEFAULT_VERSION || '8.3.27',
      CLUSTER_ID: process.env.ONEC_CLUSTER_ID,
      CF_BASE_PATH: process.env.CF_BASE_PATH || '/opt/1c/templates',
    };

    const { stdout } = await execAsync(`bash "${SCRIPT_PATH}"`, {
      env,
      timeout: 1800000, // 30 минут
    });

    // Парсим WEB_URL из stdout
    const urlMatch = stdout.match(/WEB_URL=(.+)/);
    const webUrl = urlMatch?.[1]?.trim();

    await db.query(
      `UPDATE databases SET status='active', web_url=$1, updated_at=NOW() WHERE id=$2`,
      [webUrl, databaseId]
    );
    await db.query(
      `UPDATE database_requests SET status='done', updated_at=NOW() WHERE id=$1`,
      [requestId]
    );

    // Отправляем email
    const { rows } = await db.query('SELECT email, full_name FROM tenants WHERE id=$1', [tenantId]);
    const { rows: dbRows } = await db.query('SELECT name FROM databases WHERE id=$1', [databaseId]);
    if (rows[0]) {
      await mailService.sendDbReady(rows[0].email, dbRows[0]?.name, webUrl);
    }

    await log(`Done. URL: ${webUrl}`);
  } catch (err) {
    console.error(`[create-db][${slug}] ERROR:`, err.message);
    await db.query(
      `UPDATE databases SET status='error', error_message=$1, updated_at=NOW() WHERE id=$2`,
      [err.message, databaseId]
    );
    await db.query(
      `UPDATE database_requests SET status='error', updated_at=NOW() WHERE id=$1`,
      [requestId]
    );
    // Уведомляем админа
    const { rows: admins } = await db.query('SELECT email FROM tenants WHERE is_admin=TRUE');
    for (const admin of admins) {
      await mailService.sendDbError(admin.email, slug, err.message);
    }
    throw err;
  } finally {
    await db.end();
  }
}

module.exports = { processCreateDb };
