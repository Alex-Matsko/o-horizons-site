'use strict';

require('dotenv').config();
const { Worker } = require('bullmq');
const { processCreateDb } = require('./src/jobs/create-db.job');
const { processBackup }   = require('./src/jobs/backup.job');

const connection = { url: process.env.REDIS_URL };

const createDbWorker = new Worker('create-db', processCreateDb, {
  connection,
  concurrency: 2,
});

const backupWorker = new Worker('backup-db', processBackup, {
  connection,
  concurrency: 3,
});

createDbWorker.on('completed', job => console.log(`[create-db] Job ${job.id} done`));
createDbWorker.on('failed',    (job, err) => console.error(`[create-db] Job ${job?.id} failed: ${err.message}`));

backupWorker.on('completed', job => console.log(`[backup] Job ${job.id} done`));
backupWorker.on('failed',    (job, err) => console.error(`[backup] Job ${job?.id} failed: ${err.message}`));

console.log('[worker] BullMQ workers started: create-db, backup-db');
