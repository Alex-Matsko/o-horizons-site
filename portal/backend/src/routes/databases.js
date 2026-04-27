'use strict';

const { authMiddleware } = require('../middleware/auth');
const { Queue } = require('bullmq');
const { nanoid } = require('nanoid');
const onecService = require('../services/onec.service');

const dbQueue = new Queue('create-db', {
  connection: { url: process.env.REDIS_URL },
});

module.exports = async function databaseRoutes(app) {
  // Список баз клиента
  app.get('/', { preHandler: authMiddleware }, async (req) => {
    const { rows } = await app.db.query(
      `SELECT d.*, 
        (SELECT COUNT(*) FROM db_users u WHERE u.database_id = d.id) as user_count
       FROM databases d WHERE d.tenant_id=$1 ORDER BY d.created_at DESC`,
      [req.tenant.id]
    );
    return rows;
  });

  // Детали базы
  app.get('/:id', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows } = await app.db.query(
      'SELECT * FROM databases WHERE id=$1 AND tenant_id=$2',
      [req.params.id, req.tenant.id]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Not found' });
    return rows[0];
  });

  // Заявка на новую базу
  app.post('/request', { preHandler: authMiddleware }, async (req, reply) => {
    const { configuration, desired_name } = req.body;
    const CONFIGS = ['BP', 'UT', 'Roznica', 'UNF'];
    if (!CONFIGS.includes(configuration)) {
      return reply.code(400).send({ error: 'Invalid configuration' });
    }

    // Проверка лимита по тарифу
    const { rows: planRows } = await app.db.query(
      `SELECT p.max_databases, COUNT(d.id) as current
       FROM plans p
       JOIN tenants t ON t.plan_id = p.id
       LEFT JOIN databases d ON d.tenant_id = t.id AND d.status != 'blocked'
       WHERE t.id = $1 GROUP BY p.max_databases`,
      [req.tenant.id]
    );
    const plan = planRows[0];
    if (plan && Number(plan.current) >= Number(plan.max_databases)) {
      return reply.code(402).send({ error: 'Database limit reached for your plan' });
    }

    const { rows } = await app.db.query(
      `INSERT INTO database_requests (tenant_id, configuration, desired_name)
       VALUES ($1,$2,$3) RETURNING *`,
      [req.tenant.id, configuration, desired_name]
    );
    return reply.code(201).send(rows[0]);
  });

  // Пользователи базы
  app.get('/:id/users', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      'SELECT id FROM databases WHERE id=$1 AND tenant_id=$2',
      [req.params.id, req.tenant.id]
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Not found' });

    const users = await onecService.getUsers(req.params.id, app.db);
    return users;
  });

  // Добавить пользователя
  app.post('/:id/users', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      'SELECT * FROM databases WHERE id=$1 AND tenant_id=$2 AND status=$3',
      [req.params.id, req.tenant.id, 'active']
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Not found or not active' });

    // Проверка лимита пользователей
    const { rows: planRows } = await app.db.query(
      `SELECT p.max_users_per_db FROM plans p JOIN tenants t ON t.plan_id=p.id WHERE t.id=$1`,
      [req.tenant.id]
    );
    const { rows: userRows } = await app.db.query(
      'SELECT COUNT(*) as cnt FROM db_users WHERE database_id=$1 AND is_active=TRUE',
      [req.params.id]
    );
    if (Number(userRows[0].cnt) >= Number(planRows[0]?.max_users_per_db)) {
      return reply.code(402).send({ error: 'User limit reached for your plan' });
    }

    await onecService.createUser(dbRows[0], req.body);
    return reply.code(201).send({ message: 'User created' });
  });

  // Удалить пользователя
  app.delete('/:id/users/:username', { preHandler: authMiddleware }, async (req, reply) => {
    const { rows: dbRows } = await app.db.query(
      'SELECT * FROM databases WHERE id=$1 AND tenant_id=$2',
      [req.params.id, req.tenant.id]
    );
    if (!dbRows[0]) return reply.code(404).send({ error: 'Not found' });
    await onecService.deleteUser(dbRows[0], req.params.username);
    return { message: 'User deleted' };
  });
};
