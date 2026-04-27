import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { query } from '../config/db.js';
import { sendEmail } from '../services/email.service.js';
import { sendTelegram } from '../services/telegram.service.js';
import { logger } from '../utils/logger.js';
import { execSync } from 'child_process';
import fs from 'fs';

const SCRIPTS_PATH = process.env.SCRIPTS_PATH || '/app/scripts';

export function createDatabaseWorker() {
  const worker = new Worker('database', async (job) => {
    const { databaseId } = job.data;
    logger.info(`[create-db] Starting job for DB ${databaseId}`);

    const { rows } = await query(
      `SELECT d.*, c.template_path, c.short_name, t.email as tenant_email, t.name as tenant_name
       FROM databases d
       LEFT JOIN configurations c ON c.id=d.config_id
       LEFT JOIN tenants t ON t.id=d.tenant_id
       WHERE d.id=$1`,
      [databaseId]
    );
    if (!rows.length) throw new Error(`Database ${databaseId} not found`);
    const db = rows[0];

    const pgDbName = `onec_${db.name}`;

    try {
      // Step 1: Create PG database
      logger.info(`[create-db] Step 1: Create PG DB ${pgDbName}`);
      execSync(`${SCRIPTS_PATH}/create-1c-db.sh "${db.name}" "${pgDbName}" "${db.template_path || ''}"`, {
        env: { ...process.env },
        timeout: 120000,
        stdio: 'pipe',
      });

      const publicUrl = `${process.env.ONEC_SERVER_URL}/${db.name}/`;

      await query(
        `UPDATE databases SET status='ACTIVE', pg_database_name=$1, public_url=$2, created_at=NOW() WHERE id=$3`,
        [pgDbName, publicUrl, databaseId]
      );

      logger.info(`[create-db] Done! DB ${db.name} is ACTIVE`);

      await sendEmail({
        to: db.tenant_email,
        subject: '✅ Ваша база 1С готова — O-Horizons Portal',
        html: `<p>Привет, ${db.tenant_name}!</p>
               <p>База <b>${db.display_name}</b> успешно создана и готова к работе.</p>
               <p><a href="${publicUrl}" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Открыть в браузере</a></p>
               <p>Войдите в <a href="${process.env.FRONTEND_URL}">портал</a> для управления пользователями и настройками.</p>`,
      });

      await sendTelegram(`✅ <b>База создана:</b> <code>${db.name}</code> для ${db.tenant_email}`);

    } catch (err) {
      logger.error(`[create-db] FAILED for ${db.name}:`, err.message);
      await query(
        `UPDATE databases SET status='ERROR', error_message=$1 WHERE id=$2`,
        [err.message, databaseId]
      );
      await sendTelegram(`❌ <b>Ошибка создания базы</b> <code>${db.name}</code>\n${err.message}`);
      throw err;
    }
  }, { connection: redis, concurrency: 2 });

  worker.on('failed', (job, err) => logger.error(`[create-db] job ${job?.id} failed:`, err.message));
  return worker;
}
