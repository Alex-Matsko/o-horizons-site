require('dotenv').config();
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const jwt = require('@fastify/jwt');
const cookie = require('@fastify/cookie');
const rateLimit = require('@fastify/rate-limit');

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } });

// Plugins
app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['https://1c.o-horizons.com'],
  credentials: true,
});
app.register(cookie);
app.register(jwt, { secret: process.env.JWT_SECRET });
app.register(rateLimit, {
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  skipOnError: true,
  keyGenerator: (req) => req.ip,
  skip: (req) => req.url === '/health',
});

// Decorators
app.decorate('authenticate', async (req, reply) => {
  try { await req.jwtVerify(); }
  catch { reply.code(401).send({ error: 'Unauthorized' }); }
});
app.decorate('adminOnly', async (req, reply) => {
  try {
    await req.jwtVerify();
    if (req.user.role !== 'admin') reply.code(403).send({ error: 'Forbidden' });
  } catch { reply.code(401).send({ error: 'Unauthorized' }); }
});

// Routes
app.register(require('./routes/auth'),      { prefix: '/api/auth' });
app.register(require('./routes/databases'), { prefix: '/api/databases' });
app.register(require('./routes/backups'),   { prefix: '/api/backups' });
app.register(require('./routes/users1c'),   { prefix: '/api/users1c' });
app.register(require('./routes/tariffs'),   { prefix: '/api/tariffs' });
app.register(require('./routes/admin'),     { prefix: '/api/admin' });
app.register(require('./routes/profile'),   { prefix: '/api/profile' });

// Health — no rate limit, no auth
app.get('/health', { config: { rateLimit: false } }, async () => ({ ok: true, ts: new Date().toISOString() }));

const start = async () => {
  try {
    await require('./db').connect();
    await app.listen({ port: process.env.PORT || 3001, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
