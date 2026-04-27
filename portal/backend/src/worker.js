import { Worker } from 'bullmq';
import { redis } from './config/redis.js';
import { pool } from './config/db.js';
import { provisionDatabase } from './services/provisioner.js';
import { runBackup } from './services/backup.js';
import { sendMail } from './services/mailer.js';
import { notifyTelegram } from './services/telegram.js';

const connection = redis;

// ---- Database worker ----
const dbWorker = new Worker('databases', async (job) => {
  if (job.name === 'provision_database') {
    await provisionDatabase(job.data.requestId);
  }
  if (job.name === 'notify_admin_new_request') {
    const { rows } = await pool.query(
      `SELECT pr.id, t.email, t.org_name, c.name AS config_name, pr.db_alias
       FROM provision_requests pr
       JOIN tenants t ON t.id = pr.tenant_id
       JOIN onec_configs c ON c.id = pr.config_id
       WHERE pr.id = $1`,
      [job.data.requestId]
    );
    if (rows[0]) {
      await notifyTelegram(
        `📥 <b>Новая заявка на базу 1С</b>\n` +
        `Клиент: ${rows[0].org_name || rows[0].email}\n` +
        `Конфигурация: ${rows[0].config_name}\n` +
        `Название: ${rows[0].db_alias}\n` +
        `ID заявки: <code>${rows[0].id}</code>`
      );
    }
  }
}, { connection, concurrency: 2 });

// ---- Backup worker ----
const backupWorker = new Worker('backups', async (job) => {
  if (job.name === 'create_backup') {
    await runBackup(job.data.backupId);
  }
}, { connection, concurrency: 3 });

// ---- Mail worker ----
const mailWorker = new Worker('mail', async (job) => {
  await sendMail(job.data);
}, { connection, concurrency: 5 });

[dbWorker, backupWorker, mailWorker].forEach(w => {
  w.on('failed', (job, err) => console.error(`[Worker] Job ${job?.name} failed:`, err.message));
  w.on('completed', (job) => console.log(`[Worker] Job ${job.name} completed`));
});

console.log('[Worker] All workers started');
