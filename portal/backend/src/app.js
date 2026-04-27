'use strict';

const Fastify = require('fastify');
const { Pool } = require('pg');

const authRoutes = require('./routes/auth');
const databaseRoutes = require('./routes/databases');
const backupRoutes = require('./routes/backups');
const adminRoutes = require('./routes/admin');

async function buildApp() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL || 'info' },
    trustProxy: true,
  });

  // PostgreSQL pool
  const db = new Pool({ connectionString: process.env.DATABASE_URL });
  app.decorate('db', db);

  // CORS
  await app.register(require('@fastify/cors'), {
    origin: process.env.FRONTEND_URL || 'https://1c.o-horizons.com',
    credentials: true,
  });

  // Cookie support
  await app.register(require('@fastify/cookie'));

  // JWT
  await app.register(require('@fastify/jwt'), {
    secret: process.env.JWT_SECRET,
    sign: { expiresIn: '15m' },
  });

  // Rate limiting
  await app.register(require('@fastify/rate-limit'), {
    max: 100,
    timeWindow: '1 minute',
  });

  // Routes
  app.register(authRoutes,     { prefix: '/api/auth' });
  app.register(databaseRoutes, { prefix: '/api/databases' });
  app.register(backupRoutes,   { prefix: '/api/databases' });
  app.register(adminRoutes,    { prefix: '/api/admin' });

  // Health check
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  return app;
}

module.exports = buildApp;

if (require.main === module) {
  buildApp().then(app => {
    app.listen({ port: Number(process.env.PORT) || 3010, host: '0.0.0.0' }, (err) => {
      if (err) { app.log.error(err); process.exit(1); }
    });
  });
}
