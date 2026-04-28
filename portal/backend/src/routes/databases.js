'use strict';
const db = require('../db');
const mailer = require('../services/mailer');

module.exports = async (app) => {

  // GET /api/databases — список баз клиента
  app.get('/', { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await db.query(
      `SELECT d.*,
              c.name  AS config_name,
              c.code  AS config_code,
              (SELECT COUNT(*) FROM db_users_cache u
               WHERE u.database_id = d.id AND u.is_active) AS active_users,
              (SELECT checked_at FROM healthcheck_history h
               WHERE h.database_id = d.id
               ORDER BY checked_at DESC LIMIT 1)  AS last_check_at,
              (SELECT is_up FROM healthcheck_history h
               WHERE h.database_id = d.id
               ORDER BY checked_at DESC LIMIT 1)  AS is_up
       FROM databases d
       LEFT JOIN onec_configs c ON c.id = d.config_id
       WHERE d.tenant_id = $1
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    return rows;
  });

  // GET /api/databases/:id
  app.get('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { rows } = await db.query(
      `SELECT d.*, c.name AS config_name, c.code AS config_code
       FROM databases d
       LEFT JOIN onec_configs c ON c.id = d.config_id
       WHERE d.id = $1 AND d.tenant_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'База не найдена' });
    return rows[0];
  });

  // POST /api/databases/request — заявка на новую базу
  app.post('/request', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { db_alias, config_id, comment } = req.body;
    if (!db_alias || !config_id)
      return reply.code(400).send({ error: 'Укажите название базы и конфигурацию' });

    // Check tariff limits
    const { rows: limitRows } = await db.query(
      `SELECT tr.max_bases,
              (SELECT COUNT(*) FROM databases d
               WHERE d.tenant_id = $1
               AND d.status NOT IN ('error','deleted')) AS current_count
       FROM tenants ten
       JOIN tariffs tr ON tr.id = ten.tariff_id
       WHERE ten.id = $1`,
      [req.user.id]
    );
    if (!limitRows.length)
      return reply.code(403).send({ error: 'Тенант не найден' });

    const { max_bases, current_count } = limitRows[0];
    if (parseInt(current_count) >= parseInt(max_bases))
      return reply.code(402).send({ error: `Лимит баз по тарифу исчерпан (${max_bases})` });

    // Check config exists
    const { rows: cfgRows } = await db.query(
      'SELECT id FROM onec_configs WHERE id = $1 AND is_active = true', [config_id]
    );
    if (!cfgRows.length)
      return reply.code(400).send({ error: 'Конфигурация не найдена' });

    // Create provision request
    const { rows } = await db.query(
      `INSERT INTO provision_requests (tenant_id, config_id, db_alias, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [req.user.id, config_id, db_alias.trim()]
    );
    const pr = rows[0];

    // Audit log
    await db.query(
      `INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, meta)
       VALUES ($1, 'db_request_created', 'provision_requests', $2, $3)`,
      [req.user.id, pr.id, JSON.stringify({ db_alias, config_id })]
    );

    // Notify
    const { rows: tRows } = await db.query(
      'SELECT email, org_name FROM tenants WHERE id = $1', [req.user.id]
    );
    const tenant = tRows[0];
    await mailer.sendDbRequestReceived(tenant.email, db_alias).catch(() => {});
    await mailer.sendDbRequestAdmin(
      process.env.ADMIN_EMAIL, pr, tenant
    ).catch(() => {});

    return reply.code(201).send({ ok: true, request: pr });
  });

  // GET /api/databases/my-requests — мои заявки
  app.get('/my-requests', { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await db.query(
      `SELECT pr.*, c.name AS config_name
       FROM provision_requests pr
       LEFT JOIN onec_configs c ON c.id = pr.config_id
       WHERE pr.tenant_id = $1
       ORDER BY pr.created_at DESC`,
      [req.user.id]
    );
    return rows;
  });

  // GET /api/databases/:id/health
  app.get('/:id/health', { preHandler: [app.authenticate] }, async (req, reply) => {
    // Verify ownership
    const { rows: own } = await db.query(
      'SELECT id FROM databases WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.id]
    );
    if (!own.length) return reply.code(404).send({ error: 'База не найдена' });

    const { rows } = await db.query(
      `SELECT is_up, latency_ms, checked_at
       FROM healthcheck_history
       WHERE database_id = $1
       ORDER BY checked_at DESC
       LIMIT 50`,
      [req.params.id]
    );
    return rows;
  });

  // GET /api/databases/:id/steps — прогресс провизионинга
  app.get('/:id/steps', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { rows: own } = await db.query(
      'SELECT id FROM databases WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.id]
    );
    if (!own.length) return reply.code(404).send({ error: 'База не найдена' });

    const { rows } = await db.query(
      `SELECT ps.*
       FROM provision_steps ps
       JOIN provision_requests pr ON pr.id = ps.request_id
       WHERE pr.database_id = $1
       ORDER BY ps.step ASC`,
      [req.params.id]
    );
    return rows;
  });

  // GET /api/databases/configs — доступные конфигурации для выбора
  app.get('/configs', { preHandler: [app.authenticate] }, async () => {
    const { rows } = await db.query(
      'SELECT id, code, name, platform FROM onec_configs WHERE is_active = true ORDER BY name'
    );
    return rows;
  });
};
