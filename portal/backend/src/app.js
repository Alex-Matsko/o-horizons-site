'use strict';

const Fastify = require('fastify');
const { Pool } = require('pg');

const authRoutes     = require('./routes/auth');
const databaseRoutes = require('./routes/databases');
const backupRoutes   = require('./routes/backups');
const adminRoutes    = require('./routes/admin');
const usersRoutes    = require('./routes/users');
const tariffsRoutes  = require('./routes/tariffs');

async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      // Красивый вывод в dev, JSON в production
      ...(process.env.NODE_ENV !== 'production'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : {}),
    },
    trustProxy: true,
  });

  // ── PostgreSQL pool ─────────────────────────────────
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  // Проверяем подключение при старте
  db.query('SELECT 1').catch((err) => {
    app.log.error(err, 'Failed to connect to portal database on startup');
    process.exit(1);
  });
  app.decorate('db', db);

  // ── CORS ───────────────────────────────────
  await app.register(require('@fastify/cors'), {
    origin: [
      process.env.PORTAL_URL || 'https://1c.o-horizons.com',
      // Разрешаем localhost в режиме dev
      ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://localhost:3000'] : []),
    ],
    credentials: true,
  });

  // ── Cookie support ──────────────────────────
  await app.register(require('@fastify/cookie'));

  // ── JWT ──────────────────────────────────
  await app.register(require('@fastify/jwt'), {
    secret: process.env.JWT_SECRET,
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  });

  // ── Rate limiting ─────────────────────────
  await app.register(require('@fastify/rate-limit'), {
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  });

  // ── Routes ───────────────────────────────
  app.register(authRoutes,     { prefix: '/api/auth' });
  app.register(usersRoutes,    { prefix: '/api/users' });
  app.register(databaseRoutes, { prefix: '/api/databases' });
  app.register(backupRoutes,   { prefix: '/api/databases' });
  app.register(adminRoutes,    { prefix: '/api/admin' });
  app.register(tariffsRoutes,  { prefix: '/api/tariffs' });

  // ── Health check ─────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    ts: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  // ── Global error handler ───────────────────
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.code(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : error.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
    });
  });

  return app;
}

module.exports = buildApp;

if (require.main === module) {
  buildApp().then((app) => {
    const port = Number(process.env.PORTAL_PORT) || 3001;
    app.listen({ port, host: '0.0.0.0' }, (err) => {
      if (err) { app.log.error(err); process.exit(1); }
      app.log.info(`Portal backend listening on port ${port}`);
    });
  });
}
