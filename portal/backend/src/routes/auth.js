'use strict';

const bcrypt  = require('bcrypt');
const crypto  = require('crypto');

module.exports = async function authRoutes(app) {

  // POST /api/auth/register
  app.post('/register', async (req, reply) => {
    const { email, password, full_name, company_name } = req.body || {};
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }
    if (password.length < 8) {
      return reply.code(400).send({ error: 'Password must be at least 8 characters' });
    }

    const hash         = await bcrypt.hash(password, 12);
    const verifyToken  = crypto.randomBytes(32).toString('hex');
    const slug         = email.split('@')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase()
                         + '-' + crypto.randomBytes(3).toString('hex');

    try {
      // Создаём tenant
      const { rows: [tenant] } = await app.db.query(
        `INSERT INTO tenants (company_name, slug, plan, status, max_databases, max_users_per_db, max_storage_gb)
         VALUES ($1, $2, 'starter', 'active', 3, 5, 10)
         RETURNING id`,
        [company_name || email.split('@')[0], slug]
      );

      // Создаём пользователя
      const { rows: [user] } = await app.db.query(
        `INSERT INTO users
           (tenant_id, email, password_hash, full_name, role, email_verified, status, email_verify_token)
         VALUES ($1, $2, $3, $4, 'client', false, 'active', $5)
         RETURNING id, email`,
        [tenant.id, email.toLowerCase(), hash, full_name || '', verifyToken]
      );

      // Отправка письма подтверждения (если mail-сервис настроен)
      if (app.mailer) {
        await app.mailer.sendVerification(user.email, verifyToken).catch((e) =>
          app.log.warn(e, 'Failed to send verification email')
        );
      }

      return reply.code(201).send({
        message: 'Registration successful. Please verify your email.',
      });
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(409).send({ error: 'Email already registered' });
      }
      throw err;
    }
  });

  // GET /api/auth/verify-email?token=xxx
  app.get('/verify-email', async (req, reply) => {
    const { token } = req.query || {};
    if (!token) return reply.code(400).send({ error: 'Token is required' });

    const { rows } = await app.db.query(
      `UPDATE users SET email_verified = true, email_verify_token = NULL
       WHERE email_verify_token = $1
       RETURNING id`,
      [token]
    );
    if (!rows[0]) return reply.code(400).send({ error: 'Invalid or expired token' });
    return { message: 'Email verified. You can now log in.' };
  });

  // POST /api/auth/login
  app.post('/login', async (req, reply) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    const { rows } = await app.db.query(
      `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.status,
              u.email_verified, u.tenant_id,
              t.company_name, t.plan, t.status AS tenant_status
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }
    if (!user.email_verified) {
      return reply.code(403).send({ error: 'Please verify your email before logging in' });
    }
    if (user.status !== 'active') {
      return reply.code(403).send({ error: 'Account is suspended. Contact support.' });
    }
    if (user.tenant_status !== 'active') {
      return reply.code(403).send({ error: 'Account is suspended. Contact support.' });
    }

    const token = app.jwt.sign({
      id:       user.id,
      tenantId: user.tenant_id,
      role:     user.role,
    });

    return reply.send({
      token,
      user: {
        id:           user.id,
        email:        user.email,
        full_name:    user.full_name,
        role:         user.role,
        tenant_id:    user.tenant_id,
        company_name: user.company_name,
        plan:         user.plan,
      },
    });
  });

  // GET /api/auth/me  — данные текущего пользователя (требует JWT)
  app.get('/me', {
    preHandler: [require('../middleware/auth').authMiddleware],
  }, async (req, reply) => {
    return { user: req.user };
  });

  // POST /api/auth/logout
  app.post('/logout', async (req, reply) => {
    // Стателесс JWT — клиент просто удаляет токен локально
    return { message: 'Logged out' };
  });

  // POST /api/auth/forgot-password
  app.post('/forgot-password', async (req, reply) => {
    const { email } = req.body || {};
    if (!email) return reply.code(400).send({ error: 'Email is required' });

    const resetToken   = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3_600_000); // 1 час

    await app.db.query(
      `UPDATE users
       SET reset_password_token = $1, reset_password_expires = $2
       WHERE email = $3`,
      [resetToken, resetExpires, email.toLowerCase()]
    );

    if (app.mailer) {
      await app.mailer.sendPasswordReset(email, resetToken).catch((e) =>
        app.log.warn(e, 'Failed to send password reset email')
      );
    }

    // Не раскрываем существует ли аккаунт
    return { message: 'If this email is registered, a reset link has been sent.' };
  });

  // POST /api/auth/reset-password
  app.post('/reset-password', async (req, reply) => {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return reply.code(400).send({ error: 'Token and password are required' });
    }
    if (password.length < 8) {
      return reply.code(400).send({ error: 'Password must be at least 8 characters' });
    }

    const { rows } = await app.db.query(
      `SELECT id FROM users
       WHERE reset_password_token = $1 AND reset_password_expires > NOW()`,
      [token]
    );
    if (!rows[0]) return reply.code(400).send({ error: 'Invalid or expired reset token' });

    const hash = await bcrypt.hash(password, 12);
    await app.db.query(
      `UPDATE users
       SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL
       WHERE id = $2`,
      [hash, rows[0].id]
    );
    return { message: 'Password updated. You can now log in.' };
  });
};
