import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import * as dbService from '../databases/databases.service.js';
import { query } from '../../config/db.js';

export async function adminRoutes(app) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('SUPER_ADMIN'));

  // GET /admin/pending — alias for frontend
  app.get('/pending', async (req, reply) => {
    const { rows } = await query(
      `SELECT d.*, t.name as tenant_name, t.email as tenant_email, c.name as config_name
       FROM databases d
       LEFT JOIN tenants t ON t.id=d.tenant_id
       LEFT JOIN configurations c ON c.id=d.config_id
       WHERE d.status='PENDING'
       ORDER BY d.requested_at ASC`
    );
    reply.send(rows);
  });

  // GET /admin/databases/pending
  app.get('/databases/pending', async (req, reply) => {
    const { rows } = await query(
      `SELECT d.*, t.name as tenant_name, t.email as tenant_email, c.name as config_name
       FROM databases d
       LEFT JOIN tenants t ON t.id=d.tenant_id
       LEFT JOIN configurations c ON c.id=d.config_id
       WHERE d.status='PENDING'
       ORDER BY d.requested_at ASC`
    );
    reply.send(rows);
  });

  // GET /admin/databases — all databases
  app.get('/databases', async (req, reply) => {
    const { rows } = await query(
      `SELECT d.*, t.name as tenant_name, t.email as tenant_email, c.name as config_name
       FROM databases d
       LEFT JOIN tenants t ON t.id=d.tenant_id
       LEFT JOIN configurations c ON c.id=d.config_id
       WHERE d.deleted_at IS NULL
       ORDER BY d.created_at DESC`
    );
    reply.send(rows);
  });

  // POST /admin/databases/:id/approve
  app.post('/databases/:id/approve', async (req, reply) => {
    try {
      const db = await dbService.approveDatabase(req.params.id, req.body?.comment);
      reply.send(db);
    } catch (err) {
      reply.code(err.statusCode || 500).send({ error: err.message });
    }
  });

  // POST /admin/databases/:id/reject
  app.post('/databases/:id/reject', async (req, reply) => {
    try {
      const db = await dbService.rejectDatabase(req.params.id, req.body?.reason);
      reply.send(db);
    } catch (err) {
      reply.code(err.statusCode || 500).send({ error: err.message });
    }
  });

  // PATCH /admin/databases/:id/suspend
  app.patch('/databases/:id/suspend', async (req, reply) => {
    const { suspend } = req.body;
    const newStatus = suspend ? 'SUSPENDED' : 'ACTIVE';
    const { rows } = await query(
      `UPDATE databases SET status=$1, updated_at=NOW() WHERE id=$2 AND deleted_at IS NULL RETURNING *`,
      [newStatus, req.params.id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Database not found' });
    reply.send(rows[0]);
  });

  // GET /admin/tenants
  app.get('/tenants', async (req, reply) => {
    const { rows } = await query(
      `SELECT t.*, tar.name as tariff,
       (SELECT COUNT(*) FROM databases d WHERE d.tenant_id=t.id AND d.deleted_at IS NULL) as db_count
       FROM tenants t LEFT JOIN tariffs tar ON tar.id=t.tariff_id
       ORDER BY t.created_at DESC`
    );
    reply.send(rows);
  });

  // PATCH /admin/tenants/:id — block/unblock
  app.patch('/tenants/:id', async (req, reply) => {
    const { blocked } = req.body;
    const newStatus = blocked ? 'BLOCKED' : 'ACTIVE';
    const { rows } = await query(
      `UPDATE tenants SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [newStatus, req.params.id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Tenant not found' });
    reply.send(rows[0]);
  });

  // GET /admin/stats
  app.get('/stats', async (req, reply) => {
    const [tenants, dbs, pending] = await Promise.all([
      query(`SELECT COUNT(*) FROM tenants WHERE status='ACTIVE'`),
      query(`SELECT COUNT(*), status FROM databases WHERE deleted_at IS NULL GROUP BY status`),
      query(`SELECT COUNT(*) FROM databases WHERE status='PENDING'`),
    ]);
    reply.send({
      total_tenants: parseInt(tenants.rows[0].count),
      pending_requests: parseInt(pending.rows[0].count),
      databases: dbs.rows,
    });
  });

  // GET /admin/configurations
  app.get('/configurations', async (req, reply) => {
    const { rows } = await query(`SELECT * FROM configurations WHERE is_active=true ORDER BY name`);
    reply.send(rows);
  });

  // POST /admin/configurations
  app.post('/configurations', async (req, reply) => {
    const { name, short_name, version, template_path, platform_versions } = req.body;
    const { rows } = await query(
      `INSERT INTO configurations (name, short_name, version, template_path, platform_versions) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, short_name, version, template_path, platform_versions]
    );
    reply.code(201).send(rows[0]);
  });
}
