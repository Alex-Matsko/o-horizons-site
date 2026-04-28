const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../db');
const mailer = require('../services/mailer');

module.exports = async (app) => {
  // POST /api/auth/register
  app.post('/register', {
    schema: {
      body: {
        type: 'object', required: ['email','password'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 8, maxLength: 128 },
          company_name: { type: 'string', maxLength: 128 },
          phone: { type: 'string', maxLength: 32 },
        },
      },
    },
  }, async (req, reply) => {
    const { email, password, company_name, phone } = req.body;
    const exists = await db.query('SELECT id FROM tenants WHERE email=$1', [email.toLowerCase()]);
    if (exists.rows.length) return reply.code(409).send({ error: 'Email уже зарегистрирован' });

    const hash = await bcrypt.hash(password, 12);
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 86400000);

    const { rows } = await db.query(
      `INSERT INTO tenants (email,password_hash,company_name,phone,verify_token,verify_token_expires)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [email.toLowerCase(), hash, company_name || null, phone || null, token, expires]
    );

    await mailer.sendVerify(email, token).catch(e => app.log.error('mailer:', e.message));
    return reply.code(201).send({ ok: true, message: 'Проверьте почту для подтверждения аккаунта' });
  });

  // GET /api/auth/verify?token=
  app.get('/verify', async (req, reply) => {
    const { token } = req.query;
    if (!token) return reply.code(400).send({ error: 'Токен не указан' });
    const { rows } = await db.query(
      `UPDATE tenants SET email_verified=TRUE, verify_token=NULL, verify_token_expires=NULL
       WHERE verify_token=$1 AND verify_token_expires > NOW() RETURNING id`,
      [token]
    );
    if (!rows.length) return reply.code(400).send({ error: 'Ссылка недействительна или истекла' });
    return { ok: true, message: 'Email подтверждён' };
  });

  // POST /api/auth/login
  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object', required: ['email','password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const { email, password } = req.body;
    const { rows } = await db.query('SELECT * FROM tenants WHERE email=$1', [email.toLowerCase()]);
    const tenant = rows[0];
    if (!tenant) return reply.code(401).send({ error: 'Неверный email или пароль' });
    if (!tenant.email_verified) return reply.code(403).send({ error: 'Сначала подтвердите email' });
    if (!tenant.is_active) return reply.code(403).send({ error: 'Аккаунт заблокирован' });

    const valid = await bcrypt.compare(password, tenant.password_hash);
    if (!valid) return reply.code(401).send({ error: 'Неверный email или пароль' });

    const token = app.jwt.sign(
      { sub: tenant.id, email: tenant.email, role: tenant.role, company: tenant.company_name },
      { expiresIn: '7d' }
    );
    await db.query('INSERT INTO audit_log(tenant_id,action,ip) VALUES($1,$2,$3)',
      [tenant.id, 'login', req.ip]);
    return { ok: true, token, role: tenant.role };
  });

  // POST /api/auth/forgot-password
  app.post('/forgot-password', async (req, reply) => {
    const { email } = req.body;
    const { rows } = await db.query('SELECT id FROM tenants WHERE email=$1', [email?.toLowerCase()]);
    // Always return ok to avoid enumeration
    if (rows.length) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600000);
      await db.query('UPDATE tenants SET reset_token=$1, reset_token_expires=$2 WHERE id=$3',
        [token, expires, rows[0].id]);
      await mailer.sendPasswordReset(email, token).catch(() => {});
    }
    return { ok: true, message: 'Если аккаунт существует, письмо отправлено' };
  });

  // POST /api/auth/reset-password
  app.post('/reset-password', async (req, reply) => {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8)
      return reply.code(400).send({ error: 'Неверные данные' });
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `UPDATE tenants SET password_hash=$1, reset_token=NULL, reset_token_expires=NULL
       WHERE reset_token=$2 AND reset_token_expires > NOW() RETURNING id`,
      [hash, token]
    );
    if (!rows.length) return reply.code(400).send({ error: 'Ссылка недействительна или истекла' });
    return { ok: true, message: 'Пароль изменён' };
  });

  // GET /api/auth/me
  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    const { rows } = await db.query(
      `SELECT t.id,t.email,t.company_name,t.phone,t.telegram,t.role,t.is_active,t.created_at,
              t.email_verified, tr.slug AS tariff_slug, tr.name AS tariff_name,
              tr.max_databases, tr.max_users, tr.max_storage_gb
       FROM tenants t LEFT JOIN tariffs tr ON tr.id=t.tariff_id WHERE t.id=$1`,
      [req.user.sub]
    );
    return rows[0] || {};
  });
};
