'use strict';

/**
 * authMiddleware — проверяет JWT-токен и загружает пользователя + тенанта в request
 *
 * JWT payload: { id: <user.id>, tenantId: <tenant.id>, role: 'admin'|'client' }
 * После выполнения:
 *   request.user   = { id, tenantId, role, email }
 *   request.tenant = { id, company_name, plan, max_databases, max_users_per_db, max_storage_gb, status }
 */
async function authMiddleware(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Unauthorized: invalid or expired token' });
  }

  const userId = request.user?.id;
  if (!userId) return reply.code(401).send({ error: 'Unauthorized: missing user id in token' });

  try {
    // Загружаем пользователя и его тенанта за один запрос
    const { rows } = await request.server.db.query(
      `SELECT u.id, u.email, u.role, u.status, u.tenant_id,
              t.id AS t_id, t.company_name, t.plan, t.status AS t_status,
              t.max_databases, t.max_users_per_db, t.max_storage_gb
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1`,
      [userId]
    );

    const row = rows[0];
    if (!row) return reply.code(401).send({ error: 'Unauthorized: user not found' });
    if (row.status !== 'active') return reply.code(403).send({ error: 'Account is suspended. Contact support.' });
    if (row.t_status !== 'active') return reply.code(403).send({ error: 'Tenant account is suspended. Contact support.' });

    // Проверяем email_verified (только для защищённых маршрутов, не для /auth/)
    // (проверка email_verified вынесена в роуты по необходимости)

    request.user = {
      id: row.id,
      email: row.email,
      role: row.role,
      tenantId: row.tenant_id,
    };

    request.tenant = {
      id: row.t_id,
      company_name: row.company_name,
      plan: row.plan,
      status: row.t_status,
      max_databases: row.max_databases,
      max_users_per_db: row.max_users_per_db,
      max_storage_gb: row.max_storage_gb,
    };
  } catch (err) {
    request.server.log.error(err, 'authMiddleware DB error');
    return reply.code(500).send({ error: 'Internal server error during authentication' });
  }
}

/**
 * adminMiddleware — требует role = 'admin'
 * Должен стоять в preHandler ПОСЛЕ authMiddleware
 */
async function adminMiddleware(request, reply) {
  if (request.user?.role !== 'admin') {
    return reply.code(403).send({ error: 'Forbidden: admin access required' });
  }
}

/**
 * requireEmailVerified — доп. гвард для маршрутов с обязательной проверкой email
 */
async function requireEmailVerified(request, reply) {
  const { rows } = await request.server.db.query(
    'SELECT email_verified FROM users WHERE id = $1', [request.user.id]
  );
  if (!rows[0]?.email_verified) {
    return reply.code(403).send({ error: 'Email not verified. Please check your inbox.' });
  }
}

module.exports = { authMiddleware, adminMiddleware, requireEmailVerified };
