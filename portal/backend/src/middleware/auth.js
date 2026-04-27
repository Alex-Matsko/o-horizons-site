'use strict';

async function authMiddleware(request, reply) {
  try {
    await request.jwtVerify();
    // Проверяем что пользователь активен
    const { rows } = await request.server.db.query(
      'SELECT id, is_active, is_admin FROM tenants WHERE id = $1',
      [request.user.sub]
    );
    if (!rows[0] || !rows[0].is_active) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    request.tenant = rows[0];
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}

async function adminMiddleware(request, reply) {
  await authMiddleware(request, reply);
  if (!request.tenant?.is_admin) {
    return reply.code(403).send({ error: 'Forbidden' });
  }
}

module.exports = { authMiddleware, adminMiddleware };
