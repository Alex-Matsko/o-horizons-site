'use strict';
const db = require('../db');

module.exports = async (app) => {

  // GET /api/tariffs — публичный список тарифов
  app.get('/', async () => {
    const { rows } = await db.query(
      'SELECT id, code, name, max_bases, max_users, max_disk_gb, price_rub FROM tariffs WHERE is_active = true ORDER BY price_rub ASC'
    );
    return rows;
  });

  // GET /api/tariffs/my — мой тариф и использование
  app.get('/my', { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await db.query(
      `SELECT
         tr.id, tr.code, tr.name AS tariff_name,
         tr.max_bases, tr.max_users, tr.max_disk_gb, tr.price_rub,
         (SELECT COUNT(*) FROM databases d
          WHERE d.tenant_id = t.id
          AND d.status NOT IN ('error','deleted')) AS used_bases,
         (SELECT COUNT(*) FROM db_users_cache u
          JOIN databases d ON d.id = u.database_id
          WHERE d.tenant_id = t.id AND u.is_active)  AS used_users,
         (SELECT COALESCE(SUM(disk_used_mb), 0) FROM databases d
          WHERE d.tenant_id = t.id)                  AS used_disk_mb
       FROM tenants t
       JOIN tariffs tr ON tr.id = t.tariff_id
       WHERE t.id = $1`,
      [req.user.id]
    );
    return rows[0] || {};
  });
};
