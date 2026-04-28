import { Worker, QueueEvents } from 'bullmq';
import { redis } from './config/redis.js';
import { logger } from './utils/logger.js';
import { processDatabase } from './jobs/processDatabase.js';
import { processBackup }   from './jobs/processBackup.js';
import { processMail }     from './jobs/processMail.js';

const connection = redis;

// ─── Workers ────────────────────────────────────────────────────────────────

const dbWorker = new Worker('databases', async (job) => {
  logger.info({ jobId: job.id, data: job.data }, 'Processing database job');
  return processDatabase(job);
}, { connection, concurrency: 2 });

const backupWorker = new Worker('backups', async (job) => {
  logger.info({ jobId: job.id, data: job.data }, 'Processing backup job');
  return processBackup(job);
}, { connection, concurrency: 3 });

const mailWorker = new Worker('mail', async (job) => {
  logger.info({ jobId: job.id, data: job.data }, 'Processing mail job');
  return processMail(job);
}, { connection, concurrency: 5 });

// ─── Event handlers ─────────────────────────────────────────────────────────

for (const [name, worker] of [['databases', dbWorker], ['backups', backupWorker], ['mail', mailWorker]]) {
  worker.on('completed', (job) => logger.info({ queue: name, jobId: job.id }, 'Job completed'));
  worker.on('failed',    (job, err) => logger.error({ queue: name, jobId: job?.id, err }, 'Job failed'));
  worker.on('error',     (err) => logger.error({ queue: name, err }, 'Worker error'));
}

logger.info('Workers started: databases, backups, mail');

// ─── Graceful shutdown ───────────────────────────────────────────────────────

async function shutdown() {
  logger.info('Shutting down workers...');
  await Promise.all([dbWorker.close(), backupWorker.close(), mailWorker.close()]);
  logger.info('Workers stopped');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
