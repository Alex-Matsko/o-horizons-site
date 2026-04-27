import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const client = await pool.connect();
  try {
    const sql = readFileSync(join(__dirname, '001_initial.sql'), 'utf8');
    await client.query(sql);
    console.log('[Migrations] Done.');
  } catch (err) {
    console.error('[Migrations] Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
