import { createDatabaseWorker } from './jobs/create-database.job.js';
import { createBackupWorker }   from './jobs/create-backup.job.js';
import { healthcheckWorker }    from './jobs/healthcheck.job.js';
import { logger }               from './utils/logger.js';

const workers = [
  createDatabaseWorker(),
  createBackupWorker(),
  healthcheckWorker(),
];

logger.info('Workers started: database, backup, health');

async function shutdown() {
  logger.info('Shutting down workers...');
  await Promise.all(workers.map(w => w.close()));
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
