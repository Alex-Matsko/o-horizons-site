'use strict';

const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const bcrypt = require('bcrypt');

module.exports = async function usersRoutes(app) {
  // GET /api/users/me — профиль текущего пользователя
  app.get('/me', { preHandler: authMiddleware }, async (req) => {
    const { rows } = await app.db.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.email_verified, u.status, u.last_login_at, u.created_at,
              t.company_name, t.plan, t.slug AS tenant_slug,
              t.max_databases, t.max_users_per_db, t.max_storage_gb
       FROM users u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    return rows[0];
  });

  // PATCH /api/users/me — обновить профиль
  app.patch('/me', { preHandler: authMiddleware }, async (req, reply) => {
    const { full_name } = req.body;
    if (!full_name || full_name.trim().length < 2) {
      return reply.code(400).send({ error: 'full_name must be at least 2 characters' });
    }
    const { rows } = await app.db.query(
      `UPDATE users SET full_name = $1, updated_at = now() WHERE id = $2 RETURNING id, email, full_name, role, updated_at`,
      [full_name.trim(), req.user.id]
    );
    return rows[0];
  });

  // PATCH /api/users/me/password — сменить пароль
  app.patch('/me/password', { preHandler: authMiddleware }, async (req, reply) => {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return reply.code(400).send({ error: 'current_password and new_password are required' });
    }
    if (new_password.length < 8) {
      return reply.code(400).send({ error: 'new_password must be at least 8 characters' });
    }

    const { rows } = await app.db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return reply.code(401).send({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(new_password, 12);
    await app.db.query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
      [newHash, req.user.id]
    );
    return { message: 'Password changed successfully' };
  });

  // ── ADMIN: управление пользователями тенанта ──────────────────────────

  // GET /api/users — список всех пользователей (только admin портала)
  app.get('/', { preHandler: [authMiddleware, adminMiddleware] }, async (req) => {
    const { tenant_id, status } = req.query;
    let sql = `SELECT u.id, u.email, u.full_name, u.role, u.status, u.email_verified, u.last_login_at,
                      t.company_name, t.slug AS tenant_slug
               FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id WHERE 1=1`;
    const params = [];
    if (tenant_id) { params.push(tenant_id); sql += ` AND u.tenant_id = $${params.length}`; }
    if (status)    { params.push(status);    sql += ` AND u.status = $${params.length}`; }
    sql += ' ORDER BY u.created_at DESC LIMIT 200';
    const { rows } = await app.db.query(sql, params);
    return rows;
  });

  // PATCH /api/users/:id/status — заблокировать/активировать пользователя (admin)
  app.patch('/:id/status', { preHandler: [authMiddleware, adminMiddleware] }, async (req, reply) => {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return reply.code(400).send({ error: 'status must be active or suspended' });
    }
    const { rows } = await app.db.query(
      `UPDATE users SET status = $1, updated_at = now() WHERE id = $2
       RETURNING id, email, status`,
      [status, req.params.id]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'User not found' });
    return rows[0];
  });
};
