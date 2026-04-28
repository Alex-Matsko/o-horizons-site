const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => console.error('PG pool error:', err));

module.exports = {
  connect: async () => { await pool.query('SELECT 1'); console.log('✅ DB connected'); },
  query: (text, params) => pool.query(text, params),
  pool,
};
