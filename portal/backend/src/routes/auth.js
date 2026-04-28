'use strict';
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db     = require('../db');
const mailer = require('../services/mailer');

module.exports = async (app) => {

  // POST /api/auth/register
  app.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 8, maxLength: 128 },
          org_name: { type: 'string', maxLength: 256 },
          phone:    { type: 'string', maxLength: 32 },
        },
      },
    },
  }, async (req, reply) => {
    const { email, password, org_name, phone } = req.body;

    const exists = await db.query(
      'SELECT id FROM tenants WHERE email = $1', [email.toLowerCase()]
    );
    if (exists.rows.length)
      return reply.code(409).send({ error: 'Email уже зарегистрирован' });

    const hash    = await bcrypt.hash(password, 12);
    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 86_400_000); // 24h

    await db.query(
      `INSERT INTO tenants
         (email, password_hash, org_name, phone, verify_token, verify_expires)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [email.toLowerCase(), hash, org_name || null, phone || null, token, expires]
    );

    await mailer.sendVerify(email, token).catch(e =>
      app.log.error('mailer sendVerify:', e.message)
    );

    return reply.code(201).send({
      ok: true,
      message: 'Проверьте почту для подтверждения аккаунта',
    });
  });

  // GET /api/auth/verify?token=
  app.get('/verify', async (req, reply) => {
    const { token } = req.query;
    if (!token) return reply.code(400).send({ error: 'Токен не указан' });

    const { rows } = await db.query(
      `UPDATE tenants
       SET email_verified = TRUE, verify_token = NULL, verify_expires = NULL
       WHERE verify_token = $1 AND verify_expires > NOW()
       RETURNING id`,
      [token]
    );
    if (!rows.length)
      return reply.code(400).send({ error: 'Ссылка недействительна или истекла' });

    return { ok: true, message: 'Email подтверждён' };
  });

  // POST /api/auth/login
  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const { email, password } = req.body;

    const { rows } = await db.query(
      'SELECT * FROM tenants WHERE email = $1', [email.toLowerCase()]
    );
    const tenant = rows[0];

    if (!tenant)
      return reply.code(401).send({ error: 'Неверный email или пароль' });
    if (!tenant.email_verified)
      return reply.code(403).send({ error: 'Сначала подтвердите email' });
    if (!tenant.is_active)
      return reply.code(403).send({ error: 'Аккаунт заблокирован' });

    const valid = await bcrypt.compare(password, tenant.password_hash);
    if (!valid)
      return reply.code(401).send({ error: 'Неверный email или пароль' });

    // JWT payload — use id (not sub) everywhere
    const accessToken = app.jwt.sign(
      { id: tenant.id, email: tenant.email, role: tenant.role },
      { expiresIn: '7d' }
    );

    await db.query(
      `INSERT INTO audit_log (tenant_id, action, ip) VALUES ($1, $2, $3)`,
      [tenant.id, 'login', req.ip]
    );

    return { ok: true, token: accessToken, role: tenant.role };
  });

  // POST /api/auth/forgot-password
  app.post('/forgot-password', async (req) => {
    const { email } = req.body || {};
    const { rows } = await db.query(
      'SELECT id FROM tenants WHERE email = $1', [email?.toLowerCase()]
    );
    if (rows.length) {
      const token   = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3_600_000); // 1h
      await db.query(
        'UPDATE tenants SET reset_token = $1, reset_expires = $2 WHERE id = $3',
        [token, expires, rows[0].id]
      );
      await mailer.sendPasswordReset(email, token).catch(() => {});
    }
    // Always return ok to prevent email enumeration
    return { ok: true, message: 'Если аккаунт существует, письмо отправлено' };
  });

  // POST /api/auth/reset-password
  app.post('/reset-password', async (req, reply) => {
    const { token, password } = req.body || {};
    if (!token || !password || password.length < 8)
      return reply.code(400).send({ error: 'Неверные данные' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `UPDATE tenants
       SET password_hash = $1, reset_token = NULL, reset_expires = NULL
       WHERE reset_token = $2 AND reset_expires > NOW()
       RETURNING id`,
      [hash, token]
    );
    if (!rows.length)
      return reply.code(400).send({ error: 'Ссылка недействительна или истекла' });

    return { ok: true, message: 'Пароль изменён' };
  });

  // GET /api/auth/me
  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await db.query(
      `SELECT
         t.id, t.email, t.org_name, t.phone, t.role,
         t.is_active, t.email_verified, t.created_at,
         tr.code  AS tariff_code,
         tr.name  AS tariff_name,
         tr.max_bases,
         tr.max_users,
         tr.max_disk_gb
       FROM tenants t
       LEFT JOIN tariffs tr ON tr.id = t.tariff_id
       WHERE t.id = $1`,
      [req.user.id]
    );
    return rows[0] || {};
  });
};
