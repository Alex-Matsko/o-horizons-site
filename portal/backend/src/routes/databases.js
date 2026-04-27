'use strict';

const { authMiddleware } = require('../middleware/auth');
const { Queue } = require('bullmq');
const onecService = require('../services/onec.service');

const dbQueue = new Queue('create-db', {
  connection: { url: process.env.REDIS_URL },
});

const VALID_CONFIGS = ['BP', 'UT', 'Roznica', 'UNF', 'ERP', 'ZUP'];

module.exports = async function databaseRoutes(app) {
  // GET /api/databases — список баз клиента
  app.get('/', { preHandler: authMiddleware }, async (req) => {
    const { rows } = await app.db.query(
      `SELECT d.*,
        (SELECT COUNT(*) FROM db_users u WHERE u.database_id = d.id AND u.is_active = true) AS user_count
       FROM databases d
       WHERE d.tenant_id = $1
       ORDER BY d.created_at DESC`,
      [req.tenant.id]
    );
    return rows;
  });

  // GET /api/databases/:id — детали базы
  app.get('/:id', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows } = await app.db.query(
      'SELECT * FROM databases WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.tenant.id]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Not found' });
    return rows[0];
  });

  // POST /api/databases/request — заявка на новую базу (требует ручного подтверждения администратором)
  app.post('/request', { preHandler: authMiddleware }, async (req, reply) => {
    const { configuration, desired_name, version_1c, comment } = req.body;

    if (!configuration || !VALID_CONFIGS.includes(configuration)) {
      return reply.code(400).send({ error: `Invalid configuration. Allowed: ${VALID_CONFIGS.join(', ')}` });
    }
    if (!desired_name || !/^[a-zA-Z0-9_]{3,60}$/.test(desired_name)) {
      return reply.code(400).send({ error: 'desired_name must be 3-60 chars, alphanumeric and underscore only' });
    }

    // Проверяем лимит баз по тарифу
    const { rows: limitRows } = await app.db.query(
      `SELECT t.max_databases,
              COUNT(d.id) FILTER (WHERE d.status NOT IN ('deleting','deleted','error')) AS current_count
       FROM tenants t
       LEFT JOIN databases d ON d.tenant_id = t.id
       WHERE t.id = $1
       GROUP BY t.max_databases`,
      [req.tenant.id]
    );
    const limit = limitRows[0];
    if (limit && Number(limit.max_databases) !== -1 && Number(limit.current_count) >= Number(limit.max_databases)) {
      return reply.code(402).send({ error: 'Database limit reached for your plan. Upgrade to add more databases.' });
    }

    // Проверяем нет ли уже pending-заявки
    const { rows: pendingRows } = await app.db.query(
      `SELECT id FROM db_requests WHERE tenant_id = $1 AND status = 'pending'`,
      [req.tenant.id]
    );
    if (pendingRows.length > 0) {
      return reply.code(409).send({ error: 'You already have a pending database request. Please wait for admin approval.' });
    }

    const { rows } = await app.db.query(
      `INSERT INTO db_requests (tenant_id, requested_by, configuration, desired_name, version_1c, comment, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [req.tenant.id, req.user.id, configuration, desired_name, version_1c || null, comment || null]
    );
    return reply.code(201).send(rows[0]);
  });

  // GET /api/databases/requests — мои заявки
  app.get('/requests', { preHandler: authMiddleware }, async (req) => {
    const { rows } = await app.db.query(
      `SELECT r.*, d.apache_url, d.status AS db_status
       FROM db_requests r
       LEFT JOIN databases d ON d.id = r.database_id
       WHERE r.tenant_id = $1
       ORDER BY r.created_at DESC`,
      [req.tenant.id]
    );
    return rows;
  });

  // GET /api/databases/:id/users — пользователи 1С базы
  app.get('/:id/users', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      'SELECT id FROM databases WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.tenant.id]
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Database not found' });

    const { rows } = await app.db.query(
      'SELECT * FROM db_users WHERE database_id = $1 ORDER BY full_name',
      [req.params.id]
    );
    return rows;
  });

  // POST /api/databases/:id/users — создать пользователя 1С (через REST API 1С + запись в db_users)
  app.post('/:id/users', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      `SELECT * FROM databases WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [req.params.id, req.tenant.id]
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Database not found or not active' });
    const db = dbRows[0];

    // Проверка лимита пользователей
    const { rows: limitRows } = await app.db.query(
      `SELECT t.max_users_per_db,
              COUNT(u.id) AS current_count
       FROM tenants t
       LEFT JOIN db_users u ON u.database_id = $1 AND u.is_active = true
       WHERE t.id = $2
       GROUP BY t.max_users_per_db`,
      [req.params.id, req.tenant.id]
    );
    const limit = limitRows[0];
    if (limit && Number(limit.max_users_per_db) !== -1 && Number(limit.current_count) >= Number(limit.max_users_per_db)) {
      return reply.code(402).send({ error: 'User limit reached for your plan.' });
    }

    const { onec_user_name, full_name, password, roles } = req.body;
    if (!onec_user_name || !/^[a-zA-Z0-9_а-яА-Я]{1,100}$/u.test(onec_user_name)) {
      return reply.code(400).send({ error: 'Invalid user name' });
    }
    if (!password || password.length < 6) {
      return reply.code(400).send({ error: 'Password must be at least 6 characters' });
    }

    // Создаём в 1С через REST API
    await onecService.createUser(db, { onec_user_name, full_name, password, roles: roles || [] });

    // Сохраняем в нашей БД
    const { rows } = await app.db.query(
      `INSERT INTO db_users (database_id, onec_user_name, full_name, roles, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (database_id, onec_user_name) DO UPDATE
         SET full_name = EXCLUDED.full_name, roles = EXCLUDED.roles, is_active = true, updated_at = now()
       RETURNING *`,
      [req.params.id, onec_user_name, full_name || onec_user_name, JSON.stringify(roles || [])]
    );
    return reply.code(201).send(rows[0]);
  });

  // PATCH /api/databases/:id/users/:username — обновить пользователя 1С
  app.patch('/:id/users/:username', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      `SELECT * FROM databases WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [req.params.id, req.tenant.id]
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Not found or not active' });

    const { full_name, roles, is_active } = req.body;
    await onecService.updateUser(dbRows[0], req.params.username, { full_name, roles, is_active });

    const { rows } = await app.db.query(
      `UPDATE db_users SET full_name = COALESCE($1, full_name),
                           roles = COALESCE($2, roles),
                           is_active = COALESCE($3, is_active),
                           updated_at = now()
       WHERE database_id = $4 AND onec_user_name = $5
       RETURNING *`,
      [full_name, roles ? JSON.stringify(roles) : null, is_active, req.params.id, req.params.username]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'User not found in local registry' });
    return rows[0];
  });

  // POST /api/databases/:id/users/:username/reset-password — сброс пароля
  app.post('/:id/users/:username/reset-password', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      `SELECT * FROM databases WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [req.params.id, req.tenant.id]
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Not found or not active' });

    const { password } = req.body;
    if (!password || password.length < 6) {
      return reply.code(400).send({ error: 'Password must be at least 6 characters' });
    }
    await onecService.resetPassword(dbRows[0], req.params.username, password);
    return { message: 'Password updated successfully' };
  });

  // DELETE /api/databases/:id/users/:username — удалить пользователя 1С
  app.delete('/:id/users/:username', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      'SELECT * FROM databases WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.tenant.id]
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Not found' });

    await onecService.deleteUser(dbRows[0], req.params.username);

    await app.db.query(
      `UPDATE db_users SET is_active = false, updated_at = now()
       WHERE database_id = $1 AND onec_user_name = $2`,
      [req.params.id, req.params.username]
    );
    return { message: 'User deleted' };
  });

  // POST /api/databases/:id/users/sync — синхронизировать пользователей из 1С
  app.post('/:id/users/sync', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      `SELECT * FROM databases WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [req.params.id, req.tenant.id]
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Not found or not active' });

    const users = await onecService.syncUsers(dbRows[0], app.db);
    return { synced: users.length, users };
  });
};
