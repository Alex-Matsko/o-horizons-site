import { query } from '../config/db.js';
import { requireAuth, requireActiveAccount } from '../middleware/auth.js';
import { databaseQueue } from '../queues/index.js';

export async function databaseRoutes(app) {
  const preHandler = [requireAuth, requireActiveAccount];

  // GET /api/databases - list my databases
  app.get('/', { preHandler }, async (req) => {
    const { rows } = await query(
      `SELECT d.id, d.name, d.status, d.url, d.disk_used_mb,
              d.is_healthy, d.last_health_at, d.created_at,
              c.name AS config_name, c.code AS config_code
       FROM databases d
       JOIN onec_configs c ON c.id = d.config_id
       WHERE d.tenant_id = $1
       ORDER BY d.created_at DESC`,
      [req.user.sub]
    );
    return rows;
  });

  // GET /api/databases/:id
  app.get('/:id', { preHandler }, async (req, reply) => {
    const { rows } = await query(
      `SELECT d.*, c.name AS config_name, c.code AS config_code
       FROM databases d
       JOIN onec_configs c ON c.id = d.config_id
       WHERE d.id = $1 AND d.tenant_id = $2`,
      [req.params.id, req.user.sub]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Not found' });
    return rows[0];
  });

  // POST /api/databases/request - request a new database
  app.post('/request', { preHandler }, async (req, reply) => {
    const { config_id, db_alias } = req.body;
    if (!config_id || !db_alias) return reply.code(400).send({ error: 'config_id and db_alias are required' });
    if (!/^[a-zA-Z0-9_\u0400-\u04FF ]{2,64}$/.test(db_alias))
      return reply.code(400).send({ error: 'Invalid db_alias (2-64 chars, letters/digits/underscore/space)' });

    // Check tariff limits
    const { rows: limits } = await query(
      `SELECT tf.max_bases, COUNT(d.id)::int AS current_bases
       FROM tenants t
       JOIN tariffs tf ON tf.id = t.tariff_id
       LEFT JOIN databases d ON d.tenant_id = t.id AND d.status NOT IN ('deleted')
       WHERE t.id = $1
       GROUP BY tf.max_bases`,
      [req.user.sub]
    );
    const lim = limits[0];
    if (lim && lim.current_bases >= lim.max_bases)
      return reply.code(429).send({ error: `Tariff limit reached: max ${lim.max_bases} database(s). Upgrade your plan.` });

    const { rows } = await query(
      `INSERT INTO provision_requests (tenant_id, config_id, db_alias) VALUES ($1, $2, $3) RETURNING *`,
      [req.user.sub, config_id, db_alias]
    );

    // Notify admin via queue
    await databaseQueue.add('notify_admin_new_request', { requestId: rows[0].id });
    return reply.code(201).send({ message: 'Request submitted. Awaiting admin approval.', request: rows[0] });
  });

  // GET /api/databases/requests - my provision requests
  app.get('/requests/list', { preHandler }, async (req) => {
    const { rows } = await query(
      `SELECT pr.*, c.name AS config_name
       FROM provision_requests pr
       JOIN onec_configs c ON c.id = pr.config_id
       WHERE pr.tenant_id = $1
       ORDER BY pr.created_at DESC`,
      [req.user.sub]
    );
    return rows;
  });

  // GET /api/databases/:id/users - 1C users in this database
  app.get('/:id/users', { preHandler }, async (req, reply) => {
    const { rows: db } = await query(
      'SELECT id FROM databases WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.sub]
    );
    if (!db.length) return reply.code(404).send({ error: 'Not found' });
    const { rows } = await query(
      'SELECT * FROM db_users_cache WHERE database_id = $1 ORDER BY name',
      [req.params.id]
    );
    return rows;
  });
}
