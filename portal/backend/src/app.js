import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import { redis } from './config/redis.js';
import { pool, testConnection } from './config/db.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { databasesRoutes } from './modules/databases/databases.routes.js';
import { backupsRoutes } from './modules/backups/backups.routes.js';
import { tariffsRoutes } from './modules/tariffs/tariffs.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { users1cRoutes } from './modules/users1c/users1c.routes.js';
import { profileRoutes } from './modules/profile/profile.routes.js';
import { logger } from './utils/logger.js';

const app = Fastify({ logger: false });

// CORS
await app.register(fastifyCors, {
  origin: [process.env.FRONTEND_URL, 'http://localhost:5173'],
  credentials: true,
});

// Cookie
await app.register(fastifyCookie);

// JWT
await app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET,
  cookie: { cookieName: 'refresh_token', signed: false },
});

// Rate limit
await app.register(fastifyRateLimit, {
  global: true,
  max: 200,
  timeWindow: '1 minute',
  redis,
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
});

// Routes
const API_PREFIX = '/api/v1';
await app.register(authRoutes,      { prefix: `${API_PREFIX}/auth` });
await app.register(databasesRoutes, { prefix: `${API_PREFIX}/databases` });
await app.register(backupsRoutes,   { prefix: `${API_PREFIX}/databases` });
await app.register(users1cRoutes,   { prefix: `${API_PREFIX}/databases` });
await app.register(tariffsRoutes,   { prefix: `${API_PREFIX}/tariffs` });
await app.register(adminRoutes,     { prefix: `${API_PREFIX}/admin` });
await app.register(profileRoutes,   { prefix: `${API_PREFIX}/profile` });

// Health
app.get('/health', async () => ({ status: 'ok', ts: Date.now() }));

// Start
const start = async () => {
  await testConnection();
  await app.listen({ port: 3001, host: '0.0.0.0' });
  logger.info('Portal API listening on :3001');
};

start().catch((err) => {
  logger.error(err);
  process.exit(1);
});
