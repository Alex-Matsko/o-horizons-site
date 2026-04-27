import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/db.js';
import { sendEmail } from '../../services/email.service.js';
import { logger } from '../../utils/logger.js';

export async function registerUser({ email, password, org_name, phone, inn }) {
  // Check duplicate
  const existing = await query('SELECT id FROM portal_users WHERE email=$1', [email]);
  if (existing.rows.length) throw { statusCode: 409, message: 'Email already registered' };

  const hash = await bcrypt.hash(password, 12);

  // Get default Starter tariff
  const tariff = await query(`SELECT id FROM tariffs WHERE name='Starter' LIMIT 1`);
  const tariffId = tariff.rows[0]?.id || null;

  // Create tenant
  const tenant = await query(
    `INSERT INTO tenants (name, inn, email, phone, tariff_id) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [org_name, inn || null, email, phone || null, tariffId]
  );
  const tenantId = tenant.rows[0].id;

  // Create user
  const user = await query(
    `INSERT INTO portal_users (tenant_id, email, password_hash, role, status)
     VALUES ($1,$2,$3,'CLIENT','PENDING_EMAIL') RETURNING id, email`,
    [tenantId, email, hash]
  );
  const userId = user.rows[0].id;

  // Create verify token
  const token = uuidv4();
  await query(
    `INSERT INTO email_tokens (user_id, token, type, expires_at)
     VALUES ($1,$2,'EMAIL_VERIFY', NOW() + INTERVAL '24 hours')`,
    [userId, token]
  );

  // Send email
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Подтвердите email — O-Horizons 1C Portal',
    html: `<p>Добро пожаловать в 1C Portal O-Horizons!</p>
           <p>Подтвердите ваш email:</p>
           <a href="${verifyUrl}" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Подтвердить email</a>
           <p style="color:#64748b;font-size:12px">Ссылка действительна 24 часа</p>`,
  });

  return { message: 'Registration successful. Check your email.' };
}

export async function verifyEmail(token) {
  const res = await query(
    `SELECT et.id, et.user_id, et.expires_at, et.used_at
     FROM email_tokens et WHERE et.token=$1 AND et.type='EMAIL_VERIFY'`,
    [token]
  );
  if (!res.rows.length) throw { statusCode: 400, message: 'Invalid token' };
  const row = res.rows[0];
  if (row.used_at) throw { statusCode: 400, message: 'Token already used' };
  if (new Date(row.expires_at) < new Date()) throw { statusCode: 400, message: 'Token expired' };

  await query(`UPDATE portal_users SET status='ACTIVE', email_verified=true, email_verified_at=NOW() WHERE id=$1`, [row.user_id]);
  await query(`UPDATE email_tokens SET used_at=NOW() WHERE id=$1`, [row.id]);
  return { message: 'Email verified' };
}

export async function loginUser({ email, password }, reply, app) {
  const res = await query(`SELECT * FROM portal_users WHERE email=$1`, [email]);
  if (!res.rows.length) throw { statusCode: 401, message: 'Invalid credentials' };
  const user = res.rows[0];

  if (user.status === 'PENDING_EMAIL') throw { statusCode: 403, message: 'Please verify your email first' };
  if (user.status === 'BLOCKED') throw { statusCode: 403, message: 'Account blocked' };

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw { statusCode: 401, message: 'Invalid credentials' };

  // Access token (15 min)
  const accessToken = app.jwt.sign(
    { sub: user.id, role: user.role, tenant_id: user.tenant_id },
    { expiresIn: '15m' }
  );

  // Refresh token (30 days)
  const refreshToken = uuidv4();
  const refreshHash = await bcrypt.hash(refreshToken, 8);
  await query(
    `INSERT INTO sessions (user_id, refresh_token_hash, expires_at)
     VALUES ($1,$2, NOW() + INTERVAL '30 days')`,
    [user.id, refreshHash]
  );

  await query(`UPDATE portal_users SET last_login_at=NOW() WHERE id=$1`, [user.id]);

  reply.setCookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 30 * 24 * 60 * 60,
  });

  return {
    access_token: accessToken,
    user: { id: user.id, email: user.email, role: user.role, org_name: null },
  };
}

export async function refreshTokens(refreshToken, app) {
  if (!refreshToken) throw { statusCode: 401, message: 'No refresh token' };

  const sessions = await query(
    `SELECT s.*, u.id as uid, u.role, u.tenant_id, u.status
     FROM sessions s JOIN portal_users u ON u.id = s.user_id
     WHERE s.revoked_at IS NULL AND s.expires_at > NOW()`,
    []
  );

  let session = null;
  for (const s of sessions.rows) {
    if (await bcrypt.compare(refreshToken, s.refresh_token_hash)) {
      session = s;
      break;
    }
  }
  if (!session) throw { statusCode: 401, message: 'Invalid refresh token' };
  if (session.status === 'BLOCKED') throw { statusCode: 403, message: 'Account blocked' };

  const accessToken = app.jwt.sign(
    { sub: session.uid, role: session.role, tenant_id: session.tenant_id },
    { expiresIn: '15m' }
  );
  return { access_token: accessToken };
}

export async function logoutUser(refreshToken) {
  if (!refreshToken) return;
  const sessions = await query(`SELECT * FROM sessions WHERE revoked_at IS NULL`, []);
  for (const s of sessions.rows) {
    if (await bcrypt.compare(refreshToken, s.refresh_token_hash)) {
      await query(`UPDATE sessions SET revoked_at=NOW() WHERE id=$1`, [s.id]);
      break;
    }
  }
}

export async function forgotPassword(email) {
  const res = await query(`SELECT id FROM portal_users WHERE email=$1 AND status='ACTIVE'`, [email]);
  if (!res.rows.length) return; // silent — don't reveal user existence
  const userId = res.rows[0].id;

  const token = uuidv4();
  await query(
    `INSERT INTO email_tokens (user_id, token, type, expires_at)
     VALUES ($1,$2,'PASSWORD_RESET', NOW() + INTERVAL '1 hour')`,
    [userId, token]
  );

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Сброс пароля — O-Horizons 1C Portal',
    html: `<p>Для сброса пароля перейдите по ссылке:</p>
           <a href="${resetUrl}" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Сбросить пароль</a>
           <p style="color:#64748b;font-size:12px">Ссылка действительна 1 час. Если вы не запрашивали сброс — проигнорируйте письмо.</p>`,
  });
}

export async function resetPassword(token, newPassword) {
  const res = await query(
    `SELECT * FROM email_tokens WHERE token=$1 AND type='PASSWORD_RESET' AND used_at IS NULL`,
    [token]
  );
  if (!res.rows.length) throw { statusCode: 400, message: 'Invalid or expired token' };
  const row = res.rows[0];
  if (new Date(row.expires_at) < new Date()) throw { statusCode: 400, message: 'Token expired' };

  const hash = await bcrypt.hash(newPassword, 12);
  await query(`UPDATE portal_users SET password_hash=$1 WHERE id=$2`, [hash, row.user_id]);
  await query(`UPDATE email_tokens SET used_at=NOW() WHERE id=$1`, [row.id]);
  await query(`UPDATE sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL`, [row.user_id]);
}
