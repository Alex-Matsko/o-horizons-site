'use strict';

module.exports = async function tariffsRoutes(app) {
  // GET /api/tariffs — список активных тарифов
  app.get('/', async (req, reply) => {
    const { rows } = await app.db.query(
      'SELECT id, name, display_name, price_rub, max_databases, max_users_per_db, max_storage_gb, features FROM plans WHERE is_active = true ORDER BY price_rub'
    );
    return rows;
  });
};
