import { query } from '../config/db.js';

export async function authenticate(request, reply) {
  try {
    await request.jwtVerify();
    // Attach full user to request
    const { rows } = await query(
      `SELECT u.id, u.email, u.role, u.status, u.tenant_id, t.tariff_id
       FROM portal_users u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1`,
      [request.user.sub]
    );
    if (!rows.length || rows[0].status === 'BLOCKED') {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    request.user = rows[0];
  } catch {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

export function requireRole(...roles) {
  return async (request, reply) => {
    if (!roles.includes(request.user?.role)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };
}

export function requireTenant(request, reply, done) {
  // Ensures resource belongs to user's tenant
  request.tenantId = request.user.tenant_id;
  done();
}
