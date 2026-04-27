import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/index.js';
import { redis } from './config/redis.js';
import { pool } from './config/db.js';
import { authRoutes } from './routes/auth.js';
import { databaseRoutes } from './routes/databases.js';
import { adminRoutes } from './routes/admin.js';
import { backupRoutes } from './routes/backups.js';
import { usersRoutes } from './routes/users.js';
import { tariffRoutes } from './routes/tariffs.js';

const app = Fastify({
  logger: {
    level: config.env === 'production' ? 'warn' : 'info',
    transport: config.env !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
  trustProxy: true,
});

await app.register(rateLimit, {
  redis,
  global: true,
  max: 200,
  timeWindow: '1 minute',
});

await app.register(cors, {
  origin: [config.appUrl, 'https://1c.o-horizons.com'],
  credentials: true,
});

await app.register(cookie);

await app.register(jwt, {
  secret: config.jwt.secret,
  cookie: { cookieName: 'access_token', signed: false },
});

// Health
app.get('/api/health', async () => ({ status: 'ok', ts: Date.now() }));

// Routes
app.register(authRoutes,     { prefix: '/api/auth' });
app.register(databaseRoutes, { prefix: '/api/databases' });
app.register(adminRoutes,    { prefix: '/api/admin' });
app.register(backupRoutes,   { prefix: '/api/backups' });
app.register(usersRoutes,    { prefix: '/api/users' });
app.register(tariffRoutes,   { prefix: '/api/tariffs' });

// 404
app.setNotFoundHandler((req, reply) => {
  reply.code(404).send({ error: 'Not found' });
});

// Errors
app.setErrorHandler((err, req, reply) => {
  app.log.error(err);
  const code = err.statusCode || 500;
  reply.code(code).send({ error: err.message || 'Internal server error' });
});

try {
  await pool.query('SELECT 1');
  app.log.info('[DB] Connected');
} catch (e) {
  app.log.error('[DB] Connection failed:', e.message);
  process.exit(1);
}

await app.listen({ port: config.port, host: '0.0.0.0' });
app.log.info(`Portal API listening on port ${config.port}`);
