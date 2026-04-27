import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { query } from '../config/db.js';
import { config } from '../config/index.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/mailer.js';

const BCRYPT_ROUNDS = 12;

export async function authRoutes(app) {
  // POST /api/auth/register
  app.post('/register', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (req, reply) => {
    const { email, password, org_name, phone } = req.body;
    if (!email || !password) return reply.code(400).send({ error: 'Email and password are required' });
    if (password.length < 8) return reply.code(400).send({ error: 'Password must be at least 8 characters' });

    const existing = await query('SELECT id FROM tenants WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) return reply.code(409).send({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const verifyToken = nanoid(32);
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { rows } = await query(
      `INSERT INTO tenants (email, password_hash, org_name, phone, verify_token, verify_expires, tariff_id)
       VALUES ($1, $2, $3, $4, $5, $6, 1) RETURNING id, email, role`,
      [email.toLowerCase(), passwordHash, org_name, phone, verifyToken, verifyExpires]
    );

    await sendVerificationEmail(email, verifyToken).catch(console.error);
    return reply.code(201).send({ message: 'Registration successful. Please check your email to verify your account.' });
  });

  // GET /api/auth/verify/:token
  app.get('/verify/:token', async (req, reply) => {
    const { token } = req.params;
    const { rows } = await query(
      `UPDATE tenants SET email_verified = true, verify_token = NULL, verify_expires = NULL
       WHERE verify_token = $1 AND verify_expires > NOW() AND email_verified = false
       RETURNING id`,
      [token]
    );
    if (!rows.length) return reply.code(400).send({ error: 'Invalid or expired token' });
    return reply.redirect(`${config.appUrl}/?verified=1`);
  });

  // POST /api/auth/login
  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
  }, async (req, reply) => {
    const { email, password } = req.body;
    const { rows } = await query(
      'SELECT id, email, password_hash, role, email_verified, is_active FROM tenants WHERE email = $1',
      [email?.toLowerCase()]
    );
    const tenant = rows[0];
    if (!tenant) return reply.code(401).send({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, tenant.password_hash);
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' });
    if (!tenant.email_verified) return reply.code(403).send({ error: 'Please verify your email first' });
    if (!tenant.is_active) return reply.code(403).send({ error: 'Account is disabled. Contact support.' });

    const accessToken = app.jwt.sign(
      { sub: tenant.id, role: tenant.role },
      { expiresIn: config.jwt.accessTtl }
    );
    const refreshToken = nanoid(64);
    const rtHash = await bcrypt.hash(refreshToken, 8);
    await query(
      `INSERT INTO refresh_tokens (tenant_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [tenant.id, rtHash]
    );

    reply.setCookie('access_token', accessToken, {
      httpOnly: true, secure: true, sameSite: 'Strict', path: '/', maxAge: 900,
    });
    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true, secure: true, sameSite: 'Strict', path: '/api/auth', maxAge: 60 * 60 * 24 * 30,
    });
    return { access_token: accessToken, role: tenant.role };
  });

  // POST /api/auth/refresh
  app.post('/refresh', async (req, reply) => {
    const rt = req.cookies?.refresh_token;
    if (!rt) return reply.code(401).send({ error: 'No refresh token' });
    const { rows } = await query(
      `SELECT rt.id, rt.tenant_id, rt.token_hash, t.role, t.is_active
       FROM refresh_tokens rt
       JOIN tenants t ON t.id = rt.tenant_id
       WHERE rt.expires_at > NOW()
       ORDER BY rt.created_at DESC LIMIT 50`,
      []
    );
    let matched = null;
    for (const row of rows) {
      if (await bcrypt.compare(rt, row.token_hash)) { matched = row; break; }
    }
    if (!matched) return reply.code(401).send({ error: 'Invalid refresh token' });
    if (!matched.is_active) return reply.code(403).send({ error: 'Account disabled' });

    const accessToken = app.jwt.sign(
      { sub: matched.tenant_id, role: matched.role },
      { expiresIn: config.jwt.accessTtl }
    );
    reply.setCookie('access_token', accessToken, {
      httpOnly: true, secure: true, sameSite: 'Strict', path: '/', maxAge: 900,
    });
    return { access_token: accessToken };
  });

  // POST /api/auth/logout
  app.post('/logout', async (req, reply) => {
    reply.clearCookie('access_token', { path: '/' });
    reply.clearCookie('refresh_token', { path: '/api/auth' });
    return { message: 'Logged out' };
  });

  // GET /api/auth/me
  app.get('/me', { preHandler: [async (req, rep) => { await req.jwtVerify().catch(() => rep.code(401).send({ error: 'Unauthorized' })); }] }, async (req) => {
    const { rows } = await query(
      `SELECT t.id, t.email, t.org_name, t.phone, t.role, t.email_verified,
              t.created_at, tf.code AS tariff_code, tf.name AS tariff_name,
              tf.max_bases, tf.max_users, tf.max_disk_gb
       FROM tenants t
       LEFT JOIN tariffs tf ON tf.id = t.tariff_id
       WHERE t.id = $1`,
      [req.user.sub]
    );
    return rows[0];
  });
}
