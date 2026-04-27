import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';

const connection = redis;

export const databaseQueue = new Queue('database', { connection });
export const backupQueue   = new Queue('backup',   { connection });
export const healthQueue   = new Queue('health',   { connection });
