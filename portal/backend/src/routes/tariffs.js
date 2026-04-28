const db = require('../db');

module.exports = async (app) => {
  // GET /api/tariffs — все тарифы (публичный)
  app.get('/', async () => {
    const { rows } = await db.query('SELECT * FROM tariffs WHERE is_active ORDER BY price_month');
    return rows;
  });

  // GET /api/tariffs/my — мой тариф и использование
  app.get('/my', { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await db.query(
      `SELECT t.*, tr.slug, tr.name AS tariff_name, tr.price_month,
              tr.max_databases, tr.max_users, tr.max_storage_gb,
              tr.backup_retention_days, tr.monitoring, tr.sla,
              (SELECT COUNT(*) FROM databases_1c d WHERE d.tenant_id=t.id AND d.status='active') AS used_databases,
              (SELECT COUNT(*) FROM users_1c u WHERE u.tenant_id=t.id AND u.is_active) AS used_users,
              (SELECT COALESCE(SUM(size_mb),0) FROM databases_1c d WHERE d.tenant_id=t.id) AS used_mb
       FROM tenants t JOIN tariffs tr ON tr.id=t.tariff_id WHERE t.id=$1`,
      [req.user.sub]
    );
    return rows[0] || {};
  });
};
