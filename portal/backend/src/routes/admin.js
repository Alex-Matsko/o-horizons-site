const db = require('../db');
const mailer = require('../services/mailer');
const { Queue } = require('bullmq');

const provisionQueue = new Queue('provision', {
  connection: { host: process.env.REDIS_HOST || 'redis', port: 6379 },
});

module.exports = async (app) => {
  // GET /api/admin/requests
  app.get('/requests', { preHandler: [app.adminOnly] }, async (req) => {
    const { status = 'pending' } = req.query;
    const { rows } = await db.query(
      `SELECT r.*, t.email, t.company_name, tr.name AS tariff_name
       FROM db_requests r
       JOIN tenants t ON t.id=r.tenant_id
       JOIN tariffs tr ON tr.id=t.tariff_id
       WHERE ($1='all' OR r.status=$1)
       ORDER BY r.created_at DESC`,
      [status]
    );
    return rows;
  });

  // POST /api/admin/requests/:id/approve
  app.post('/requests/:id/approve', { preHandler: [app.adminOnly] }, async (req, reply) => {
    const { id } = req.params;
    const { rows } = await db.query(
      'SELECT * FROM db_requests WHERE id=$1 AND status=$2', [id, 'pending']
    );
    if (!rows.length) return reply.code(404).send({ error: 'Заявка не найдена' });
    const reqRow = rows[0];

    // Generate safe db_name (slug)
    const slug = reqRow.db_name_requested
      .toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 48) + '_' + Date.now().toString(36);

    // Create DB record with status 'provisioning'
    const { rows: dbRows } = await db.query(
      `INSERT INTO databases_1c(tenant_id,name,db_name,configuration,platform_version,status,url_path)
       VALUES($1,$2,$3,$4,$5,'provisioning',$6) RETURNING *`,
      [reqRow.tenant_id, reqRow.db_name_requested, slug,
       reqRow.configuration, reqRow.platform_version, slug]
    );
    const dbRow = dbRows[0];

    // Update request
    await db.query(
      `UPDATE db_requests SET status='approved', database_id=$1, updated_at=NOW() WHERE id=$2`,
      [dbRow.id, id]
    );

    // Enqueue provisioning job
    await provisionQueue.add('provision', { dbId: dbRow.id, reqId: id, dbRow, reqRow }, {
      attempts: 3, backoff: { type: 'fixed', delay: 15000 },
    });

    return { ok: true, database_id: dbRow.id };
  });

  // POST /api/admin/requests/:id/reject
  app.post('/requests/:id/reject', { preHandler: [app.adminOnly] }, async (req, reply) => {
    const { admin_note } = req.body || {};
    const { rows } = await db.query(
      `UPDATE db_requests SET status='rejected', admin_note=$1, updated_at=NOW()
       WHERE id=$2 AND status='pending' RETURNING *`,
      [admin_note || null, req.params.id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Заявка не найдена' });
    return { ok: true };
  });

  // GET /api/admin/tenants
  app.get('/tenants', { preHandler: [app.adminOnly] }, async (req) => {
    const { rows } = await db.query(
      `SELECT t.id,t.email,t.company_name,t.role,t.is_active,t.email_verified,t.created_at,
              tr.name AS tariff_name,
              (SELECT COUNT(*) FROM databases_1c d WHERE d.tenant_id=t.id) AS db_count
       FROM tenants t LEFT JOIN tariffs tr ON tr.id=t.tariff_id
       ORDER BY t.created_at DESC`
    );
    return rows;
  });

  // PATCH /api/admin/tenants/:id/tariff
  app.patch('/tenants/:id/tariff', { preHandler: [app.adminOnly] }, async (req, reply) => {
    const { tariff_id } = req.body;
    const { rows } = await db.query(
      'UPDATE tenants SET tariff_id=$1, updated_at=NOW() WHERE id=$2 RETURNING id',
      [tariff_id, req.params.id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Клиент не найден' });
    return { ok: true };
  });

  // PATCH /api/admin/tenants/:id/toggle
  app.patch('/tenants/:id/toggle', { preHandler: [app.adminOnly] }, async (req, reply) => {
    const { rows } = await db.query(
      'UPDATE tenants SET is_active=NOT is_active, updated_at=NOW() WHERE id=$1 RETURNING id,is_active',
      [req.params.id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Клиент не найден' });
    return rows[0];
  });

  // GET /api/admin/databases
  app.get('/databases', { preHandler: [app.adminOnly] }, async () => {
    const { rows } = await db.query(
      `SELECT d.*, t.email, t.company_name FROM databases_1c d
       JOIN tenants t ON t.id=d.tenant_id ORDER BY d.created_at DESC`
    );
    return rows;
  });

  // PATCH /api/admin/databases/:id/status
  app.patch('/databases/:id/status', { preHandler: [app.adminOnly] }, async (req, reply) => {
    const { status } = req.body;
    const allowed = ['active','suspended','deleted','provisioning','error'];
    if (!allowed.includes(status)) return reply.code(400).send({ error: 'Неверный статус' });
    const { rows } = await db.query(
      'UPDATE databases_1c SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'База не найдена' });
    // Notify tenant if activated
    if (status === 'active') {
      const { rows: tRows } = await db.query('SELECT email FROM tenants WHERE id=$1', [rows[0].tenant_id]);
      const url = `${process.env.ONEC_PUBLIC_URL}/${rows[0].url_path}`;
      await mailer.sendDbReady(tRows[0].email, rows[0].name, url).catch(() => {});
      // Add notification
      await db.query(
        `INSERT INTO notifications(tenant_id,type,title,body) VALUES($1,$2,$3,$4)`,
        [rows[0].tenant_id, 'db_ready', `База «${rows[0].name}» готова`,
         `Ваша база 1С доступна по адресу: ${url}`]
      );
    }
    return rows[0];
  });

  // GET /api/admin/stats
  app.get('/stats', { preHandler: [app.adminOnly] }, async () => {
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM tenants WHERE role='client') AS total_clients,
        (SELECT COUNT(*) FROM tenants WHERE role='client' AND created_at > NOW()-INTERVAL '30 days') AS new_clients_30d,
        (SELECT COUNT(*) FROM databases_1c) AS total_databases,
        (SELECT COUNT(*) FROM databases_1c WHERE status='active') AS active_databases,
        (SELECT COUNT(*) FROM db_requests WHERE status='pending') AS pending_requests,
        (SELECT COUNT(*) FROM backups WHERE status='success' AND created_at > NOW()-INTERVAL '24h') AS backups_24h,
        (SELECT COALESCE(SUM(size_mb),0) FROM databases_1c) AS total_storage_mb
    `);
    return rows[0];
  });
};
