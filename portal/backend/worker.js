import { createDatabaseWorker } from './src/jobs/create-database.job.js';
import { createBackupWorker } from './src/jobs/create-backup.job.js';
import { healthcheckWorker } from './src/jobs/healthcheck.job.js';
import { logger } from './src/utils/logger.js';

logger.info('Portal worker starting...');

createWorker();

function createWorker() {
  createDatabaseWorker();
  createBackupWorker();
  healthcheckWorker();
  logger.info('All workers started');
}
