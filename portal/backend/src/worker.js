'use strict';

require('dotenv').config();

const { Worker } = require('bullmq');
const { Pool }   = require('pg');

const { config }         = require('./config/index.js');
const { provisionDatabase } = require('./services/provisioner.js');
const { createBackup }   = require('./services/backup.js');
const { sendMail }       = require('./services/mailer.js');
const { notifyTelegram } = require('./services/telegram.js');

// ── Redis connection для BullMQ ──────────────────────
const connection = {
  host:     config.redis.host,
  port:     config.redis.port,
  password: config.redis.password || undefined,
};

// ── PostgreSQL pool (отдельный от app.js) ───────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ── Worker: создание баз 1С ──────────────────────────
const dbWorker = new Worker('databases', async (job) => {
  if (job.name === 'provision_database') {
    await provisionDatabase(pool, job.data.requestId);
  }

  if (job.name === 'notify_admin_new_request') {
    const { rows } = await pool.query(
      `SELECT pr.id, t.email, t.company_name, c.name AS config_name, pr.db_alias
       FROM provision_requests pr
       JOIN tenants t  ON t.id  = pr.tenant_id
       JOIN onec_configs c ON c.id = pr.config_id
       WHERE pr.id = $1`,
      [job.data.requestId]
    );
    if (rows[0]) {
      await notifyTelegram(
        `📥 <b>Новая заявка на базу 1С</b>\n` +
        `Клиент: ${rows[0].company_name || rows[0].email}\n` +
        `Конфигурация: ${rows[0].config_name}\n` +
        `Название: ${rows[0].db_alias}\n` +
        `ID заявки: <code>${rows[0].id}</code>`
      );
    }
  }
}, { connection, concurrency: 2 });

// ── Worker: резервные копии ───────────────────────────
const backupWorker = new Worker('backups', async (job) => {
  if (job.name === 'create_backup') {
    const { backupId } = job.data;
    // Получаем данные бэкапа
    const { rows } = await pool.query(
      `SELECT b.id, b.database_id, d.db_name, u.email AS tenant_email
       FROM backups b
       JOIN databases d ON d.id = b.database_id
       JOIN tenants t   ON t.id = d.tenant_id
       JOIN users u     ON u.tenant_id = t.id AND u.role = 'client'
       WHERE b.id = $1
       LIMIT 1`,
      [backupId]
    );
    if (!rows[0]) throw new Error('Backup record not found: ' + backupId);
    const { database_id, db_name, tenant_email } = rows[0];
    await createBackup({ dbId: database_id, pgDbName: db_name, tenantEmail: tenant_email }, pool);
  }
}, { connection, concurrency: 3 });

// ── Worker: отправка почты ────────────────────────────
const mailWorker = new Worker('mail', async (job) => {
  await sendMail(job.data);
}, { connection, concurrency: 5 });

// ── Логирование событий ───────────────────────────────
[dbWorker, backupWorker, mailWorker].forEach((w) => {
  w.on('failed',    (job, err) => console.error(`[Worker] Job ${job?.name} failed:`, err.message));
  w.on('completed', (job)      => console.log(`[Worker] Job ${job.name} completed`));
  w.on('error',     (err)      => console.error('[Worker] Worker error:', err.message));
});

console.log('[Worker] All workers started — databases, backups, mail');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received — shutting down');
  await Promise.all([dbWorker.close(), backupWorker.close(), mailWorker.close()]);
  await pool.end();
  process.exit(0);
});
