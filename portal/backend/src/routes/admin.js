'use strict';
const db = require('../db');
const { Queue } = require('bullmq');

const provisionQueue = new Queue('provision', {
  connection: { host: process.env.REDIS_HOST || 'redis', port: 6379 },
});

module.exports = async (app) => {

  // ─── STATS ───────────────────────────────────────────────────────────────
  app.get('/stats', { preHandler: [app.adminOnly] }, async () => {
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM tenants WHERE role='client') AS total_clients,
        (SELECT COUNT(*) FROM tenants WHERE role='client' AND created_at > NOW()-INTERVAL '30 days') AS new_clients_30d,
        (SELECT COUNT(*) FROM databases) AS total_databases,
        (SELECT COUNT(*) FROM databases WHERE status='active') AS active_databases,
        (SELECT COUNT(*) FROM provision_requests WHERE status='pending') AS pending_requests,
        (SELECT COUNT(*) FROM backups WHERE status='success' AND created_at > NOW()-INTERVAL '24h') AS backups_24h,
        (SELECT COALESCE(SUM(disk_used_mb),0) FROM databases) AS total_storage_mb
    `);
    return rows[0];
  });

  // ─── REQUESTS (provision_requests) ───────────────────────────────────────

  // GET /api/admin/pending  — alias used by frontend AdminRequestsPage
  app.get('/pending', { preHandler: [app.adminOnly] }, async (req) => {
    const { rows } = await db.query(`
      SELECT pr.*, d.name AS db_name, d.url,
             t.email AS tenant_email, t.org_name AS tenant_name,
             c.name AS config_name, c.code AS config_code
      FROM provision_requests pr
      JOIN tenants t ON t.id = pr.tenant_id
      LEFT JOIN databases d ON d.id = pr.database_id
      LEFT JOIN onec_configs c ON c.id = pr.config_id
      WHERE pr.status = 'pending'
      ORDER BY pr.created_at ASC
    `);
    return rows;
  });

  // GET /api/admin/requests?status=pending|all
  app.get('/requests', { preHandler: [app.adminOnly] }, async (req) => {
    const { status = 'pending' } = req.query;
    const { rows } = await db.query(
      `SELECT pr.*, d.name AS db_name, d.url,
              t.email AS tenant_email, t.org_name AS tenant_name,
              c.name AS config_name
       FROM provision_requests pr
       JOIN tenants t ON t.id = pr.tenant_id
       LEFT JOIN databases d ON d.id = pr.database_id
       LEFT JOIN onec_configs c ON c.id = pr.config_id
       WHERE ($1 = 'all' OR pr.status = $1)
       ORDER BY pr.created_at DESC`,
      [status]
    );
    return rows;
  });

  // POST /api/admin/databases/:id/approve
  app.post('/databases/:id/approve', { preHandler: [app.adminOnly] }, async (req, reply) => {
    const { id } = req.params;
    const { comment } = req.body || {};

    const { rows } = await db.query(
      `SELECT pr.*, c.code AS config_code, c.platform, t.email AS tenant_email
       FROM provision_requests pr
       JOIN onec_configs c ON c.id = pr.config_id
       JOIN tenants t ON t.id = pr.tenant_id
       WHERE pr.id = $1 AND pr.status = 'pending'`,
      [id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Заявка не найдена или уже обработана' });
    const pr = rows[0];

    // Create database record if not exists
    const slug = pr.db_alias
      .toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 48) + '_' + Date.now().toString(36);

    const { rows: dbRows } = await db.query(
      `INSERT INTO databases (tenant_id, config_id, name, db_name, status)
       VALUES ($1, $2, $3, $4, 'pending_approval')
       ON CONFLICT (db_name) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [pr.tenant_id, pr.config_id, pr.db_alias, slug]
    );
    const dbRow = dbRows[0];

    // Update provision_request
    await db.query(
      `UPDATE provision_requests
       SET status = 'approved', admin_note = $1, database_id = $2,
           approved_by = $3, approved_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [comment || null, dbRow.id, req.user.id, id]
    );

    // Enqueue provisioning
    await provisionQueue.add('provision', {
      dbId: dbRow.id, requestId: id,
      slug, configCode: pr.config_code, platform: pr.platform,
      tenantEmail: pr.tenant_email,
    }, { attempts: 3, backoff: { type: 'fixed', delay: 15000 } });

    return { ok: true, database_id: dbRow.id };
  });

  // POST /api/admin/databases/:id/reject
  app.post('/databases/:id/reject', { preHandler: [app.adminOnly] }, async (req, reply) => {
    const { reason } = req.body || {};
    const { rows } = await db.query(
      `UPDATE provision_requests
       SET status = 'rejected', admin_note = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [reason || null, req.params.id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Заявка не найдена' });
    return { ok: true };
  });

  // ─── DATABASES ───────────────────────────────────────────────────────────

  // GET /api/admin/databases — all databases
  app.get('/databases', { preHandler: [app.adminOnly] }, async () => {
    const { rows } = await db.query(`
      SELECT d.*, t.email AS tenant_email, t.org_name AS tenant_name,
             c.name AS config_name
      FROM databases d
      JOIN tenants t ON t.id = d.tenant_id
      LEFT JOIN onec_configs c ON c.id = d.config_id
      ORDER BY d.created_at DESC
    `);
    return rows;
  });

  // PATCH /api/admin/databases/:id/suspend — suspend / unsuspend
  app.patch('/databases/:id/suspend', { preHandler: [app.adminOnly] }, async (req, reply) => {
    const { suspend } = req.body;
    const newStatus = suspend ? 'suspended' : 'active';
    const { rows } = await db.query(
      `UPDATE databases SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [newStatus, req.params.id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'База не найдена' });
    return rows[0];
  });

  // PATCH /api/admin/databases/:id/status — set arbitrary status
  app.patch('/databases/:id/status', { preHandler: [app.adminOnly] }, async (req, reply) => {
    const allowed = ['active', 'suspended', 'error', 'provisioning', 'pending_approval'];
    const { status } = req.body;
    if (!allowed.includes(status)) return reply.code(400).send({ error: 'Неверный статус' });
    const { rows } = await db.query(
      `UPDATE databases SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'База не найдена' });
    return rows[0];
  });

  // ─── TENANTS ─────────────────────────────────────────────────────────────

  // GET /api/admin/tenants
  app.get('/tenants', { preHandler: [app.adminOnly] }, async () => {
    const { rows } = await db.query(`
      SELECT t.id, t.email, t.org_name AS name, t.phone, t.role,
             t.is_active, t.email_verified, t.created_at,
             tr.name AS tariff,
             (SELECT COUNT(*) FROM databases d WHERE d.tenant_id = t.id) AS db_count
      FROM tenants t
      LEFT JOIN tariffs tr ON tr.id = t.tariff_id
      ORDER BY t.created_at DESC
    `);
    // Map is_active -> blocked for frontend compatibility
    return rows.map(r => ({ ...r, blocked: !r.is_active }));
  });

  // PATCH /api/admin/tenants/:id — block/unblock
  app.patch('/tenants/:id', { preHandler: [app.adminOnly] }, async (req, reply) => {
    const { blocked } = req.body;
    const { rows } = await db.query(
      `UPDATE tenants SET is_active = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, is_active`,
      [!blocked, req.params.id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Клиент не найден' });
    return { ...rows[0], blocked: !rows[0].is_active };
  });

  // PATCH /api/admin/tenants/:id/tariff
  app.patch('/tenants/:id/tariff', { preHandler: [app.adminOnly] }, async (req, reply) => {
    const { tariff_id } = req.body;
    const { rows } = await db.query(
      `UPDATE tenants SET tariff_id = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id`,
      [tariff_id, req.params.id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Клиент не найден' });
    return { ok: true };
  });

  // ─── CONFIGURATIONS ───────────────────────────────────────────────────────

  app.get('/configurations', { preHandler: [app.adminOnly] }, async () => {
    const { rows } = await db.query(
      `SELECT * FROM onec_configs WHERE is_active = true ORDER BY name`
    );
    return rows;
  });

  app.post('/configurations', { preHandler: [app.adminOnly] }, async (req, reply) => {
    const { code, name, cf_filename, platform } = req.body;
    const { rows } = await db.query(
      `INSERT INTO onec_configs (code, name, cf_filename, platform)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [code, name, cf_filename, platform || '8.3']
    );
    return reply.code(201).send(rows[0]);
  });
};
