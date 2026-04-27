import { query } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { databaseQueue } from '../queues/index.js';

export async function adminRoutes(app) {
  const preHandler = [requireAdmin];

  // GET /api/admin/requests - pending provision requests
  app.get('/requests', { preHandler }, async () => {
    const { rows } = await query(
      `SELECT pr.*, t.email, t.org_name, c.name AS config_name
       FROM provision_requests pr
       JOIN tenants t ON t.id = pr.tenant_id
       JOIN onec_configs c ON c.id = pr.config_id
       WHERE pr.status = 'pending'
       ORDER BY pr.created_at ASC`
    );
    return rows;
  });

  // POST /api/admin/requests/:id/approve
  app.post('/requests/:id/approve', { preHandler }, async (req, reply) => {
    const { admin_note } = req.body || {};
    const { rows } = await query(
      `UPDATE provision_requests
       SET status = 'approved', admin_note = $2, approved_by = $3, approved_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [req.params.id, admin_note, req.user.sub]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Request not found or already processed' });
    await databaseQueue.add('provision_database', { requestId: rows[0].id }, { priority: 1 });
    return { message: 'Approved. Provisioning started.', request: rows[0] };
  });

  // POST /api/admin/requests/:id/reject
  app.post('/requests/:id/reject', { preHandler }, async (req, reply) => {
    const { admin_note } = req.body || {};
    const { rows } = await query(
      `UPDATE provision_requests
       SET status = 'rejected', admin_note = $2, approved_by = $3, approved_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [req.params.id, admin_note, req.user.sub]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Not found' });
    return rows[0];
  });

  // GET /api/admin/tenants
  app.get('/tenants', { preHandler }, async (req) => {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT t.id, t.email, t.org_name, t.is_active, t.email_verified, t.created_at,
                      tf.name AS tariff_name,
                      COUNT(d.id)::int AS db_count
               FROM tenants t
               LEFT JOIN tariffs tf ON tf.id = t.tariff_id
               LEFT JOIN databases d ON d.tenant_id = t.id
               WHERE t.role = 'client'`;
    const params = [];
    if (search) { params.push(`%${search}%`); sql += ` AND (t.email ILIKE $${params.length} OR t.org_name ILIKE $${params.length})`; }
    sql += ` GROUP BY t.id, tf.name ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const { rows } = await query(sql, params);
    return rows;
  });

  // PATCH /api/admin/tenants/:id
  app.patch('/tenants/:id', { preHandler }, async (req, reply) => {
    const { is_active, tariff_id } = req.body;
    const parts = [];
    const params = [req.params.id];
    if (is_active !== undefined) { params.push(is_active); parts.push(`is_active = $${params.length}`); }
    if (tariff_id !== undefined) { params.push(tariff_id); parts.push(`tariff_id = $${params.length}`); }
    if (!parts.length) return reply.code(400).send({ error: 'Nothing to update' });
    const { rows } = await query(
      `UPDATE tenants SET ${parts.join(', ')} WHERE id = $1 RETURNING id, email, is_active, tariff_id`,
      params
    );
    if (!rows.length) return reply.code(404).send({ error: 'Not found' });
    return rows[0];
  });

  // GET /api/admin/databases
  app.get('/databases', { preHandler }, async () => {
    const { rows } = await query(
      `SELECT d.*, t.email, t.org_name, c.name AS config_name
       FROM databases d
       JOIN tenants t ON t.id = d.tenant_id
       JOIN onec_configs c ON c.id = d.config_id
       ORDER BY d.created_at DESC`
    );
    return rows;
  });

  // GET /api/admin/stats
  app.get('/stats', { preHandler }, async () => {
    const [tenants, databases, pending, backups] = await Promise.all([
      query('SELECT COUNT(*)::int FROM tenants WHERE role = \'client\''),
      query('SELECT COUNT(*)::int FROM databases WHERE status = \'running\''),
      query('SELECT COUNT(*)::int FROM provision_requests WHERE status = \'pending\''),
      query('SELECT COUNT(*)::int FROM backups WHERE status = \'running\''),
    ]);
    return {
      tenants: tenants.rows[0].count,
      running_databases: databases.rows[0].count,
      pending_requests: pending.rows[0].count,
      running_backups: backups.rows[0].count,
    };
  });
}
