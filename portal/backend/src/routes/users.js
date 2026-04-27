import { requireAuth, requireActiveAccount } from '../middleware/auth.js';
import { onecSyncUsers } from '../services/onec.js';
import { query } from '../config/db.js';

export async function usersRoutes(app) {
  const preHandler = [requireAuth, requireActiveAccount];

  // POST /api/users/sync/:dbId - sync 1C users from REST API
  app.post('/sync/:dbId', { preHandler }, async (req, reply) => {
    const { rows: db } = await query(
      'SELECT * FROM databases WHERE id = $1 AND tenant_id = $2 AND status = \'running\'',
      [req.params.dbId, req.user.sub]
    );
    if (!db.length) return reply.code(404).send({ error: 'Database not found or not running' });
    const users = await onecSyncUsers(db[0]);
    return { synced: users.length, users };
  });
}
