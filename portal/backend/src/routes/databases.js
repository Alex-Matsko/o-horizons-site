import { query } from '../config/db.js';
import { authenticate, requireVerified } from '../middleware/auth.js';
import { databaseQueue } from '../queues/index.js';

export async function databaseRoutes(fastify) {
  // GET /api/databases — list my databases
  fastify.get('/', { preHandler: [requireVerified] }, async (req) => {
    const { tenantId } = req.user;
    const res = await query(
      `SELECT d.id, d.name, d.infobase_name, d.configuration, d.version_1c,
              d.status, d.apache_url, d.size_mb, d.healthcheck_ok,
              d.last_healthcheck_at, d.created_at
       FROM databases d WHERE d.tenant_id = $1
       ORDER BY d.created_at DESC`,
      [tenantId]
    );
    return res.rows;
  });

  // GET /api/databases/:id — database details + users
  fastify.get('/:id', { preHandler: [requireVerified] }, async (req, reply) => {
    const { tenantId } = req.user;
    const { id } = req.params;

    const dbRes = await query(
      `SELECT * FROM databases WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (!dbRes.rows.length) return reply.code(404).send({ error: 'Not found' });

    const usersRes = await query(
      `SELECT * FROM db_users WHERE database_id = $1 ORDER BY onec_user_name`,
      [id]
    );
    return { ...dbRes.rows[0], users: usersRes.rows };
  });

  // POST /api/databases/request — request new database
  fastify.post('/request', { preHandler: [requireVerified] }, async (req, reply) => {
    const { tenantId, sub: userId } = req.user;
    const { configuration, desiredName, version1c, comment } = req.body;

    if (!configuration) return reply.code(400).send({ error: 'Configuration required' });

    // Check plan limits
    const tenantRes = await query(
      `SELECT t.max_databases,
              (SELECT COUNT(*) FROM databases WHERE tenant_id = t.id AND status != 'deleting') as db_count
       FROM tenants t WHERE t.id = $1`,
      [tenantId]
    );
    const { max_databases, db_count } = tenantRes.rows[0];
    if (max_databases !== -1 && parseInt(db_count) >= max_databases) {
      return reply.code(403).send({ error: 'Database limit reached for your plan' });
    }

    // Check for pending request
    const pendingRes = await query(
      `SELECT id FROM db_requests WHERE tenant_id = $1 AND status = 'pending'`,
      [tenantId]
    );
    if (pendingRes.rows.length > 0) {
      return reply.code(409).send({ error: 'You already have a pending database request' });
    }

    const res = await query(
      `INSERT INTO db_requests (tenant_id, requested_by, configuration, desired_name, version_1c, comment)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenantId, userId, configuration, desiredName || null, version1c || '8.3.27', comment || null]
    );

    return reply.code(201).send(res.rows[0]);
  });

  // GET /api/databases/requests — my requests history
  fastify.get('/requests', { preHandler: [authenticate] }, async (req) => {
    const { tenantId } = req.user;
    const res = await query(
      `SELECT r.*, u.full_name as reviewed_by_name
       FROM db_requests r
       LEFT JOIN users u ON u.id = r.reviewed_by
       WHERE r.tenant_id = $1
       ORDER BY r.created_at DESC`,
      [tenantId]
    );
    return res.rows;
  });
}
