import { getDb } from '../../config/db.js';
import bcrypt from 'bcrypt';

export async function getProfile(userId) {
  const db = getDb();
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.full_name, u.role, u.email_verified, u.created_at,
            t.id as tenant_id, t.company_name, t.tariff_id,
            tr.name as tariff_name, tr.max_databases, tr.max_users
     FROM users u
     LEFT JOIN tenants t ON t.id = u.tenant_id
     LEFT JOIN tariffs tr ON tr.id = t.tariff_id
     WHERE u.id = $1`,
    [userId]
  );
  return rows[0] || null;
}

export async function updateProfile(userId, { full_name, company_name }) {
  const db = getDb();
  if (full_name) {
    await db.query('UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2', [full_name, userId]);
  }
  if (company_name) {
    const { rows: [user] } = await db.query('SELECT tenant_id FROM users WHERE id = $1', [userId]);
    if (user?.tenant_id) {
      await db.query('UPDATE tenants SET company_name = $1, updated_at = NOW() WHERE id = $2', [company_name, user.tenant_id]);
    }
  }
  return getProfile(userId);
}

export async function changePassword(userId, { current_password, new_password }) {
  const db = getDb();
  const { rows: [user] } = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!user) throw new Error('User not found');

  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) throw new Error('Current password is incorrect');

  const hash = await bcrypt.hash(new_password, 12);
  await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);
  return { ok: true };
}
