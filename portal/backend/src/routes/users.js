'use strict';
// users.js — profile management for the current tenant (portal user)
// NOTE: There is no separate 'users' table — portal users ARE tenants.
// Admin user-management lives in routes/admin.js.
const bcrypt = require('bcrypt');
const db     = require('../db');

module.exports = async (app) => {

  // GET /api/users/me — профиль текущего пользователя
  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await db.query(
      `SELECT
         t.id, t.email, t.org_name, t.phone, t.role,
         t.is_active, t.email_verified, t.created_at, t.updated_at,
         tr.code AS tariff_code, tr.name AS tariff_name,
         tr.max_bases, tr.max_users, tr.max_disk_gb,
         (SELECT COUNT(*) FROM databases d
          WHERE d.tenant_id = t.id AND d.status NOT IN ('error','deleted')) AS used_bases,
         (SELECT COUNT(*) FROM db_users_cache u
          JOIN databases d ON d.id = u.database_id
          WHERE d.tenant_id = t.id AND u.is_active) AS used_users
       FROM tenants t
       LEFT JOIN tariffs tr ON tr.id = t.tariff_id
       WHERE t.id = $1`,
      [req.user.id]
    );
    return rows[0] || {};
  });

  // PATCH /api/users/me — обновить профиль
  app.patch('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { org_name, phone } = req.body || {};
    const { rows } = await db.query(
      `UPDATE tenants
       SET org_name = COALESCE($1, org_name),
           phone    = COALESCE($2, phone),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, org_name, phone, updated_at`,
      [org_name || null, phone || null, req.user.id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Пользователь не найден' });
    return rows[0];
  });

  // PATCH /api/users/me/password — сменить пароль
  app.patch('/me/password', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password || new_password.length < 8)
      return reply.code(400).send({ error: 'Неверные данные' });

    const { rows } = await db.query(
      'SELECT password_hash FROM tenants WHERE id = $1', [req.user.id]
    );
    const valid = await bcrypt.compare(current_password, rows[0]?.password_hash || '');
    if (!valid) return reply.code(401).send({ error: 'Неверный текущий пароль' });

    const hash = await bcrypt.hash(new_password, 12);
    await db.query(
      'UPDATE tenants SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hash, req.user.id]
    );
    return { ok: true };
  });
};
