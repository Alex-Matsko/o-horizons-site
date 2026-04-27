import { query } from '../config/db.js';

export async function tariffRoutes(app) {
  // GET /api/tariffs
  app.get('/', async () => {
    const { rows } = await query('SELECT * FROM tariffs WHERE is_active = true ORDER BY price_rub');
    return rows;
  });
}
