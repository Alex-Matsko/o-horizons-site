import pg from 'pg';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  host:     process.env.PORTAL_DB_HOST     || 'portal-db',
  port:     parseInt(process.env.PORTAL_DB_PORT || '5432'),
  database: process.env.PORTAL_DB_NAME     || 'portal',
  user:     process.env.PORTAL_DB_USER     || 'portal_user',
  password: process.env.PORTAL_DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const query = (text, params) => pool.query(text, params);

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('PostgreSQL connected');
  } catch (err) {
    logger.error('PostgreSQL connection failed:', err.message);
    throw err;
  }
};
