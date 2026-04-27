import { query } from '../config/db.js';
import { requireAuth, requireActiveAccount } from '../middleware/auth.js';
import { backupQueue } from '../queues/index.js';

export async function backupRoutes(app) {
  const preHandler = [requireAuth, requireActiveAccount];

  // GET /api/backups?database_id=...
  app.get('/', { preHandler }, async (req) => {
    const { database_id } = req.query;
    let sql = `
      SELECT b.*, d.name AS db_name
      FROM backups b
      JOIN databases d ON d.id = b.database_id
      WHERE b.tenant_id = $1
    `;
    const params = [req.user.sub];
    if (database_id) { sql += ' AND b.database_id = $2'; params.push(database_id); }
    sql += ' ORDER BY b.created_at DESC LIMIT 50';
    const { rows } = await query(sql, params);
    return rows;
  });

  // POST /api/backups - create manual backup
  app.post('/', { preHandler }, async (req, reply) => {
    const { database_id } = req.body;
    if (!database_id) return reply.code(400).send({ error: 'database_id is required' });

    const { rows: db } = await query(
      `SELECT id, status FROM databases WHERE id = $1 AND tenant_id = $2`,
      [database_id, req.user.sub]
    );
    if (!db.length) return reply.code(404).send({ error: 'Database not found' });
    if (db[0].status !== 'running') return reply.code(400).send({ error: 'Database is not running' });

    // Check no backup already running
    const { rows: running } = await query(
      `SELECT id FROM backups WHERE database_id = $1 AND status IN ('pending','running')`,
      [database_id]
    );
    if (running.length) return reply.code(409).send({ error: 'A backup is already in progress' });

    const { rows } = await query(
      `INSERT INTO backups (database_id, tenant_id, type, expires_at)
       VALUES ($1, $2, 'manual', NOW() + INTERVAL '${14} days')
       RETURNING *`,
      [database_id, req.user.sub]
    );
    await backupQueue.add('create_backup', { backupId: rows[0].id });
    return reply.code(201).send(rows[0]);
  });
}
