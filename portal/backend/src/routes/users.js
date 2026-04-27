import bcrypt from 'bcrypt';
import { query } from '../config/db.js';
import { requireVerified } from '../middleware/auth.js';
import { getInfobaseUsers, createInfobaseUser, deleteInfobaseUser } from '../services/onec.js';

export async function userRoutes(fastify) {
  // GET /api/users/me — current user profile
  fastify.get('/me', { preHandler: [requireVerified] }, async (req) => {
    const res = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.last_login_at, u.created_at,
              t.company_name, t.slug, t.plan, t.status as tenant_status,
              t.max_databases, t.max_users_per_db, t.max_storage_gb,
              (SELECT COUNT(*) FROM databases WHERE tenant_id = t.id AND status = 'active') as active_dbs
       FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1`,
      [req.user.sub]
    );
    return res.rows[0];
  });

  // PATCH /api/users/me — update profile
  fastify.patch('/me', { preHandler: [requireVerified] }, async (req) => {
    const { fullName, currentPassword, newPassword } = req.body || {};
    const userId = req.user.sub;

    if (newPassword) {
      if (!currentPassword) throw fastify.httpErrors.badRequest('Current password required');
      const res = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      const valid = await bcrypt.compare(currentPassword, res.rows[0].password_hash);
      if (!valid) throw fastify.httpErrors.unauthorized('Wrong current password');
      const hash = await bcrypt.hash(newPassword, 12);
      await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [hash, userId]);
    }

    if (fullName) {
      await query('UPDATE users SET full_name = $1, updated_at = now() WHERE id = $2', [fullName, userId]);
    }

    return { message: 'Updated' };
  });

  // ─── 1C DB Users management ──────────────────────────────

  // GET /api/users/db/:databaseId — list 1C users
  fastify.get('/db/:databaseId', { preHandler: [requireVerified] }, async (req, reply) => {
    const { tenantId } = req.user;
    const { databaseId } = req.params;

    const dbRes = await query(
      `SELECT infobase_name FROM databases WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [databaseId, tenantId]
    );
    if (!dbRes.rows.length) return reply.code(404).send({ error: 'Database not found' });

    const users = await getInfobaseUsers(dbRes.rows[0].infobase_name);
    return users;
  });

  // POST /api/users/db/:databaseId — add 1C user
  fastify.post('/db/:databaseId', { preHandler: [requireVerified] }, async (req, reply) => {
    const { tenantId } = req.user;
    const { databaseId } = req.params;
    const { name, password, roles } = req.body || {};

    if (!name || !password) return reply.code(400).send({ error: 'name and password required' });

    // Check tenant user limit
    const dbRes = await query(
      `SELECT d.infobase_name, t.max_users_per_db
       FROM databases d JOIN tenants t ON t.id = d.tenant_id
       WHERE d.id = $1 AND d.tenant_id = $2 AND d.status = 'active'`,
      [databaseId, tenantId]
    );
    if (!dbRes.rows.length) return reply.code(404).send({ error: 'Database not found' });

    const { infobase_name, max_users_per_db } = dbRes.rows[0];

    const currentUsers = await getInfobaseUsers(infobase_name);
    if (max_users_per_db !== -1 && currentUsers.length >= max_users_per_db) {
      return reply.code(403).send({ error: 'User limit reached for your plan' });
    }

    await createInfobaseUser(infobase_name, { name, password, roles: roles || [] });

    // Sync to local db_users table
    await query(
      `INSERT INTO db_users (database_id, onec_user_name, full_name, roles)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (database_id, onec_user_name) DO UPDATE
         SET full_name = $3, roles = $4, updated_at = now()`,
      [databaseId, name, name, JSON.stringify(roles || [])]
    );

    return reply.code(201).send({ message: 'User created' });
  });

  // DELETE /api/users/db/:databaseId/:userId
  fastify.delete('/db/:databaseId/:userId', { preHandler: [requireVerified] }, async (req, reply) => {
    const { tenantId } = req.user;
    const { databaseId, userId } = req.params;

    const dbRes = await query(
      `SELECT infobase_name FROM databases WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [databaseId, tenantId]
    );
    if (!dbRes.rows.length) return reply.code(404).send({ error: 'Database not found' });

    await deleteInfobaseUser(dbRes.rows[0].infobase_name, userId);
    await query(`DELETE FROM db_users WHERE database_id = $1 AND onec_user_name = $2`, [databaseId, userId]);

    return { message: 'User deleted' };
  });
}
