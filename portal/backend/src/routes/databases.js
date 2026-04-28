const db = require('../db');
const mailer = require('../services/mailer');
const { authenticate } = require('../middleware/auth');

module.exports = async (app) => {
  // GET /api/databases — список баз клиента
  app.get('/', { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await db.query(
      `SELECT d.*, 
        (SELECT COUNT(*) FROM users_1c u WHERE u.database_id=d.id AND u.is_active) AS active_users,
        (SELECT checked_at FROM health_checks h WHERE h.database_id=d.id ORDER BY checked_at DESC LIMIT 1) AS last_check
       FROM databases_1c d WHERE d.tenant_id=$1 ORDER BY d.created_at DESC`,
      [req.user.sub]
    );
    return rows;
  });

  // GET /api/databases/:id
  app.get('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { rows } = await db.query(
      'SELECT * FROM databases_1c WHERE id=$1 AND tenant_id=$2',
      [req.params.id, req.user.sub]
    );
    if (!rows.length) return reply.code(404).send({ error: 'База не найдена' });
    return rows[0];
  });

  // POST /api/databases/request — заявка на новую базу
  app.post('/request', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { db_name_requested, configuration, platform_version, comment } = req.body;
    if (!db_name_requested || !configuration)
      return reply.code(400).send({ error: 'Укажите название и конфигурацию' });

    // Check tariff limits
    const { rows: limitRows } = await db.query(
      `SELECT t.max_databases,
        (SELECT COUNT(*) FROM databases_1c d WHERE d.tenant_id=$1 AND d.status IN ('active','provisioning')) AS current_count
       FROM tenants ten JOIN tariffs t ON t.id=ten.tariff_id WHERE ten.id=$1`,
      [req.user.sub]
    );
    const limit = limitRows[0];
    if (parseInt(limit.current_count) >= parseInt(limit.max_databases))
      return reply.code(402).send({ error: `Лимит баз по тарифу исчерпан (${limit.max_databases})` });

    const { rows } = await db.query(
      `INSERT INTO db_requests(tenant_id,db_name_requested,configuration,platform_version,comment)
       VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.sub, db_name_requested, configuration,
       platform_version || '8.3.27', comment || null]
    );
    const reqRow = rows[0];

    // Notify client and admin
    const { rows: tenantRows } = await db.query('SELECT email,company_name FROM tenants WHERE id=$1', [req.user.sub]);
    const tenant = tenantRows[0];
    await mailer.sendDbRequestReceived(tenant.email, db_name_requested).catch(() => {});
    await mailer.sendDbRequestAdmin(process.env.ADMIN_EMAIL, reqRow, tenant).catch(() => {});

    await db.query('INSERT INTO audit_log(tenant_id,action,entity,entity_id,meta) VALUES($1,$2,$3,$4,$5)',
      [req.user.sub, 'db_request', 'db_requests', reqRow.id, JSON.stringify({ configuration })]);

    return reply.code(201).send({ ok: true, request: reqRow });
  });

  // GET /api/databases/requests — мои заявки
  app.get('/my-requests', { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await db.query(
      'SELECT * FROM db_requests WHERE tenant_id=$1 ORDER BY created_at DESC',
      [req.user.sub]
    );
    return rows;
  });

  // GET /api/databases/:id/health
  app.get('/:id/health', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { rows } = await db.query(
      `SELECT h.status, h.response_ms, h.checked_at
       FROM health_checks h
       JOIN databases_1c d ON d.id=h.database_id
       WHERE h.database_id=$1 AND d.tenant_id=$2
       ORDER BY h.checked_at DESC LIMIT 50`,
      [req.params.id, req.user.sub]
    );
    return rows;
  });
};
