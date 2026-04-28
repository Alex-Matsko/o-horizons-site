const bcrypt = require('bcrypt');
const db = require('../db');

module.exports = async (app) => {
  // PATCH /api/profile
  app.patch('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { company_name, phone, telegram } = req.body;
    const { rows } = await db.query(
      `UPDATE tenants SET company_name=$1, phone=$2, telegram=$3, updated_at=NOW()
       WHERE id=$4 RETURNING id, email, company_name, phone, telegram`,
      [company_name || null, phone || null, telegram || null, req.user.sub]
    );
    return rows[0];
  });

  // PATCH /api/profile/password
  app.patch('/password', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password || new_password.length < 8)
      return reply.code(400).send({ error: 'Неверные данные' });
    const { rows } = await db.query('SELECT password_hash FROM tenants WHERE id=$1', [req.user.sub]);
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return reply.code(401).send({ error: 'Неверный текущий пароль' });
    const hash = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE tenants SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.sub]);
    return { ok: true };
  });

  // GET /api/profile/notifications
  app.get('/notifications', { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await db.query(
      'SELECT * FROM notifications WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.sub]
    );
    return rows;
  });

  // PATCH /api/profile/notifications/read-all
  app.patch('/notifications/read-all', { preHandler: [app.authenticate] }, async (req) => {
    await db.query('UPDATE notifications SET is_read=TRUE WHERE tenant_id=$1', [req.user.sub]);
    return { ok: true };
  });
};
