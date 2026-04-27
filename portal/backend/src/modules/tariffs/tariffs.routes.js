import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { query } from '../../config/db.js';

export async function tariffsRoutes(app) {
  // Public — list tariffs
  app.get('/', async (req, reply) => {
    const { rows } = await query(`SELECT * FROM tariffs WHERE is_active=true ORDER BY max_databases`);
    reply.send(rows);
  });

  // Protected
  app.get('/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const { rows } = await query(`SELECT * FROM tariffs WHERE id=$1`, [req.params.id]);
    if (!rows.length) return reply.code(404).send({ error: 'Not found' });
    reply.send(rows[0]);
  });

  // Admin only
  app.post('/', { preHandler: [authenticate, requireRole('SUPER_ADMIN')] }, async (req, reply) => {
    const { name, max_databases, max_users_per_db, max_db_size_gb, backup_retention_days, backup_manual_count, price_monthly } = req.body;
    const { rows } = await query(
      `INSERT INTO tariffs (name,max_databases,max_users_per_db,max_db_size_gb,backup_retention_days,backup_manual_count,price_monthly)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, max_databases, max_users_per_db, max_db_size_gb, backup_retention_days, backup_manual_count, price_monthly]
    );
    reply.code(201).send(rows[0]);
  });
}
