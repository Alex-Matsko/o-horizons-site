'use strict';

const { adminMiddleware } = require('../middleware/auth');
const { Queue } = require('bullmq');
const mailService = require('../services/mail.service');

const dbQueue = new Queue('create-db', { connection: { url: process.env.REDIS_URL } });

module.exports = async function adminRoutes(app) {
  // Список клиентов
  app.get('/tenants', { preHandler: adminMiddleware }, async (req) => {
    const { rows } = await app.db.query(
      `SELECT t.*, p.name as plan_name,
        (SELECT COUNT(*) FROM databases d WHERE d.tenant_id=t.id) as db_count
       FROM tenants t LEFT JOIN plans p ON p.id=t.plan_id
       ORDER BY t.created_at DESC`
    );
    return rows;
  });

  // Обновить клиента (тариф, статус)
  app.patch('/tenants/:id', { preHandler: adminMiddleware }, async (req, reply) => {
    const { plan_id, is_active } = req.body;
    const { rows } = await app.db.query(
      `UPDATE tenants SET
        plan_id = COALESCE($1, plan_id),
        is_active = COALESCE($2, is_active),
        updated_at = NOW()
       WHERE id=$3 RETURNING id, email, plan_id, is_active`,
      [plan_id, is_active, req.params.id]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Not found' });
    return rows[0];
  });

  // Все базы
  app.get('/databases', { preHandler: adminMiddleware }, async (req) => {
    const { status, tenant_id } = req.query;
    let query = `SELECT d.*, t.email as tenant_email, p.name as plan_name
      FROM databases d
      JOIN tenants t ON t.id=d.tenant_id
      JOIN plans p ON p.id=t.plan_id
      WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); query += ` AND d.status=$${params.length}`; }
    if (tenant_id) { params.push(tenant_id); query += ` AND d.tenant_id=$${params.length}`; }
    query += ' ORDER BY d.created_at DESC';
    const { rows } = await app.db.query(query, params);
    return rows;
  });

  // Изменить статус базы
  app.patch('/databases/:id', { preHandler: adminMiddleware }, async (req, reply) => {
    const { status } = req.body;
    const { rows } = await app.db.query(
      'UPDATE databases SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Not found' });
    return rows[0];
  });

  // Заявки на создание баз
  app.get('/requests', { preHandler: adminMiddleware }, async (req) => {
    const { rows } = await app.db.query(
      `SELECT r.*, t.email as tenant_email, t.company_name
       FROM database_requests r
       JOIN tenants t ON t.id=r.tenant_id
       ORDER BY r.created_at DESC`
    );
    return rows;
  });

  // Одобрить заявку — запускает pipeline
  app.post('/requests/:id/approve', { preHandler: adminMiddleware }, async (req, reply) => {
    const { rows } = await app.db.query(
      `UPDATE database_requests SET status='approved', approved_by=$1, approved_at=NOW()
       WHERE id=$2 AND status='pending' RETURNING *`,
      [req.tenant.id, req.params.id]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Not found or already processed' });

    const request = rows[0];
    const slug = `db_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const dbName = `portal_${slug}`;

    // Создаём запись базы со статусом 'creating'
    const { rows: dbRows } = await app.db.query(
      `INSERT INTO databases (tenant_id, name, slug, configuration, version_1c, status, db_name, db_host)
       VALUES ($1,$2,$3,$4,$5,'creating',$6,$7) RETURNING *`,
      [request.tenant_id, request.desired_name, slug, request.configuration,
       process.env.ONEC_DEFAULT_VERSION || '8.3.27', dbName, process.env.DB_HOST_1C || 'localhost']
    );

    await app.db.query(
      'UPDATE database_requests SET database_id=$1, status=$2 WHERE id=$3',
      [dbRows[0].id, 'processing', request.id]
    );

    // Добавляем задачу в очередь
    await dbQueue.add('create-db', {
      requestId: request.id,
      databaseId: dbRows[0].id,
      tenantId: request.tenant_id,
      slug,
      dbName,
      configuration: request.configuration,
    });

    return { message: 'Approved. Database creation queued.', database_id: dbRows[0].id };
  });

  // Отклонить заявку
  app.post('/requests/:id/reject', { preHandler: adminMiddleware }, async (req, reply) => {
    const { admin_comment } = req.body;
    const { rows } = await app.db.query(
      `UPDATE database_requests SET status='rejected', admin_comment=$1
       WHERE id=$2 AND status='pending' RETURNING *`,
      [admin_comment, req.params.id]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Not found or already processed' });
    return { message: 'Request rejected' };
  });

  // Healthcheck всех баз
  app.get('/healthcheck', { preHandler: adminMiddleware }, async () => {
    const { rows } = await app.db.query(
      `SELECT d.id, d.name, d.slug, d.status, d.web_url,
        (SELECT h.status FROM healthcheck_history h
         WHERE h.database_id=d.id ORDER BY h.checked_at DESC LIMIT 1) as last_health
       FROM databases d ORDER BY d.name`
    );
    return rows;
  });

  // Аудит лог
  app.get('/audit-log', { preHandler: adminMiddleware }, async (req) => {
    const limit = Number(req.query.limit) || 100;
    const { rows } = await app.db.query(
      `SELECT a.*, t.email as tenant_email FROM audit_log a
       LEFT JOIN tenants t ON t.id=a.tenant_id
       ORDER BY a.created_at DESC LIMIT $1`,
      [limit]
    );
    return rows;
  });
};
