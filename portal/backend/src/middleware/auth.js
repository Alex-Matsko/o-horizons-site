import { query } from '../config/db.js';

export async function requireAuth(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}

export async function requireAdmin(request, reply) {
  try {
    await request.jwtVerify();
    if (request.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}

export async function requireActiveAccount(request, reply) {
  const { rows } = await query(
    'SELECT is_active FROM tenants WHERE id = $1',
    [request.user.sub]
  );
  if (!rows[0]?.is_active) {
    return reply.code(403).send({ error: 'Account is not active' });
  }
}
