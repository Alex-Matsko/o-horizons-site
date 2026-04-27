import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { query } from '../config/db.js';
import { sendEmailVerification, sendPasswordReset } from '../services/mail.js';

export async function authRoutes(fastify) {
  // POST /api/auth/register
  fastify.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'fullName', 'companyName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          fullName: { type: 'string', minLength: 2 },
          companyName: { type: 'string', minLength: 2 },
        },
      },
    },
  }, async (req, reply) => {
    const { email, password, fullName, companyName } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    const slug = nanoid(10).toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    const tenantRes = await query(
      `INSERT INTO tenants (company_name, slug, plan) VALUES ($1, $2, 'starter') RETURNING id`,
      [companyName, slug]
    );
    const tenantId = tenantRes.rows[0].id;

    const userRes = await query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, 'client') RETURNING id`,
      [tenantId, email.toLowerCase(), passwordHash, fullName]
    );
    const userId = userRes.rows[0].id;

    const token = nanoid(64);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await query(
      `INSERT INTO tokens (user_id, type, token_hash, expires_at)
       VALUES ($1, 'email_verify', $2, now() + interval '24 hours')`,
      [userId, tokenHash]
    );

    await sendEmailVerification(email, token);

    return reply.code(201).send({ message: 'Registered. Please verify your email.' });
  });

  // GET /api/auth/verify-email
  fastify.get('/verify-email', async (req, reply) => {
    const { token } = req.query;
    if (!token) return reply.code(400).send({ error: 'Token required' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const res = await query(
      `SELECT t.id, t.user_id, t.expires_at, t.used_at
       FROM tokens t WHERE t.token_hash = $1 AND t.type = 'email_verify'`,
      [tokenHash]
    );
    if (!res.rows.length) return reply.code(400).send({ error: 'Invalid token' });

    const row = res.rows[0];
    if (row.used_at) return reply.code(400).send({ error: 'Token already used' });
    if (new Date(row.expires_at) < new Date()) return reply.code(400).send({ error: 'Token expired' });

    await query(`UPDATE users SET email_verified = true WHERE id = $1`, [row.user_id]);
    await query(`UPDATE tokens SET used_at = now() WHERE id = $1`, [row.id]);

    return { message: 'Email verified successfully' };
  });

  // POST /api/auth/login
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const { email, password } = req.body;

    const res = await query(
      `SELECT u.*, t.company_name, t.plan, t.status as tenant_status
       FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );
    if (!res.rows.length) return reply.code(401).send({ error: 'Invalid credentials' });

    const user = res.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' });
    if (!user.email_verified) return reply.code(403).send({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' });
    if (user.status !== 'active') return reply.code(403).send({ error: 'Account suspended' });

    const accessToken = fastify.jwt.sign(
      { sub: user.id, role: user.role, tenantId: user.tenant_id, emailVerified: true },
      { expiresIn: '15m' }
    );
    const refreshToken = nanoid(64);
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await query(
      `INSERT INTO tokens (user_id, type, token_hash, expires_at)
       VALUES ($1, 'refresh', $2, now() + interval '30 days')`,
      [user.id, refreshHash]
    );

    await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        companyName: user.company_name,
        plan: user.plan,
      },
    };
  });

  // POST /api/auth/refresh
  fastify.post('/refresh', async (req, reply) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return reply.code(400).send({ error: 'Refresh token required' });

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const res = await query(
      `SELECT t.id, t.user_id, t.expires_at, t.used_at
       FROM tokens t WHERE t.token_hash = $1 AND t.type = 'refresh'`,
      [tokenHash]
    );
    if (!res.rows.length || res.rows[0].used_at || new Date(res.rows[0].expires_at) < new Date()) {
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }

    const { user_id } = res.rows[0];
    await query(`UPDATE tokens SET used_at = now() WHERE id = $1`, [res.rows[0].id]);

    const userRes = await query(
      `SELECT u.*, t.plan FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.id = $1`,
      [user_id]
    );
    const user = userRes.rows[0];

    const accessToken = fastify.jwt.sign(
      { sub: user.id, role: user.role, tenantId: user.tenant_id, emailVerified: user.email_verified },
      { expiresIn: '15m' }
    );
    const newRefreshToken = nanoid(64);
    const newRefreshHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await query(
      `INSERT INTO tokens (user_id, type, token_hash, expires_at)
       VALUES ($1, 'refresh', $2, now() + interval '30 days')`,
      [user_id, newRefreshHash]
    );

    return { accessToken, refreshToken: newRefreshToken };
  });

  // POST /api/auth/forgot-password
  fastify.post('/forgot-password', async (req, reply) => {
    const { email } = req.body || {};
    if (!email) return reply.code(400).send({ error: 'Email required' });

    const res = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    // Always respond 200 to prevent email enumeration
    if (!res.rows.length) return { message: 'If this email exists, a reset link has been sent.' };

    const token = nanoid(64);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await query(
      `INSERT INTO tokens (user_id, type, token_hash, expires_at)
       VALUES ($1, 'password_reset', $2, now() + interval '1 hour')`,
      [res.rows[0].id, tokenHash]
    );
    await sendPasswordReset(email, token);
    return { message: 'If this email exists, a reset link has been sent.' };
  });

  // POST /api/auth/reset-password
  fastify.post('/reset-password', async (req, reply) => {
    const { token, password } = req.body || {};
    if (!token || !password) return reply.code(400).send({ error: 'Token and password required' });
    if (password.length < 8) return reply.code(400).send({ error: 'Password too short' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const res = await query(
      `SELECT id, user_id, expires_at, used_at FROM tokens WHERE token_hash = $1 AND type = 'password_reset'`,
      [tokenHash]
    );
    if (!res.rows.length || res.rows[0].used_at || new Date(res.rows[0].expires_at) < new Date()) {
      return reply.code(400).send({ error: 'Invalid or expired token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, res.rows[0].user_id]);
    await query(`UPDATE tokens SET used_at = now() WHERE id = $1`, [res.rows[0].id]);
    return { message: 'Password updated' };
  });
}
