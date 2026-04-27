'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { mailService } = require('../services/mail.service');

module.exports = async function authRoutes(app) {
  // Регистрация
  app.post('/register', async (req, reply) => {
    const { email, password, full_name, company_name } = req.body;
    if (!email || !password) return reply.code(400).send({ error: 'Email and password required' });

    const hash = await bcrypt.hash(password, 12);
    const token = crypto.randomBytes(32).toString('hex');

    try {
      const { rows } = await app.db.query(
        `INSERT INTO tenants (email, password_hash, full_name, company_name, email_verify_token,
          plan_id)
         VALUES ($1,$2,$3,$4,$5, (SELECT id FROM plans WHERE name='Starter' LIMIT 1))
         RETURNING id, email`,
        [email.toLowerCase(), hash, full_name, company_name, token]
      );
      await mailService.sendVerification(email, token);
      return reply.code(201).send({ message: 'Registration successful. Check your email.' });
    } catch (err) {
      if (err.code === '23505') return reply.code(409).send({ error: 'Email already registered' });
      throw err;
    }
  });

  // Подтверждение email
  app.get('/verify-email', async (req, reply) => {
    const { token } = req.query;
    const { rows } = await app.db.query(
      `UPDATE tenants SET email_verified=TRUE, email_verify_token=NULL
       WHERE email_verify_token=$1 RETURNING id`,
      [token]
    );
    if (!rows[0]) return reply.code(400).send({ error: 'Invalid token' });
    return { message: 'Email verified. You can now log in.' };
  });

  // Вход
  app.post('/login', async (req, reply) => {
    const { email, password } = req.body;
    const { rows } = await app.db.query(
      'SELECT * FROM tenants WHERE email=$1',
      [email.toLowerCase()]
    );
    const tenant = rows[0];
    if (!tenant || !await bcrypt.compare(password, tenant.password_hash)) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    if (!tenant.email_verified) return reply.code(403).send({ error: 'Email not verified' });
    if (!tenant.is_active) return reply.code(403).send({ error: 'Account is disabled' });

    const accessToken  = app.jwt.sign({ sub: tenant.id, admin: tenant.is_admin }, { expiresIn: '15m' });
    const refreshToken = app.jwt.sign({ sub: tenant.id, type: 'refresh' }, { expiresIn: '30d' });

    await app.db.query('UPDATE tenants SET refresh_token=$1 WHERE id=$2', [refreshToken, tenant.id]);

    return reply.send({ accessToken, refreshToken, is_admin: tenant.is_admin });
  });

  // Обновление токена
  app.post('/refresh', async (req, reply) => {
    const { refreshToken } = req.body;
    try {
      const payload = app.jwt.verify(refreshToken);
      const { rows } = await app.db.query(
        'SELECT id, is_active FROM tenants WHERE id=$1 AND refresh_token=$2',
        [payload.sub, refreshToken]
      );
      if (!rows[0] || !rows[0].is_active) return reply.code(401).send({ error: 'Invalid token' });
      const accessToken = app.jwt.sign({ sub: payload.sub }, { expiresIn: '15m' });
      return { accessToken };
    } catch {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  });

  // Выход
  app.post('/logout', async (req, reply) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await app.db.query('UPDATE tenants SET refresh_token=NULL WHERE refresh_token=$1', [refreshToken]);
    }
    return { message: 'Logged out' };
  });

  // Запрос сброса пароля
  app.post('/forgot-password', async (req, reply) => {
    const { email } = req.body;
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 час
    await app.db.query(
      'UPDATE tenants SET reset_password_token=$1, reset_password_expires=$2 WHERE email=$3',
      [token, expires, email.toLowerCase()]
    );
    await mailService.sendPasswordReset(email, token);
    return { message: 'If this email exists, a reset link has been sent.' };
  });

  // Сброс пароля
  app.post('/reset-password', async (req, reply) => {
    const { token, password } = req.body;
    const { rows } = await app.db.query(
      'SELECT id FROM tenants WHERE reset_password_token=$1 AND reset_password_expires > NOW()',
      [token]
    );
    if (!rows[0]) return reply.code(400).send({ error: 'Invalid or expired token' });
    const hash = await bcrypt.hash(password, 12);
    await app.db.query(
      'UPDATE tenants SET password_hash=$1, reset_password_token=NULL, reset_password_expires=NULL WHERE id=$2',
      [hash, rows[0].id]
    );
    return { message: 'Password updated. You can now log in.' };
  });
};
