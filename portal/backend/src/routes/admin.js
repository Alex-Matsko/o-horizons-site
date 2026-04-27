import { query } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { databaseQueue } from '../queues/index.js';
import { sendTelegramAlert } from '../services/telegram.js';
import { sendDatabaseReady } from '../services/mail.js';

export async function adminRoutes(fastify) {
  // All admin routes require admin role
  fastify.addHook('preHandler', requireAdmin);

  // GET /api/admin/requests — all pending DB requests
  fastify.get('/requests', async () => {
    const res = await query(
      `SELECT r.*, u.email, u.full_name, t.company_name, t.plan
       FROM db_requests r
       JOIN users u ON u.id = r.requested_by
       JOIN tenants t ON t.id = r.tenant_id
       WHERE r.status = 'pending'
       ORDER BY r.created_at ASC`
    );
    return res.rows;
  });

  // GET /api/admin/requests/all
  fastify.get('/requests/all', async (req) => {
    const { status, page = 1 } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;
    const conditions = status ? `WHERE r.status = '${status}'` : '';
    const res = await query(
      `SELECT r.*, u.email, u.full_name, t.company_name
       FROM db_requests r
       JOIN users u ON u.id = r.requested_by
       JOIN tenants t ON t.id = r.tenant_id
       ${conditions}
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.rows;
  });

  // POST /api/admin/requests/:id/approve
  fastify.post('/requests/:id/approve', async (req, reply) => {
    const { id } = req.params;
    const adminId = req.user.sub;

    const reqRes = await query(
      `SELECT r.*, t.slug, u.email
       FROM db_requests r
       JOIN tenants t ON t.id = r.tenant_id
       JOIN users u ON u.id = r.requested_by
       WHERE r.id = $1 AND r.status = 'pending'`,
      [id]
    );
    if (!reqRes.rows.length) return reply.code(404).send({ error: 'Request not found or not pending' });

    const reqRow = reqRes.rows[0];
    const infobaseName = `${reqRow.slug}_${reqRow.configuration}_${Date.now()}`.slice(0, 50);

    // Create database record
    const dbRes = await query(
      `INSERT INTO databases (tenant_id, name, infobase_name, configuration, version_1c, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6) RETURNING id`,
      [
        reqRow.tenant_id,
        reqRow.desired_name || `${reqRow.configuration.toUpperCase()} - ${new Date().toLocaleDateString('ru')}`,
        infobaseName,
        reqRow.configuration,
        reqRow.version_1c || '8.3.27',
        reqRow.requested_by,
      ]
    );
    const databaseId = dbRes.rows[0].id;

    // Update request
    await query(
      `UPDATE db_requests
       SET status = 'approved', reviewed_by = $1, reviewed_at = now(), database_id = $2
       WHERE id = $3`,
      [adminId, databaseId, id]
    );

    // Enqueue creation job
    await databaseQueue.add('create-database', {
      databaseId,
      infobaseName,
      configuration: reqRow.configuration,
      version1c: reqRow.version_1c || '8.3.27',
      tenantEmail: reqRow.email,
    });

    await sendTelegramAlert(
      `✅ <b>DB Request Approved</b>\nTenant: ${reqRow.company_name}\nConfig: ${reqRow.configuration}\nDB: ${infobaseName}`
    );

    return { message: 'Approved', databaseId };
  });

  // POST /api/admin/requests/:id/reject
  fastify.post('/requests/:id/reject', async (req, reply) => {
    const { id } = req.params;
    const adminId = req.user.sub;
    const { comment } = req.body || {};

    const res = await query(
      `UPDATE db_requests
       SET status = 'rejected', reviewed_by = $1, reviewed_at = now(), review_comment = $2
       WHERE id = $3 AND status = 'pending' RETURNING *`,
      [adminId, comment || null, id]
    );
    if (!res.rows.length) return reply.code(404).send({ error: 'Not found' });
    return { message: 'Rejected' };
  });

  // GET /api/admin/tenants
  fastify.get('/tenants', async (req) => {
    const { page = 1 } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;
    const res = await query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count,
              (SELECT COUNT(*) FROM databases WHERE tenant_id = t.id AND status = 'active') as db_count
       FROM tenants t
       ORDER BY t.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.rows;
  });

  // PATCH /api/admin/tenants/:id
  fastify.patch('/tenants/:id', async (req, reply) => {
    const { id } = req.params;
    const { plan, status, maxDatabases, maxUsersPerDb, maxStorageGb } = req.body || {};

    const fields = [];
    const values = [];
    let i = 1;
    if (plan) { fields.push(`plan = $${i++}`); values.push(plan); }
    if (status) { fields.push(`status = $${i++}`); values.push(status); }
    if (maxDatabases !== undefined) { fields.push(`max_databases = $${i++}`); values.push(maxDatabases); }
    if (maxUsersPerDb !== undefined) { fields.push(`max_users_per_db = $${i++}`); values.push(maxUsersPerDb); }
    if (maxStorageGb !== undefined) { fields.push(`max_storage_gb = $${i++}`); values.push(maxStorageGb); }
    if (!fields.length) return reply.code(400).send({ error: 'Nothing to update' });

    fields.push(`updated_at = now()`);
    values.push(id);
    const res = await query(
      `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!res.rows.length) return reply.code(404).send({ error: 'Not found' });
    return res.rows[0];
  });

  // GET /api/admin/stats
  fastify.get('/stats', async () => {
    const [tenants, dbs, users, pendingReqs, backups] = await Promise.all([
      query('SELECT COUNT(*) FROM tenants WHERE status = \'active\''),
      query('SELECT COUNT(*) FROM databases WHERE status = \'active\''),
      query('SELECT COUNT(*) FROM users WHERE status = \'active\''),
      query('SELECT COUNT(*) FROM db_requests WHERE status = \'pending\''),
      query('SELECT COUNT(*) FROM backups WHERE status = \'done\' AND created_at > now() - interval \'24h\''),
    ]);
    return {
      activeTenants: parseInt(tenants.rows[0].count),
      activeDatabases: parseInt(dbs.rows[0].count),
      activeUsers: parseInt(users.rows[0].count),
      pendingRequests: parseInt(pendingReqs.rows[0].count),
      backupsLast24h: parseInt(backups.rows[0].count),
    };
  });
}
