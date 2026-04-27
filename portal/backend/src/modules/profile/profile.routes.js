import { authenticate } from '../../middleware/auth.middleware.js';
import { query } from '../../config/db.js';
import bcrypt from 'bcryptjs';

export async function profileRoutes(app) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (req, reply) => {
    const { rows } = await query(
      `SELECT u.id, u.email, u.role, u.last_login_at, u.created_at,
              t.id as tenant_id, t.name as org_name, t.inn, t.phone,
              tar.name as tariff_name, tar.max_databases, tar.max_users_per_db, tar.max_db_size_gb,
              tar.backup_retention_days
       FROM portal_users u
       JOIN tenants t ON t.id=u.tenant_id
       LEFT JOIN tariffs tar ON tar.id=t.tariff_id
       WHERE u.id=$1`,
      [req.user.id]
    );
    reply.send(rows[0]);
  });

  app.get('/usage', async (req, reply) => {
    const [dbs, users] = await Promise.all([
      query(`SELECT COUNT(*) FROM databases WHERE tenant_id=$1 AND deleted_at IS NULL`, [req.user.tenant_id]),
      query(
        `SELECT COALESCE(SUM(cnt),0) as total FROM (
           SELECT COUNT(*) as cnt FROM db_users_cache u
           JOIN databases d ON d.id=u.database_id
           WHERE d.tenant_id=$1 AND u.is_active=true
         ) sub`,
        [req.user.tenant_id]
      ),
    ]);
    reply.send({
      databases: parseInt(dbs.rows[0].count),
      users: parseInt(users.rows[0].total),
    });
  });

  app.patch('/password', async (req, reply) => {
    const { current_password, new_password } = req.body;
    const { rows } = await query(`SELECT password_hash FROM portal_users WHERE id=$1`, [req.user.id]);
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return reply.code(401).send({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await query(`UPDATE portal_users SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [hash, req.user.id]);
    reply.send({ message: 'Password changed' });
  });
}
