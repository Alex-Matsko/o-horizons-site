'use strict';
// profile.js — org profile + notifications
// Separate from users.js to keep route files focused.
const db = require('../db');

module.exports = async (app) => {

  // PATCH /api/profile — обновить организацию
  app.patch('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { org_name, phone } = req.body || {};
    const { rows } = await db.query(
      `UPDATE tenants
       SET org_name = COALESCE($1, org_name),
           phone    = COALESCE($2, phone),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, org_name, phone`,
      [org_name || null, phone || null, req.user.id]
    );
    return rows[0];
  });

  // GET /api/profile/notifications
  app.get('/notifications', { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await db.query(
      `SELECT * FROM notifications
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    return rows;
  });

  // PATCH /api/profile/notifications/read-all
  app.patch('/notifications/read-all', { preHandler: [app.authenticate] }, async (req) => {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE tenant_id = $1',
      [req.user.id]
    );
    return { ok: true };
  });

  // PATCH /api/profile/notifications/:id/read
  app.patch('/notifications/:id/read', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { rows } = await db.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 AND tenant_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Не найдено' });
    return { ok: true };
  });
};
