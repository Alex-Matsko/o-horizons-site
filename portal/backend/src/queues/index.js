import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';

const connection = redis;

export const databaseQueue = new Queue('databases', { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } } });
export const backupQueue   = new Queue('backups',   { connection, defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 10000 } } });
export const mailQueue     = new Queue('mail',      { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'fixed', delay: 5000 } } });
