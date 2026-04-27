import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  const sql = readFileSync(
    join(__dirname, '../../../migrations/001_initial.sql'),
    'utf8'
  );
  console.log('[migrate] Running 001_initial.sql...');
  await pool.query(sql);
  console.log('[migrate] Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error('[migrate] FAILED:', err.message);
  process.exit(1);
});
